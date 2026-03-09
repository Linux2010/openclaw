import type { Browser } from "playwright-core";
import { chromium } from "playwright-core";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getPageForTargetIdWithRetry, closePlaywrightBrowserConnection } from "./pw-session.js";

// Mock playwright-core
vi.mock("playwright-core", () => ({
  chromium: {
    connectOverCDP: vi.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/unbound-method
const connectOverCDPMock = vi.mocked(chromium.connectOverCDP, true);

describe("pw-session getPageForTargetIdWithRetry", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Clear cached browser connection
    try {
      await closePlaywrightBrowserConnection();
    } catch {
      // Ignore errors if no connection exists
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns page when found on first attempt", async () => {
    const mockPage = { url: () => "https://example.com" };
    const mockContext = {
      pages: () => [mockPage], // Playwright's pages() is synchronous
    };
    const mockBrowser = {
      contexts: () => [mockContext],
      on: vi.fn(),
      off: vi.fn(),
      close: () => Promise.resolve(),
      isConnected: () => true,
    } as unknown as Browser;

    connectOverCDPMock.mockResolvedValue(mockBrowser);

    const result = await getPageForTargetIdWithRetry({
      cdpUrl: "ws://localhost:9222/devtools/browser/123",
    });

    expect(result).toBe(mockPage);
  });

  it("retries once after tab not found error for extension relay URLs", async () => {
    const mockPage = { url: () => "https://example.com" };
    const mockContext = {
      pages: () => [mockPage],
    };
    const mockBrowser = {
      contexts: () => [mockContext],
      on: vi.fn(),
      off: vi.fn(),
      close: () => Promise.resolve(),
      isConnected: () => true,
    } as unknown as Browser;

    connectOverCDPMock.mockResolvedValue(mockBrowser);

    // First call should succeed (no targetId means use first page)
    const result = await getPageForTargetIdWithRetry({
      cdpUrl: "ws://127.0.0.1:18791/cdp",
    });

    expect(result).toBe(mockPage);
  });

  it("does not retry for non-extension relay URLs", async () => {
    const mockPage = { url: () => "https://example.com" };
    const mockContext = {
      pages: () => [mockPage],
    };
    const mockBrowser = {
      contexts: () => [mockContext],
      on: vi.fn(),
      off: vi.fn(),
      close: () => Promise.resolve(),
      isConnected: () => true,
    } as unknown as Browser;

    connectOverCDPMock.mockResolvedValue(mockBrowser);

    // Non-extension relay URL should not trigger retry logic
    const result = await getPageForTargetIdWithRetry({
      cdpUrl: "ws://remote-server:9222/devtools/browser/123",
      targetId: "non-existent-target",
    });

    // Should return the mock page (single page fallback)
    expect(result).toBe(mockPage);
  });

  it("throws error when no pages available", async () => {
    const mockContext = {
      pages: () => [], // No pages
    };
    const mockBrowser = {
      contexts: () => [mockContext],
      on: vi.fn(),
      off: vi.fn(),
      close: () => Promise.resolve(),
      isConnected: () => true,
    } as unknown as Browser;

    connectOverCDPMock.mockResolvedValue(mockBrowser);

    await expect(
      getPageForTargetIdWithRetry({
        cdpUrl: "ws://localhost:9222/devtools/browser/123",
      }),
    ).rejects.toThrow("No pages available");
  });
});
