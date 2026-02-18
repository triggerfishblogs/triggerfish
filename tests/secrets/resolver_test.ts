/**
 * Tests for the secret reference resolver.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createMemorySecretStore } from "../../src/secrets/keychain.ts";
import { resolveSecretRefs } from "../../src/secrets/resolver.ts";

Deno.test("resolveSecretRefs — no references returns input unchanged", async () => {
  const store = createMemorySecretStore();
  const input = { url: "https://example.com", method: "GET" };
  const result = await resolveSecretRefs(input, store);
  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.resolved, input);
  assertEquals(result.value.missing, []);
});

Deno.test("resolveSecretRefs — substitutes a known secret", async () => {
  const store = createMemorySecretStore();
  await store.setSecret("api_key", "secret-value-xyz");

  const input = { authorization: "Bearer {{secret:api_key}}" };
  const result = await resolveSecretRefs(input, store);
  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.resolved, {
    authorization: "Bearer secret-value-xyz",
  });
  assertEquals(result.value.missing, []);
});

Deno.test("resolveSecretRefs — reports missing secrets", async () => {
  const store = createMemorySecretStore();

  const input = { token: "{{secret:missing_secret}}" };
  const result = await resolveSecretRefs(input, store);
  assertEquals(result.ok, true);
  if (!result.ok) return;
  // Missing secrets leave the placeholder in place
  assertEquals(result.value.resolved, { token: "{{secret:missing_secret}}" });
  assertEquals(result.value.missing, ["missing_secret"]);
});

Deno.test("resolveSecretRefs — substitutes multiple secrets", async () => {
  const store = createMemorySecretStore();
  await store.setSecret("user", "admin");
  await store.setSecret("pass", "hunter2");

  const input = { username: "{{secret:user}}", password: "{{secret:pass}}" };
  const result = await resolveSecretRefs(input, store);
  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.resolved, { username: "admin", password: "hunter2" });
  assertEquals(result.value.missing, []);
});

Deno.test("resolveSecretRefs — handles nested objects", async () => {
  const store = createMemorySecretStore();
  await store.setSecret("db_pass", "s3cr3t");

  const input = {
    database: {
      host: "localhost",
      password: "{{secret:db_pass}}",
    },
  };
  const result = await resolveSecretRefs(input, store);
  assertEquals(result.ok, true);
  if (!result.ok) return;
  const resolved = result.value.resolved as { database: { host: string; password: string } };
  assertEquals(resolved.database.password, "s3cr3t");
  assertEquals(resolved.database.host, "localhost");
});

Deno.test("resolveSecretRefs — handles arrays", async () => {
  const store = createMemorySecretStore();
  await store.setSecret("token", "tok123");

  const input = { headers: ["Content-Type: application/json", "Authorization: Bearer {{secret:token}}"] };
  const result = await resolveSecretRefs(input, store);
  assertEquals(result.ok, true);
  if (!result.ok) return;
  const resolved = result.value.resolved as { headers: string[] };
  assertEquals(resolved.headers[1], "Authorization: Bearer tok123");
});

Deno.test("resolveSecretRefs — deduplicated lookup for repeated references", async () => {
  const store = createMemorySecretStore();
  await store.setSecret("key", "value");

  const input = { a: "{{secret:key}}", b: "{{secret:key}}", c: "prefix-{{secret:key}}-suffix" };
  const result = await resolveSecretRefs(input, store);
  assertEquals(result.ok, true);
  if (!result.ok) return;
  const resolved = result.value.resolved as Record<string, string>;
  assertEquals(resolved.a, "value");
  assertEquals(resolved.b, "value");
  assertEquals(resolved.c, "prefix-value-suffix");
});

Deno.test("resolveSecretRefs — non-string values pass through unchanged", async () => {
  const store = createMemorySecretStore();

  const input = { count: 42, enabled: true, tags: null };
  const result = await resolveSecretRefs(input, store);
  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.resolved, input);
});

Deno.test("resolveSecretRefs — mixed found and missing secrets", async () => {
  const store = createMemorySecretStore();
  await store.setSecret("found", "found-value");

  const input = { a: "{{secret:found}}", b: "{{secret:not_found}}" };
  const result = await resolveSecretRefs(input, store);
  assertEquals(result.ok, true);
  if (!result.ok) return;
  const resolved = result.value.resolved as Record<string, string>;
  assertEquals(resolved.a, "found-value");
  // Placeholder left in place for missing secret
  assertEquals(resolved.b, "{{secret:not_found}}");
  assertEquals(result.value.missing, ["not_found"]);
});
