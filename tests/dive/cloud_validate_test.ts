/**
 * Tests for Triggerfish Gateway license validation.
 *
 * Uses injected mock fetchers — no real network calls.
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import { validateLicenseKey } from "../../src/dive/cloud.ts";
import {
  capturingFetcher,
  mockFetcher,
  networkErrorFetcher,
} from "./cloud_test_helpers.ts";

Deno.test("Cloud: validateLicenseKey sends Bearer auth header", async () => {
  const { fetcher, captured } = capturingFetcher(200, {
    valid: true,
    plan: "pro",
    features: ["llm_proxy"],
  });

  const result = await validateLicenseKey(
    "https://api.test",
    "tf_test_key123",
    fetcher,
  );

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.valid, true);
    assertEquals(result.value.plan, "pro");
  }
  assertEquals(
    captured.url,
    "https://api.test/v1/license/validate",
  );
  assertEquals(
    captured.headers["Authorization"],
    "Bearer tf_test_key123",
  );
});

Deno.test("Cloud: validateLicenseKey returns error reason on 401", async () => {
  const result = await validateLicenseKey(
    "https://api.test",
    "tf_test_bad_key",
    mockFetcher(401, { valid: false, reason: "invalid_key" }),
  );

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, "invalid_key");
  }
});

Deno.test("Cloud: validateLicenseKey returns cancelled reason with portal_url", async () => {
  const result = await validateLicenseKey(
    "https://api.test",
    "tf_test_cancelled",
    mockFetcher(401, {
      valid: false,
      reason: "cancelled",
      portal_url: "https://billing.stripe.com/p/session/test",
    }),
  );

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error, "cancelled");
  }
});

Deno.test("Cloud: validateLicenseKey returns error on network failure", async () => {
  const result = await validateLicenseKey(
    "https://api.test",
    "tf_test_key",
    networkErrorFetcher(),
  );

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertStringIncludes(result.error, "Could not reach");
  }
});
