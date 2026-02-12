/**
 * GitHub auth resolution tests.
 *
 * Tests resolveGitHubToken with OS keychain (SecretStore).
 */
import { assertEquals } from "@std/assert";
import { resolveGitHubToken } from "../../src/github/auth.ts";
import { createMemorySecretStore } from "../../src/secrets/keychain.ts";

// ─── Keychain Lookup ─────────────────────────────────────────────────────────

Deno.test("resolveGitHubToken: finds token in keychain", async () => {
  const store = createMemorySecretStore();
  await store.setSecret("github-pat", "ghp_keychain_token");

  const result = await resolveGitHubToken({ secretStore: store });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, "ghp_keychain_token");
  }
});

// ─── Error When Not Found ────────────────────────────────────────────────────

Deno.test("resolveGitHubToken: returns error when keychain has no token", async () => {
  const store = createMemorySecretStore();

  const result = await resolveGitHubToken({ secretStore: store });

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("not found"), true);
    assertEquals(result.error.includes("keychain"), true);
  }
});

Deno.test("resolveGitHubToken: error message mentions connect command", async () => {
  const store = createMemorySecretStore();

  const result = await resolveGitHubToken({ secretStore: store });

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("connect github"), true);
  }
});

// ─── Different Secrets ───────────────────────────────────────────────────────

Deno.test("resolveGitHubToken: ignores other secrets in keychain", async () => {
  const store = createMemorySecretStore();
  await store.setSecret("other-secret", "some-value");

  const result = await resolveGitHubToken({ secretStore: store });

  assertEquals(result.ok, false);
});

Deno.test("resolveGitHubToken: returns the exact token value", async () => {
  const store = createMemorySecretStore();
  const token = "ghp_ABCDEFghijklmnop1234567890";
  await store.setSecret("github-pat", token);

  const result = await resolveGitHubToken({ secretStore: store });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, token);
  }
});
