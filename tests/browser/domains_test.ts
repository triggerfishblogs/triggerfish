/**
 * Phase 18: Browser Automation (CDP)
 * Tests MUST FAIL until browser manager, tools, and domain policy are implemented.
 */
import { assertEquals } from "@std/assert";
import { createDomainPolicy } from "../../src/browser/domains.ts";

// Note: Full browser tests require Chromium — these test the policy layer which is pure logic.

Deno.test("DomainPolicy: allows domains on allowlist", () => {
  const policy = createDomainPolicy({
    allowList: ["example.com", "internal.corp"],
    denyList: [],
    classifications: { "internal.corp": "INTERNAL" },
  });
  assertEquals(policy.isAllowed("https://example.com/page"), true);
  assertEquals(policy.isAllowed("https://internal.corp/docs"), true);
});

Deno.test("DomainPolicy: blocks domains on denylist", () => {
  const policy = createDomainPolicy({
    allowList: [],
    denyList: ["malware.bad"],
    classifications: {},
  });
  assertEquals(policy.isAllowed("https://malware.bad/exploit"), false);
});

Deno.test("DomainPolicy: returns classification for domain", () => {
  const policy = createDomainPolicy({
    allowList: ["internal.corp"],
    denyList: [],
    classifications: { "internal.corp": "CONFIDENTIAL" },
  });
  assertEquals(policy.getClassification("https://internal.corp/secret"), "CONFIDENTIAL");
});

Deno.test("DomainPolicy: unclassified domain returns PUBLIC", () => {
  const policy = createDomainPolicy({
    allowList: ["example.com"],
    denyList: [],
    classifications: {},
  });
  assertEquals(policy.getClassification("https://example.com"), "PUBLIC");
});
