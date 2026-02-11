/**
 * Phase A1: Web Fetch Tests
 *
 * Tests content extraction (Readability + raw), SSRF prevention,
 * domain policy enforcement, content truncation, and timeout.
 */
import { assertEquals } from "@std/assert";
import { createWebFetcher } from "../../src/web/fetch.ts";
import type { DnsChecker } from "../../src/web/fetch.ts";
import { createDomainPolicy } from "../../src/web/domains.ts";
import type { DomainPolicy } from "../../src/web/domains.ts";

/** A DNS checker that always allows (returns a public IP). */
const allowAllDns: DnsChecker = (_hostname: string) =>
  Promise.resolve({ ok: true as const, value: "93.184.216.34" });

/** A DNS checker that always blocks (SSRF). */
const blockAllDns: DnsChecker = (hostname: string) =>
  Promise.resolve({
    ok: false as const,
    error: `SSRF blocked: ${hostname} resolves to private IP 127.0.0.1`,
  });

/** Create a permissive domain policy for basic tests. */
function openPolicy(): DomainPolicy {
  return createDomainPolicy({
    allowlist: [],
    denylist: [],
    classificationMap: [],
  });
}

/** Mock fetch that returns a given Response. */
function mockFetch(response: Response): typeof fetch {
  return (() => Promise.resolve(response)) as unknown as typeof fetch;
}

// ─── Invalid URL ────────────────────────────────────────────────────────────

Deno.test("WebFetcher: rejects invalid URL", async () => {
  const fetcher = createWebFetcher({
    domainPolicy: openPolicy(),
    dnsChecker: allowAllDns,
  });
  const result = await fetcher.fetch("not a url");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("Invalid URL"), true);
  }
});

Deno.test("WebFetcher: rejects non-http protocols", async () => {
  const fetcher = createWebFetcher({
    domainPolicy: openPolicy(),
    dnsChecker: allowAllDns,
  });
  const result = await fetcher.fetch("ftp://example.com/file");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("Unsupported protocol"), true);
  }
});

// ─── Domain Policy Enforcement ──────────────────────────────────────────────

Deno.test("WebFetcher: blocks denied domains", async () => {
  const policy = createDomainPolicy({
    allowlist: [],
    denylist: ["blocked.com"],
    classificationMap: [],
  });
  const fetcher = createWebFetcher({
    domainPolicy: policy,
    dnsChecker: allowAllDns,
  });

  const result = await fetcher.fetch("https://blocked.com/page");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("Domain blocked"), true);
  }
});

// ─── Readability Content Extraction ─────────────────────────────────────────

Deno.test("WebFetcher: extracts article content with Readability", async () => {
  const articleText =
    "This is a comprehensive article about web content extraction. ".repeat(10);
  const html = `<!DOCTYPE html>
<html><head><title>Test Article</title></head>
<body>
  <nav>Navigation Menu</nav>
  <article>
    <h1>Test Article</h1>
    <p>${articleText}</p>
  </article>
  <footer>Footer Content</footer>
</body></html>`;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch(
    new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }),
  );

  try {
    const fetcher = createWebFetcher({
      domainPolicy: openPolicy(),
      dnsChecker: allowAllDns,
    });
    const result = await fetcher.fetch("https://example.com/article");
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.mode, "readability");
      assertEquals(result.value.statusCode, 200);
      assertEquals(result.value.contentType.includes("text/html"), true);
      assertEquals(result.value.content.length > 0, true);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── Raw Mode ───────────────────────────────────────────────────────────────

Deno.test("WebFetcher: raw mode returns full HTML", async () => {
  const html =
    "<html><head><title>Raw</title></head><body><p>Hello</p></body></html>";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch(
    new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }),
  );

  try {
    const fetcher = createWebFetcher({
      domainPolicy: openPolicy(),
      dnsChecker: allowAllDns,
    });
    const result = await fetcher.fetch("https://example.com/page", {
      mode: "raw",
    });
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.mode, "raw");
      assertEquals(result.value.content, html);
      assertEquals(result.value.title, "Raw");
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── Content Truncation ─────────────────────────────────────────────────────

Deno.test("WebFetcher: truncates content at maxContentLength", async () => {
  const html = "<html><body>" + "x".repeat(1000) + "</body></html>";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch(
    new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }),
  );

  try {
    const fetcher = createWebFetcher({
      domainPolicy: openPolicy(),
      dnsChecker: allowAllDns,
    });
    const result = await fetcher.fetch("https://example.com/page", {
      mode: "raw",
      maxContentLength: 100,
    });
    assertEquals(result.ok, true);
    if (result.ok) {
      // 100 chars + "\n[truncated]"
      assertEquals(result.value.content.length <= 112, true);
      assertEquals(result.value.content.endsWith("[truncated]"), true);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── SSRF Prevention ────────────────────────────────────────────────────────

Deno.test("WebFetcher: blocks private IPs via resolveAndCheck", async () => {
  const fetcher = createWebFetcher({
    domainPolicy: openPolicy(),
    dnsChecker: blockAllDns,
  });

  const result = await fetcher.fetch("https://localhost/admin");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("SSRF blocked"), true);
  }
});

// ─── HTTP Error Handling ────────────────────────────────────────────────────

Deno.test("WebFetcher: returns error for HTTP 404", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch(
    new Response("Not Found", { status: 404, statusText: "Not Found" }),
  );

  try {
    const fetcher = createWebFetcher({
      domainPolicy: openPolicy(),
      dnsChecker: allowAllDns,
    });
    const result = await fetcher.fetch("https://example.com/missing");
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.error.includes("404"), true);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ─── Readability Fallback ───────────────────────────────────────────────────

Deno.test("WebFetcher: falls back to raw when Readability extracts too little", async () => {
  const html =
    "<html><head><title>Tiny</title></head><body><p>Hi</p></body></html>";

  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch(
    new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    }),
  );

  try {
    const fetcher = createWebFetcher({
      domainPolicy: openPolicy(),
      dnsChecker: allowAllDns,
    });
    const result = await fetcher.fetch("https://example.com/tiny");
    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.value.content.includes("<html>"), true);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
