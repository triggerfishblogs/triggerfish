/**
 * Secret resolver tests.
 *
 * Tests for config-level resolution (`resolveSecretRef`, `resolveConfigSecrets`,
 * `findSecretRefs`) and tool-argument-level resolution (`resolveSecretRefs`)
 * using the in-memory store backend (no OS keychain required).
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createMemorySecretStore } from "../../src/secrets/keychain.ts";
import {
  findSecretRefs,
  resolveConfigSecrets,
  resolveSecretRef,
  resolveSecretRefs,
} from "../../src/secrets/resolver.ts";

// ─── resolveSecretRef ────────────────────────────────────────────────────────

Deno.test("resolveSecretRef: non-string value passes through unchanged", async () => {
  const store = createMemorySecretStore();
  const result = await resolveSecretRef(42, store);
  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.value, 42);
});

Deno.test("resolveSecretRef: boolean value passes through unchanged", async () => {
  const store = createMemorySecretStore();
  const result = await resolveSecretRef(true, store);
  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.value, true);
});

Deno.test("resolveSecretRef: null passes through unchanged", async () => {
  const store = createMemorySecretStore();
  const result = await resolveSecretRef(null, store);
  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.value, null);
});

Deno.test("resolveSecretRef: plain string without secret: prefix passes through unchanged", async () => {
  const store = createMemorySecretStore();
  const result = await resolveSecretRef("just-a-value", store);
  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.value, "just-a-value");
});

Deno.test("resolveSecretRef: secret: reference resolves when key exists", async () => {
  const store = createMemorySecretStore();
  await store.setSecret("my:key", "resolved-value");

  const result = await resolveSecretRef("secret:my:key", store);
  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.value, "resolved-value");
});

Deno.test("resolveSecretRef: secret: reference returns error when key missing", async () => {
  const store = createMemorySecretStore();

  const result = await resolveSecretRef("secret:nonexistent:key", store);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("nonexistent:key"), true);
  }
});

Deno.test("resolveSecretRef: empty key after secret: prefix returns error", async () => {
  const store = createMemorySecretStore();

  const result = await resolveSecretRef("secret:", store);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("empty key"), true);
  }
});

// ─── resolveConfigSecrets ─────────────────────────────────────────────────────

Deno.test("resolveConfigSecrets: flat config with no secret refs returns unchanged", async () => {
  const store = createMemorySecretStore();
  const config = { name: "agent", port: 8080, enabled: true };

  const result = await resolveConfigSecrets(config, store);
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, { name: "agent", port: 8080, enabled: true });
  }
});

Deno.test("resolveConfigSecrets: resolves secret: ref in nested config", async () => {
  const store = createMemorySecretStore();
  await store.setSecret("telegram:botToken", "BOT_TOKEN_VALUE");

  const config = {
    channels: {
      telegram: {
        botToken: "secret:telegram:botToken",
        classification: "INTERNAL",
      },
    },
  };

  const result = await resolveConfigSecrets(config, store);
  assertEquals(result.ok, true);
  if (result.ok) {
    const resolved = result.value as typeof config;
    assertEquals(resolved.channels.telegram.botToken, "BOT_TOKEN_VALUE");
    // Non-secret field unchanged
    assertEquals(resolved.channels.telegram.classification, "INTERNAL");
  }
});

Deno.test("resolveConfigSecrets: resolves multiple secret: refs in same config", async () => {
  const store = createMemorySecretStore();
  await store.setSecret("provider:anthropic:apiKey", "sk-ant-abc");
  await store.setSecret("web:search:apiKey", "bsv-xyz");

  const config = {
    models: {
      providers: {
        anthropic: {
          apiKey: "secret:provider:anthropic:apiKey",
        },
      },
    },
    web: {
      search: {
        api_key: "secret:web:search:apiKey",
      },
    },
  };

  const result = await resolveConfigSecrets(config, store);
  assertEquals(result.ok, true);
  if (result.ok) {
    const resolved = result.value as typeof config;
    assertEquals(
      resolved.models.providers.anthropic.apiKey,
      "sk-ant-abc",
    );
    assertEquals(resolved.web.search.api_key, "bsv-xyz");
  }
});

Deno.test("resolveConfigSecrets: returns error if any secret ref is missing", async () => {
  const store = createMemorySecretStore();
  await store.setSecret("good:key", "good-value");

  const config = {
    a: "secret:good:key",
    b: "secret:missing:key",
  };

  const result = await resolveConfigSecrets(config, store);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("missing:key"), true);
  }
});

Deno.test("resolveConfigSecrets: handles array values correctly", async () => {
  const store = createMemorySecretStore();
  await store.setSecret("item:token", "TOKEN_A");

  const config = {
    items: ["plain-string", "secret:item:token", 42],
  };

  const result = await resolveConfigSecrets(config, store);
  assertEquals(result.ok, true);
  if (result.ok) {
    const resolved = result.value as typeof config;
    assertEquals(resolved.items[0], "plain-string");
    assertEquals(resolved.items[1], "TOKEN_A");
    assertEquals(resolved.items[2], 42);
  }
});

Deno.test("resolveConfigSecrets: passes null and undefined through", async () => {
  const store = createMemorySecretStore();

  const result1 = await resolveConfigSecrets(null, store);
  assertEquals(result1.ok, true);
  if (result1.ok) assertEquals(result1.value, null);

  const result2 = await resolveConfigSecrets(undefined, store);
  assertEquals(result2.ok, true);
  if (result2.ok) assertEquals(result2.value, undefined);
});

Deno.test("resolveConfigSecrets: number and boolean leaves pass through", async () => {
  const store = createMemorySecretStore();

  const config = { port: 8080, enabled: false, ratio: 1.5 };
  const result = await resolveConfigSecrets(config, store);
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, { port: 8080, enabled: false, ratio: 1.5 });
  }
});

// ─── findSecretRefs ───────────────────────────────────────────────────────────

Deno.test("findSecretRefs: returns empty array when no secret: refs exist", () => {
  const config = { name: "agent", port: 8080 };
  const refs = findSecretRefs(config);
  assertEquals(refs, []);
});

Deno.test("findSecretRefs: returns dotted paths for top-level secret: refs", () => {
  const config = {
    apiKey: "secret:provider:anthropic:apiKey",
    name: "plain",
  };
  const refs = findSecretRefs(config);
  assertEquals(refs, ["apiKey"]);
});

Deno.test("findSecretRefs: returns nested dotted paths", () => {
  const config = {
    channels: {
      telegram: {
        botToken: "secret:telegram:botToken",
        classification: "INTERNAL",
      },
    },
  };
  const refs = findSecretRefs(config);
  assertEquals(refs, ["channels.telegram.botToken"]);
});

Deno.test("findSecretRefs: returns multiple refs across different paths", () => {
  const config = {
    models: {
      providers: {
        anthropic: { apiKey: "secret:provider:anthropic:apiKey" },
      },
    },
    web: {
      search: { api_key: "secret:web:search:apiKey" },
    },
    plain: "not-a-secret",
  };
  const refs = findSecretRefs(config);
  assertEquals(refs.includes("models.providers.anthropic.apiKey"), true);
  assertEquals(refs.includes("web.search.api_key"), true);
  assertEquals(refs.length, 2);
});

Deno.test("findSecretRefs: handles null and undefined config", () => {
  assertEquals(findSecretRefs(null), []);
  assertEquals(findSecretRefs(undefined), []);
});

// ─── resolveSecretRefs (tool-argument-level) ─────────────────────────────────

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
