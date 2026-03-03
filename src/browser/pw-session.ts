import type { Browser, Page } from "playwright-core";
import { connectOverCDP } from "playwright-core";
import { getBrowserCdpAuthHeaders } from "../config/config.js";
import { withBrowserNavigationPolicy } from "../infra/ssrf-policy.browser.js";
import { SsrFPolicy } from "../infra/ssrf-policy.js";
import { assertBrowserNavigationAllowed } from "../security/browser-navigation-allowlist.js";
import { assertBrowserNavigationResultAllowed } from "../security/browser-navigation-result-allowlist.js";
import { appendCdpPath, fetchJson, normalizeCdpWsUrl, withCdpSocket } from "./cdp.helpers.js";
import { normalizeCdpUrl } from "./cdp.js";
import { getHeadersWithAuth } from "./client-fetch.js";

let cached: { browser: Browser; cdpUrl: string; onDisconnected: () => void } | null = null;
let connecting: Promise<{ browser: Browser; cdpUrl: string }> | null = null;

async function connectBrowser(cdpUrl: string): Promise<{ browser: Browser; cdpUrl: string }> {
  const normalized = normalizeCdpUrl(cdpUrl);
  if (cached?.cdpUrl === normalized) {
    return { browser: cached.browser, cdpUrl: normalized };
  }
  if (connecting) {
    return connecting;
  }
  connecting = (async () => {
    try {
      const headers = getBrowserCdpAuthHeaders();
      const browser = await connectOverCDP(normalized, {
        headers,
        // Playwright's default is 30s, but we want to fail fast for unresponsive CDP endpoints.
        // This also aligns with the gateway's default exec timeout.
        timeout: 10_000,
      });
      const onDisconnected = () => {
        if (cached?.browser === browser) {
          cached = null;
        }
      };
      browser.on("disconnected", onDisconnected);
      cached = { browser, cdpUrl: normalized, onDisconnected };
      return { browser, cdpUrl: normalized };
    } finally {
      connecting = null;
    }
  })();
  return connecting;
}

async function getAllPages(browser: Browser): Promise<Page[]> {
  const contexts = browser.contexts();
  if (contexts.length === 0) {
    return [];
  }
  const pages = await Promise.all(contexts.map((ctx) => ctx.pages()));
  return pages.flat();
}

async function findPageByTargetId(
  browser: Browser,
  targetId: string,
  cdpUrl?: string,
): Promise<Page | null> {
  const pages = await getAllPages(browser);
  let resolvedViaCdp = false;
  // First, try the standard CDP session approach
  for (const page of pages) {
    let tid: string | null = null;
    try {
      tid = await pageTargetId(page);
      resolvedViaCdp = true;
    } catch {
      tid = null;
    }
    if (tid && tid === targetId) {
      return page;
    }
  }
  // Extension relays can block CDP attachment APIs entirely. If that happens and
  // Playwright only exposes one page, return it as the best available mapping.
  if (!resolvedViaCdp && pages.length === 1) {
    return pages[0];
  }
  // If CDP sessions fail (e.g., extension relay blocks Target.attachToBrowserTarget),
  // fall back to URL-based matching using the /json/list endpoint
  if (cdpUrl) {
    try {
      const baseUrl = cdpUrl
        .replace(/\/+$/, "")
        .replace(/^ws:/, "http:")
        .replace(/\/cdp$/, "");
      const listUrl = `${baseUrl}/json/list`;
      const response = await fetch(listUrl, { headers: getHeadersWithAuth(listUrl) });
      if (response.ok) {
        const targets = (await response.json()) as Array<{
          id: string;
          url: string;
          title?: string;
        }>;
        const target = targets.find((t) => t.id === targetId);
        if (target) {
          // Try to find a page with matching URL
          const urlMatch = pages.filter((p) => p.url() === target.url);
          if (urlMatch.length === 1) {
            return urlMatch[0];
          }
          // If multiple URL matches, use index-based matching as fallback
          const index = targets.findIndex((t) => t.id === targetId);
          if (index >= 0 && index < pages.length) {
            return pages[index];
          }
        }
      }
    } catch {
      // Best-effort; ignore fetch errors
    }
  }
  return null;
}

export async function getPageForTargetId(opts: {
  cdpUrl: string;
  targetId?: string;
}): Promise<Page> {
  const { browser } = await connectBrowser(opts.cdpUrl);
  const pages = await getAllPages(browser);
  if (!pages.length) {
    throw new Error("No pages available in the connected browser.");
  }
  const first = pages[0];
  if (!opts.targetId) {
    return first;
  }
  const found = await findPageByTargetId(browser, opts.targetId, opts.cdpUrl);
  if (!found) {
    // Extension relays can block CDP attachment APIs (e.g. Target.attachToBrowserTarget),
    // which prevents us from resolving a page's targetId via newCDPSession(). If Playwright
    // only exposes a single Page, use it as a best-effort fallback.
    if (pages.length === 1) {
      return first;
    }

    // For extension relay scenarios, try to recover from "tab not found"
    // by resetting the cached Playwright connection and retrying once.
    // This handles cases where navigation invalidates the cached connection
    // but the CDP target still exists in /json/list.
    const isExtensionRelay = isExtensionRelayCdpUrl(opts.cdpUrl);

    if (isExtensionRelay) {
      const retryResult = await getPageForTargetIdWithRetry({
        cdpUrl: opts.cdpUrl,
        targetId: opts.targetId,
        connectBrowser,
        getAllPages,
        findPageByTargetId,
        forceDisconnectPlaywrightForTarget,
      });
      if (retryResult) {
        return retryResult;
      }
    }

    throw new Error("tab not found");
  }
  return found;
}

// Helper function to detect extension relay CDP URLs
function isExtensionRelayCdpUrl(cdpUrl: string): boolean {
  // Extension relay uses specific local ports (18791, 18792) on localhost/127.0.0.1
  return (
    (cdpUrl.includes("127.0.0.1") || cdpUrl.includes("localhost")) &&
    (cdpUrl.includes(":18791") || cdpUrl.includes(":18792"))
  );
}

// Extracted retry logic as a separate helper for testability
async function getPageForTargetIdWithRetry(opts: {
  cdpUrl: string;
  targetId?: string;
  connectBrowser: (cdpUrl: string) => Promise<{ browser: Browser; cdpUrl: string }>;
  getAllPages: (browser: Browser) => Promise<Page[]>;
  findPageByTargetId: (browser: Browser, targetId: string, cdpUrl?: string) => Promise<Page | null>;
  forceDisconnectPlaywrightForTarget: (opts: {
    cdpUrl: string;
    targetId?: string;
    reason?: string;
  }) => Promise<void>;
}): Promise<Page | null> {
  try {
    // Force disconnect the cached Playwright connection
    await opts.forceDisconnectPlaywrightForTarget({
      cdpUrl: opts.cdpUrl,
      targetId: opts.targetId,
      reason: "recovering from tab not found after navigation",
    });

    // Retry with fresh connection
    const { browser: retryBrowser } = await opts.connectBrowser(opts.cdpUrl);
    const retryPages = await opts.getAllPages(retryBrowser);
    if (retryPages.length > 0) {
      const retryFound = await opts.findPageByTargetId(retryBrowser, opts.targetId, opts.cdpUrl);
      if (retryFound) {
        return retryFound;
      }
      // If still only one page, use it as fallback
      if (retryPages.length === 1) {
        return retryPages[0];
      }
    }
  } catch (retryError) {
    // If retry fails, return null to fall through to original error
    console.warn("Extension relay retry failed:", retryError);
  }
  return null;
}

export function refLocator(page: Page, ref: string) {
  const normalized = ref.startsWith("@")
    ? ref.slice(1)
    : ref.startsWith("ref=")
      ? ref.slice(4)
      : ref;

  if (/^e\d+$/.test(normalized)) {
    const state = pageStates.get(page);
    if (state?.roleRefsMode === "aria") {
      const scope = state.roleRefsFrameSelector
        ? page.frameLocator(state.roleRefsFrameSelector)
        : page;
      return scope.locator(`aria-ref=${normalized}`);
    }
    const info = state?.roleRefs?.[normalized];
    if (!info) {
      throw new Error(
        `Unknown ref "${normalized}". Run a new snapshot and use a ref from that snapshot.`,
      );
    }
    const scope = state?.roleRefsFrameSelector
      ? page.frameLocator(state.roleRefsFrameSelector)
      : page;
    const locAny = scope as unknown as {
      getByRole: (
        role: never,
        opts?: { name?: string; exact?: boolean },
      ) => ReturnType<Page["getByRole"]>;
    };
    const locator = info.name
      ? locAny.getByRole(info.role as never, { name: info.name, exact: true })
      : locAny.getByRole(info.role as never);
    return info.nth !== undefined ? locator.nth(info.nth) : locator;
  }

  return page.locator(`aria-ref=${normalized}`);
}

export async function closePlaywrightBrowserConnection(): Promise<void> {
  const cur = cached;
  cached = null;
  connecting = null;
  if (!cur) {
    return;
  }
  if (cur.onDisconnected && typeof cur.browser.off === "function") {
    cur.browser.off("disconnected", cur.onDisconnected);
  }
  await cur.browser.close().catch(() => {});
}

function normalizeCdpHttpBaseForJsonEndpoints(cdpUrl: string): string {
  try {
    const url = new URL(cdpUrl);
    if (url.protocol === "ws:") {
      url.protocol = "http:";
    } else if (url.protocol === "wss:") {
      url.protocol = "https:";
    }
    url.pathname = url.pathname.replace(/\/devtools\/browser\/.*$/, "");
    url.pathname = url.pathname.replace(/\/cdp$/, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    // Best-effort fallback for non-URL-ish inputs.
    return cdpUrl
      .replace(/^ws:/, "http:")
      .replace(/^wss:/, "https:")
      .replace(/\/devtools\/browser\/.*$/, "")
      .replace(/\/cdp$/, "")
      .replace(/\/$/, "");
  }
}

function cdpSocketNeedsAttach(wsUrl: string): boolean {
  try {
    const pathname = new URL(wsUrl).pathname;
    return (
      pathname === "/cdp" || pathname.endsWith("/cdp") || pathname.includes("/devtools/browser/")
    );
  } catch {
    return false;
  }
}

async function tryTerminateExecutionViaCdp(opts: {
  cdpUrl: string;
  targetId: string;
}): Promise<void> {
  const cdpHttpBase = normalizeCdpHttpBaseForJsonEndpoints(opts.cdpUrl);
  const listUrl = appendCdpPath(cdpHttpBase, "/json/list");

  const pages = await fetchJson<
    Array<{
      id?: string;
      webSocketDebuggerUrl?: string;
    }>
  >(listUrl, 2000).catch(() => null);
  if (!pages || pages.length === 0) {
    return;
  }

  const target = pages.find((p) => String(p.id ?? "").trim() === opts.targetId);
  const wsUrlRaw = String(target?.webSocketDebuggerUrl ?? "").trim();
  if (!wsUrlRaw) {
    return;
  }
  const wsUrl = normalizeCdpWsUrl(wsUrlRaw, cdpHttpBase);
  const needsAttach = cdpSocketNeedsAttach(wsUrl);

  const runWithTimeout = async <T>(work: Promise<T>, ms: number): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("CDP command timed out")), ms);
    });
    try {
      return await Promise.race([work, timeoutPromise]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  };

  await withCdpSocket(
    wsUrl,
    async (send) => {
      let sessionId: string | undefined;
      try {
        if (needsAttach) {
          const attached = (await runWithTimeout(
            send("Target.attachToTarget", { targetId: opts.targetId, flatten: true }),
            1500,
          )) as { sessionId?: unknown };
          if (typeof attached?.sessionId === "string" && attached.sessionId.trim()) {
            sessionId = attached.sessionId;
          }
        }
        await runWithTimeout(send("Runtime.terminateExecution", undefined, sessionId), 1500);
        if (sessionId) {
          // Best-effort cleanup; not required for termination to take effect.
          void send("Target.detachFromTarget", { sessionId }).catch(() => {});
        }
      } catch {
        // Best-effort; ignore
      }
    },
    { handshakeTimeoutMs: 2000 },
  ).catch(() => {});
}

/**
 * Best-effort cancellation for stuck page operations.
 *
 * Playwright serializes CDP commands per page; a long-running or stuck operation (notably evaluate)
 * can block all subsequent commands. We cannot safely "cancel" an individual command, and we do
 * not want to close the actual Chromium tab. Instead, we disconnect Playwright's CDP connection
 * so in-flight commands fail fast and the next request reconnects transparently.
 *
 * IMPORTANT: We CANNOT call Connection.close() because Playwright shares a single Connection
 * across all objects (BrowserType, Browser, etc.). Closing it corrupts the entire Playwright
 * instance, preventing reconnection.
 *
 * Instead we:
 * 1. Null out `cached` so the next call triggers a fresh connectOverCDP
 * 2. Fire-and-forget browser.close() — it may hang but won't block us
 * 3. The next connectBrowser() creates a completely new CDP WebSocket connection
 *
 * The old browser.close() eventually resolves when the in-browser evaluate timeout fires,
 * or the old connection gets GC'd. Either way, it doesn't affect the fresh connection.
 */
export async function forceDisconnectPlaywrightForTarget(opts: {
  cdpUrl: string;
  targetId?: string;
  reason?: string;
}): Promise<void> {
  const normalized = normalizeCdpUrl(opts.cdpUrl);
  if (cached?.cdpUrl !== normalized) {
    return;
  }
  const cur = cached;
  cached = null;
  // Also clear `connecting` so the next call does a fresh connectOverCDP
  // rather than awaiting a stale promise.
  connecting = null;
  if (cur) {
    // Remove the "disconnected" listener to prevent the old browser's teardown
    // from racing with a fresh connection and nulling the new `cached`.
    if (cur.onDisconnected && typeof cur.browser.off === "function") {
      cur.browser.off("disconnected", cur.onDisconnected);
    }

    // Best-effort: kill any stuck JS to unblock the target's execution context before we
    // disconnect Playwright's CDP connection.
    const targetId = opts.targetId?.trim() || "";
    if (targetId) {
      await tryTerminateExecutionViaCdp({ cdpUrl: normalized, targetId }).catch(() => {});
    }

    // Fire-and-forget: don't await because browser.close() may hang on the stuck CDP pipe.
    cur.browser.close().catch(() => {});
  }
}

/**
 * List all pages/tabs from the persistent Playwright connection.
 * Used for remote profiles where HTTP-based /json/list is ephemeral.
 */
export async function listPagesViaPlaywright(opts: { cdpUrl: string }): Promise<
  Array<{
    targetId: string;
    title: string;
    url: string;
    type: string;
  }>
> {
  const { browser } = await connectBrowser(opts.cdpUrl);
  const pages = await getAllPages(browser);
  const results: Array<{
    targetId: string;
    title: string;
    url: string;
    type: string;
  }> = [];

  for (const page of pages) {
    const tid = await pageTargetId(page).catch(() => null);
    if (tid) {
      results.push({
        targetId: tid,
        title: await page.title().catch(() => ""),
        url: page.url(),
        type: "page",
      });
    }
  }
  return results;
}

/**
 * Create a new page/tab using the persistent Playwright connection.
 * Used for remote profiles where HTTP-based /json/new is ephemeral.
 * Returns the new page's targetId and metadata.
 */
export async function createPageViaPlaywright(opts: {
  cdpUrl: string;
  url: string;
  ssrfPolicy?: SsrFPolicy;
}): Promise<{
  targetId: string;
  title: string;
  url: string;
  type: string;
}> {
  const { browser } = await connectBrowser(opts.cdpUrl);
  const context = browser.contexts()[0] ?? (await browser.newContext());
  ensureContextState(context);

  const page = await context.newPage();
  ensurePageState(page);

  // Navigate to the URL
  const targetUrl = opts.url.trim() || "about:blank";
  if (targetUrl !== "about:blank") {
    const navigationPolicy = withBrowserNavigationPolicy(opts.ssrfPolicy);
    await assertBrowserNavigationAllowed({
      url: targetUrl,
      ...navigationPolicy,
    });
    await page.goto(targetUrl, { timeout: 30_000 }).catch(() => {
      // Navigation might fail for some URLs, but page is still created
    });
    await assertBrowserNavigationResultAllowed({
      url: page.url(),
      ...navigationPolicy,
    });
  }

  // Get the targetId for this page
  const tid = await pageTargetId(page).catch(() => null);
  if (!tid) {
    throw new Error("Failed to get targetId for new page");
  }

  return {
    targetId: tid,
    title: await page.title().catch(() => ""),
    url: page.url(),
    type: "page",
  };
}

/**
 * Close a page/tab by targetId using the persistent Playwright connection.
 * Used for remote profiles where HTTP-based /json/close is ephemeral.
 */
export async function closePageByTargetIdViaPlaywright(opts: {
  cdpUrl: string;
  targetId: string;
}): Promise<void> {
  const page = await resolvePageByTargetIdOrThrow(opts);
  await page.close();
}

/**
 * Focus a page/tab by targetId using the persistent Playwright connection.
 * Used for remote profiles where HTTP-based /json/activate can be ephemeral.
 */
export async function focusPageByTargetIdViaPlaywright(opts: {
  cdpUrl: string;
  targetId: string;
}): Promise<void> {
  const page = await resolvePageByTargetIdOrThrow(opts);
  try {
    await page.bringToFront();
  } catch (err) {
    const session = await page.context().newCDPSession(page);
    try {
      await session.send("Page.bringToFront");
      return;
    } catch {
      throw err;
    } finally {
      await session.detach().catch(() => {});
    }
  }
}
