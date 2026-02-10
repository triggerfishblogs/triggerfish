/**
 * Browser automation (CDP) tests.
 *
 * Uses mock page objects to test tool logic without requiring
 * a real Chromium instance. Domain policy integration is tested
 * in domains_test.ts.
 */

import { assertEquals } from "jsr:@std/assert";
import { createBrowserTools } from "../../src/browser/tools.ts";
import { createDomainPolicy } from "../../src/browser/domains.ts";
import type { BrowserManager, BrowserState } from "../../src/browser/manager.ts";

/** Mock page that simulates the puppeteer Page API surface used by BrowserTools. */
function createMockPage() {
  let currentUrl = "about:blank";
  const clicks: string[] = [];
  const typed: Array<{ selector: string; text: string }> = [];

  return {
    url: () => currentUrl,
    goto: async (url: string, _options?: Record<string, unknown>) => {
      currentUrl = url;
      return { status: () => 200 };
    },
    screenshot: async (_options?: Record<string, unknown>) => {
      // Return a minimal PNG-like buffer
      return new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    },
    click: async (selector: string) => {
      clicks.push(selector);
    },
    type: async (selector: string, text: string) => {
      typed.push({ selector, text });
    },
    select: async (_selector: string, value: string) => [value],
    $: async (selector: string) => {
      if (selector === "#missing") return null;
      return {
        uploadFile: async (_path: string) => {},
      };
    },
    evaluate: async (js: string) => {
      if (js === "throw_error") throw new Error("eval error");
      if (js === "1 + 1") return 2;
      if (js === "document.title") return "Test Page";
      return null;
    },
    waitForSelector: async (selector: string, _options?: Record<string, unknown>) => {
      if (selector === "#timeout") throw new Error("Timeout waiting for selector");
    },
    // Exposed for assertions
    _clicks: clicks,
    _typed: typed,
  };
}

/** Create a mock BrowserManager with an optional mock page. */
function createMockManager(
  opts: { connected?: boolean } = {},
): { manager: BrowserManager; mockPage: ReturnType<typeof createMockPage> } {
  const mockPage = createMockPage();
  const connected = opts.connected !== false;

  const policy = createDomainPolicy({
    allowList: [],
    denyList: ["malware.bad", "phishing.evil"],
    classifications: { "classified.corp": "CONFIDENTIAL" },
  });

  const manager: BrowserManager = {
    state: (connected ? "connected" : "disconnected") as BrowserState,
    domainPolicy: policy,
    launch: async () => {},
    shutdown: async () => {},
    getPage: () => connected ? mockPage : undefined,
  };

  return { manager, mockPage };
}

// ---------------------------------------------------------------------------
// Navigate
// ---------------------------------------------------------------------------

Deno.test("navigate: succeeds for allowed URL", async () => {
  const { manager } = createMockManager();
  const tools = createBrowserTools(manager);

  const result = await tools.navigate("https://example.com/page");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.success, true);
  }
});

Deno.test("navigate: blocked by domain policy", async () => {
  const { manager } = createMockManager();
  const tools = createBrowserTools(manager);

  const result = await tools.navigate("https://malware.bad/exploit");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("domain policy"), true);
  }
});

Deno.test("navigate: returns error when not connected", async () => {
  const { manager } = createMockManager({ connected: false });
  const tools = createBrowserTools(manager);

  const result = await tools.navigate("https://example.com");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, "Browser not connected");
  }
});

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

Deno.test("snapshot: returns PNG bytes", async () => {
  const { manager } = createMockManager();
  const tools = createBrowserTools(manager);

  const result = await tools.snapshot();
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value instanceof Uint8Array, true);
    // PNG magic bytes
    assertEquals(result.value[0], 137);
    assertEquals(result.value[1], 80);
    assertEquals(result.value[2], 78);
    assertEquals(result.value[3], 71);
  }
});

Deno.test("snapshot: returns error when not connected", async () => {
  const { manager } = createMockManager({ connected: false });
  const tools = createBrowserTools(manager);

  const result = await tools.snapshot();
  assertEquals(result.ok, false);
});

// ---------------------------------------------------------------------------
// Click
// ---------------------------------------------------------------------------

Deno.test("click: succeeds on valid selector", async () => {
  const { manager, mockPage } = createMockManager();
  const tools = createBrowserTools(manager);

  const result = await tools.click("#submit-btn");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.success, true);
  }
  assertEquals(mockPage._clicks.includes("#submit-btn"), true);
});

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

Deno.test("type: enters text into element", async () => {
  const { manager, mockPage } = createMockManager();
  const tools = createBrowserTools(manager);

  const result = await tools.type("#search-input", "hello world");
  assertEquals(result.ok, true);
  assertEquals(mockPage._typed.length, 1);
  assertEquals(mockPage._typed[0].selector, "#search-input");
  assertEquals(mockPage._typed[0].text, "hello world");
});

// ---------------------------------------------------------------------------
// Select
// ---------------------------------------------------------------------------

Deno.test("select: selects dropdown value", async () => {
  const { manager } = createMockManager();
  const tools = createBrowserTools(manager);

  const result = await tools.select("#country", "US");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.success, true);
  }
});

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

Deno.test("upload: succeeds when element exists", async () => {
  const { manager } = createMockManager();
  const tools = createBrowserTools(manager);

  const result = await tools.upload("#file-input", "/tmp/test.txt");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.success, true);
  }
});

Deno.test("upload: fails when element not found", async () => {
  const { manager } = createMockManager();
  const tools = createBrowserTools(manager);

  const result = await tools.upload("#missing", "/tmp/test.txt");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("not found"), true);
  }
});

// ---------------------------------------------------------------------------
// Evaluate
// ---------------------------------------------------------------------------

Deno.test("evaluate: returns result of JS expression", async () => {
  const { manager } = createMockManager();
  const tools = createBrowserTools(manager);

  const result = await tools.evaluate("1 + 1");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, 2);
  }
});

Deno.test("evaluate: returns error on exception", async () => {
  const { manager } = createMockManager();
  const tools = createBrowserTools(manager);

  const result = await tools.evaluate("throw_error");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("Evaluate failed"), true);
  }
});

// ---------------------------------------------------------------------------
// Wait
// ---------------------------------------------------------------------------

Deno.test("wait: succeeds for existing selector", async () => {
  const { manager } = createMockManager();
  const tools = createBrowserTools(manager);

  const result = await tools.wait("#content");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.success, true);
  }
});

Deno.test("wait: returns error on timeout", async () => {
  const { manager } = createMockManager();
  const tools = createBrowserTools(manager);

  const result = await tools.wait("#timeout");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("Wait failed"), true);
  }
});

// ---------------------------------------------------------------------------
// Disconnected state — all tools should return error
// ---------------------------------------------------------------------------

Deno.test("all tools return not-connected error when manager has no page", async () => {
  const { manager } = createMockManager({ connected: false });
  const tools = createBrowserTools(manager);

  const results = await Promise.all([
    tools.navigate("https://example.com"),
    tools.snapshot(),
    tools.click("#btn"),
    tools.type("#input", "text"),
    tools.select("#sel", "val"),
    tools.upload("#file", "/tmp/f"),
    tools.evaluate("1+1"),
    tools.wait("#el"),
  ]);

  for (const r of results) {
    assertEquals(r.ok, false);
  }
});

// ---------------------------------------------------------------------------
// Domain policy integration
// ---------------------------------------------------------------------------

Deno.test("navigate: multiple denied domains are all blocked", async () => {
  const { manager } = createMockManager();
  const tools = createBrowserTools(manager);

  const r1 = await tools.navigate("https://malware.bad/path");
  const r2 = await tools.navigate("https://phishing.evil/login");

  assertEquals(r1.ok, false);
  assertEquals(r2.ok, false);
});
