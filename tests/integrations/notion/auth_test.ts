/**
 * Notion auth module tests.
 *
 * Tests token resolution from the OS keychain and token format validation.
 *
 * @module
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import type { Result } from "../../../src/core/types/classification.ts";
import type { SecretStore } from "../../../src/core/secrets/backends/secret_store.ts";
import {
  isValidNotionTokenFormat,
  resolveNotionToken,
} from "../../../src/integrations/notion/auth.ts";

/** Create a mock SecretStore that returns the given result for getSecret. */
function createMockSecretStore(
  getSecretResult: Result<string, string>,
): SecretStore {
  return {
    getSecret: (_name: string) => Promise.resolve(getSecretResult),
    setSecret: (_name: string, _value: string) =>
      Promise.resolve({ ok: true, value: true } as Result<true, string>),
    deleteSecret: (_name: string) =>
      Promise.resolve({ ok: true, value: true } as Result<true, string>),
    listSecrets: () =>
      Promise.resolve({ ok: true, value: [] } as Result<string[], string>),
  };
}

// ─── resolveNotionToken ─────────────────────────────────────────────────────

Deno.test("resolveNotionToken: returns token when found in keychain", async () => {
  const secretStore = createMockSecretStore({
    ok: true,
    value: "ntn_test123",
  });

  const result = await resolveNotionToken({ secretStore });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, "ntn_test123");
  }
});

Deno.test("resolveNotionToken: returns error when not found", async () => {
  const secretStore = createMockSecretStore({
    ok: false,
    error: "not found",
  });

  const result = await resolveNotionToken({ secretStore });

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertStringIncludes(result.error, "Notion token not found");
  }
});

Deno.test("resolveNotionToken: error message includes setup instructions", async () => {
  const secretStore = createMockSecretStore({
    ok: false,
    error: "not found",
  });

  const result = await resolveNotionToken({ secretStore });

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertStringIncludes(result.error, "triggerfish connect notion");
  }
});

// ─── isValidNotionTokenFormat ───────────────────────────────────────────────

Deno.test("isValidNotionTokenFormat: accepts ntn_ prefix", () => {
  assertEquals(isValidNotionTokenFormat("ntn_abc123"), true);
});

Deno.test("isValidNotionTokenFormat: accepts secret_ prefix", () => {
  assertEquals(isValidNotionTokenFormat("secret_abc123"), true);
});

Deno.test("isValidNotionTokenFormat: rejects invalid format", () => {
  assertEquals(isValidNotionTokenFormat("invalid_token"), false);
});
