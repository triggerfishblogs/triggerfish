/**
 * Secret resolver tests.
 *
 * Tests for `resolveSecretRef`, `resolveConfigSecrets`, and `findSecretRefs`
 * using the in-memory store backend (no OS keychain required).
 */

import { assertEquals } from "@std/assert";
import { createMemorySecretStore } from "../../src/secrets/keychain.ts";
import {
  findSecretRefs,
  resolveConfigSecrets,
  resolveSecretRef,
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
