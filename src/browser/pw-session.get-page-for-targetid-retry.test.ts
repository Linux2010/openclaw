import { describe, expect, it, vi } from "vitest";
import { getPageForTargetIdWithRetry } from "./pw-session.js";

// Mock the exported functions that are used by getPageForTargetIdWithRetry
vi.mock("./pw-session.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    getPageForTargetId: vi.fn(),
    forceDisconnectPlaywrightForTarget: vi.fn(),
    connectBrowser: vi.fn(),
    getAllPages: vi.fn(),
  };
});

describe("pw-session getPageForTargetIdWithRetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns page when found on first attempt", async () => {
    const mockPage = { url: () => "https://example.com" };
    const getPageForTargetIdMock = vi.fn().mockResolvedValue(mockPage);
    const forceDisconnectMock = vi.fn();

    // @ts-ignore - mocking exported function
    getPageForTargetId.mockImplementation(getPageForTargetIdMock);
    // @ts-ignore - mocking exported function
    forceDisconnectPlaywrightForTarget.mockImplementation(forceDisconnectMock);

    const result = await getPageForTargetIdWithRetry({
      cdpUrl: "ws://localhost:9222/devtools/browser/123",
      targetId: "target-123",
    });

    expect(result).toBe(mockPage);
    expect(forceDisconnectMock).not.toHaveBeenCalled();
  });

  it("retries once after tab not found error", async () => {
    const mockPage = { url: () => "https://example.com" };
    const getPageForTargetIdMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("tab not found"))
      .mockResolvedValueOnce(mockPage);
    const forceDisconnectMock = vi.fn();

    // @ts-ignore - mocking exported function
    getPageForTargetId.mockImplementation(getPageForTargetIdMock);
    // @ts-ignore - mocking exported function
    forceDisconnectPlaywrightForTarget.mockImplementation(forceDisconnectMock);

    const result = await getPageForTargetIdWithRetry({
      cdpUrl: "ws://127.0.0.1:18791/cdp",
      targetId: "target-123",
    });

    expect(result).toBe(mockPage);
    expect(forceDisconnectMock).toHaveBeenCalledWith({
      cdpUrl: "ws://127.0.0.1:18791/cdp",
      targetId: "target-123",
      reason: "recovering from tab not found after navigation",
    });
    expect(getPageForTargetIdMock).toHaveBeenCalledTimes(2);
  });

  it("throws error after retry still fails", async () => {
    const getPageForTargetIdMock = vi.fn().mockRejectedValue(new Error("tab not found"));
    const forceDisconnectMock = vi.fn();

    // @ts-ignore - mocking exported function
    getPageForTargetId.mockImplementation(getPageForTargetIdMock);
    // @ts-ignore - mocking exported function
    forceDisconnectPlaywrightForTarget.mockImplementation(forceDisconnectMock);

    await expect(
      getPageForTargetIdWithRetry({
        cdpUrl: "ws://127.0.0.1:18791/cdp",
        targetId: "target-123",
      }),
    ).rejects.toThrow("tab not found");

    expect(forceDisconnectMock).toHaveBeenCalled();
    expect(getPageForTargetIdMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry for non-extension relay URLs", async () => {
    const getPageForTargetIdMock = vi.fn().mockRejectedValue(new Error("tab not found"));
    const forceDisconnectMock = vi.fn();

    // @ts-ignore - mocking exported function
    getPageForTargetId.mockImplementation(getPageForTargetIdMock);
    // @ts-ignore - mocking exported function
    forceDisconnectPlaywrightForTarget.mockImplementation(forceDisconnectMock);

    await expect(
      getPageForTargetIdWithRetry({
        cdpUrl: "ws://remote-server:9222/devtools/browser/123",
        targetId: "target-123",
      }),
    ).rejects.toThrow("tab not found");

    expect(forceDisconnectMock).not.toHaveBeenCalled();
  });

  it("uses single page fallback without retry", async () => {
    const mockPage = { url: () => "https://example.com" };

    // First call fails, but we need to simulate the fallback logic
    // This test is more complex because it requires mocking connectBrowser and getAllPages
    const getPageForTargetIdMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("tab not found"))
      .mockResolvedValueOnce(mockPage);
    const connectBrowserMock = vi.fn().mockResolvedValue({
      browser: { pages: vi.fn().mockResolvedValue([mockPage]) },
    });
    const getAllPagesMock = vi.fn().mockResolvedValue([mockPage]);
    const forceDisconnectMock = vi.fn();

    // @ts-ignore - mocking exported function
    getPageForTargetId.mockImplementation(getPageForTargetIdMock);
    // @ts-ignore - mocking exported function
    connectBrowser.mockImplementation(connectBrowserMock);
    // @ts-ignore - mocking exported function
    getAllPages.mockImplementation(getAllPagesMock);
    // @ts-ignore - mocking exported function
    forceDisconnectPlaywrightForTarget.mockImplementation(forceDisconnectMock);

    const result = await getPageForTargetIdWithRetry({
      cdpUrl: "ws://127.0.0.1:18791/cdp",
      targetId: "target-123",
    });

    // Should use single page fallback without retry
    expect(result).toBe(mockPage);
    expect(forceDisconnectMock).not.toHaveBeenCalled();
  });
});
