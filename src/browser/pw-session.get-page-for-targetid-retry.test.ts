import { describe, expect, it, vi } from "vitest";

import { getPageForTargetId, forceDisconnectPlaywrightForTarget } from "./pw-session.js";
import * as pwSession from "./pw-session.js";

describe("pw-session getPageForTargetIdWithRetry", () => {
  it("returns page when found on first attempt", async () => {
    const mockPage = { url: () => "https://example.com" };
    
    // Spy on the actual exported functions
    const connectBrowserSpy = vi.spyOn(pwSession, 'connectBrowser');
    const getAllPagesSpy = vi.spyOn(pwSession, 'getAllPages');
    const findPageByTargetIdSpy = vi.spyOn(pwSession, 'findPageByTargetId');
    const forceDisconnectSpy = vi.spyOn(pwSession, 'forceDisconnectPlaywrightForTarget');
    
    connectBrowserSpy.mockResolvedValue({
      browser: { pages: vi.fn().mockResolvedValue([mockPage]) },
    });
    getAllPagesSpy.mockResolvedValue([mockPage]);
    findPageByTargetIdSpy.mockResolvedValue(mockPage);
    forceDisconnectSpy.mockResolvedValue(undefined);

    const result = await getPageForTargetId({
      cdpUrl: "ws://localhost:9222/devtools/browser/123",
      targetId: "target-123",
    });

    expect(result).toBe(mockPage);
    expect(forceDisconnectSpy).not.toHaveBeenCalled();

    // Clean up spies
    connectBrowserSpy.mockRestore();
    getAllPagesSpy.mockRestore();
    findPageByTargetIdSpy.mockRestore();
    forceDisconnectSpy.mockRestore();
  });

  it("retries once after tab not found error", async () => {
    const mockPage = { url: () => "https://example.com" };

    const connectBrowserSpy = vi.spyOn(pwSession, 'connectBrowser');
    const getAllPagesSpy = vi.spyOn(pwSession, 'getAllPages');
    const findPageByTargetIdSpy = vi.spyOn(pwSession, 'findPageByTargetId');
    const forceDisconnectSpy = vi.spyOn(pwSession, 'forceDisconnectPlaywrightForTarget');

    // First call returns null, second call returns page
    findPageByTargetIdSpy
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(mockPage);

    connectBrowserSpy.mockResolvedValue({
      browser: { pages: vi.fn().mockResolvedValue([mockPage]) },
    });
    getAllPagesSpy.mockResolvedValue([mockPage]);
    forceDisconnectSpy.mockResolvedValue(undefined);

    const result = await getPageForTargetId({
      cdpUrl: "ws://127.0.0.1:18791/cdp",
      targetId: "target-123",
    });

    expect(result).toBe(mockPage);
    expect(forceDisconnectSpy).toHaveBeenCalledWith({
      cdpUrl: "ws://127.0.0.1:18791/cdp",
      targetId: "target-123",
      reason: "recovering from tab not found after navigation",
    });
    expect(findPageByTargetIdSpy).toHaveBeenCalledTimes(2);

    // Clean up spies
    connectBrowserSpy.mockRestore();
    getAllPagesSpy.mockRestore();
    findPageByTargetIdSpy.mockRestore();
    forceDisconnectSpy.mockRestore();
  });

  it("throws error after retry still fails", async () => {
    const mockPage = { url: () => "https://example.com" };

    const connectBrowserSpy = vi.spyOn(pwSession, 'connectBrowser');
    const getAllPagesSpy = vi.spyOn(pwSession, 'getAllPages');
    const findPageByTargetIdSpy = vi.spyOn(pwSession, 'findPageByTargetId');
    const forceDisconnectSpy = vi.spyOn(pwSession, 'forceDisconnectPlaywrightForTarget');

    findPageByTargetIdSpy.mockResolvedValue(null);
    connectBrowserSpy.mockResolvedValue({
      browser: { pages: vi.fn().mockResolvedValue([mockPage]) },
    });
    getAllPagesSpy.mockResolvedValue([mockPage]);
    forceDisconnectSpy.mockResolvedValue(undefined);

    await expect(
      getPageForTargetId({
        cdpUrl: "ws://127.0.0.1:18791/cdp",
        targetId: "target-123",
      }),
    ).rejects.toThrow("tab not found");

    expect(forceDisconnectSpy).toHaveBeenCalled();
    expect(findPageByTargetIdSpy).toHaveBeenCalledTimes(2);

    // Clean up spies
    connectBrowserSpy.mockRestore();
    getAllPagesSpy.mockRestore();
    findPageByTargetIdSpy.mockRestore();
    forceDisconnectSpy.mockRestore();
  });

  it("does not retry for non-extension relay URLs", async () => {
    const mockPage = { url: () => "https://example.com" };

    const connectBrowserSpy = vi.spyOn(pwSession, 'connectBrowser');
    const getAllPagesSpy = vi.spyOn(pwSession, 'getAllPages');
    const findPageByTargetIdSpy = vi.spyOn(pwSession, 'findPageByTargetId');
    const forceDisconnectSpy = vi.spyOn(pwSession, 'forceDisconnectPlaywrightForTarget');

    findPageByTargetIdSpy.mockResolvedValue(null);
    connectBrowserSpy.mockResolvedValue({
      browser: { pages: vi.fn().mockResolvedValue([mockPage]) },
    });
    getAllPagesSpy.mockResolvedValue([mockPage]);
    forceDisconnectSpy.mockResolvedValue(undefined);

    await expect(
      getPageForTargetId({
        cdpUrl: "ws://remote-server:9222/devtools/browser/123",
        targetId: "target-123",
      }),
    ).rejects.toThrow("tab not found");

    expect(forceDisconnectSpy).not.toHaveBeenCalled();

    // Clean up spies
    connectBrowserSpy.mockRestore();
    getAllPagesSpy.mockRestore();
    findPageByTargetIdSpy.mockRestore();
    forceDisconnectSpy.mockRestore();
  });

  it("uses single page fallback without retry", async () => {
    const mockPage = { url: () => "https://example.com" };

    const connectBrowserSpy = vi.spyOn(pwSession, 'connectBrowser');
    const getAllPagesSpy = vi.spyOn(pwSession, 'getAllPages');
    const findPageByTargetIdSpy = vi.spyOn(pwSession, 'findPageByTargetId');
    const forceDisconnectSpy = vi.spyOn(pwSession, 'forceDisconnectPlaywrightForTarget');

    // For single page scenario, findPageByTargetId returns null but we have only one page
    findPageByTargetIdSpy.mockResolvedValue(null);
    connectBrowserSpy.mockResolvedValue({
      browser: { pages: vi.fn().mockResolvedValue([mockPage]) },
    });
    getAllPagesSpy.mockResolvedValue([mockPage]);
    forceDisconnectSpy.mockResolvedValue(undefined);

    const result = await getPageForTargetId({
      cdpUrl: "ws://127.0.0.1:18791/cdp",
      targetId: "target-123",
    });

    // Should use single page fallback without retry
    expect(result).toBe(mockPage);
    expect(forceDisconnectSpy).not.toHaveBeenCalled();

    // Clean up spies
    connectBrowserSpy.mockRestore();
    getAllPagesSpy.mockRestore();
    findPageByTargetIdSpy.mockRestore();
    forceDisconnectSpy.mockRestore();
  });
});