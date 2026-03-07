/**
 * Vault provider tests — full SecretStore contract with mocked client.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createVaultProvider } from "../../../../src/core/secrets/vault/vault_provider.ts";
import type { VaultClient } from "../../../../src/core/secrets/vault/vault_client.ts";
import type { VaultAuth } from "../../../../src/core/secrets/vault/auth/mod.ts";
import type { Result } from "../../../../src/core/types/classification.ts";

function createMockAuth(): VaultAuth {
  return {
    authenticate: () =>
      Promise.resolve({
        ok: true as const,
        value: {
          client_token: "mock-token",
          accessor: "",
          policies: [],
          token_policies: [],
          lease_duration: 3600,
          renewable: true,
        },
      }),
    currentToken: () => "mock-token",
  };
}

function createMockVaultClient(
  store: Map<string, Record<string, string>>,
): VaultClient {
  return {
    kvRead: (mount, path) => {
      const data = store.get(`${mount}/${path}`);
      if (!data) {
        return Promise.resolve({
          ok: false as const,
          error: `Secret not found at ${mount}/${path}`,
        });
      }
      return Promise.resolve({
        ok: true as const,
        value: {
          data,
          metadata: {
            version: 1,
            created_time: "2026-01-01T00:00:00Z",
            deletion_time: "",
            destroyed: false,
          },
        },
      });
    },
    kvPut: (mount, path, data) => {
      store.set(`${mount}/${path}`, { ...data });
      return Promise.resolve({
        ok: true as const,
        value: { version: 1, created_time: "2026-01-01T00:00:00Z" },
      });
    },
    kvDelete: (mount, path) => {
      if (!store.has(`${mount}/${path}`)) {
        return Promise.resolve({
          ok: false as const,
          error: `Secret not found at ${mount}/${path}`,
        });
      }
      store.delete(`${mount}/${path}`);
      return Promise.resolve({ ok: true as const, value: true as const });
    },
    kvList: (_mount, _path) => {
      const keys = [...store.keys()];
      return Promise.resolve({ ok: true as const, value: keys });
    },
    healthCheck: () =>
      Promise.resolve({
        ok: true as const,
        value: {
          initialized: true,
          sealed: false,
          standby: false,
          server_time_utc: 0,
          version: "1.15.0",
        },
      }),
    tokenLookupSelf: () =>
      Promise.resolve({
        ok: true as const,
        value: {
          accessor: "",
          creation_time: 0,
          creation_ttl: 3600,
          display_name: "",
          expire_time: null,
          explicit_max_ttl: 0,
          id: "mock-token",
          num_uses: 0,
          orphan: false,
          path: "",
          policies: [],
          renewable: true,
          ttl: 3600,
          type: "service",
        },
      }),
  };
}

Deno.test("VaultProvider: getSecret reads from KV v2", async () => {
  const store = new Map([["secret/myapp", { api_key: "secret123" }]]);
  const provider = createVaultProvider({
    client: createMockVaultClient(store),
    auth: createMockAuth(),
    defaultMount: "secret",
  });

  const result = await provider.getSecret("myapp#api_key");
  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.value, "secret123");
});

Deno.test("VaultProvider: getSecret returns 'value' field by default", async () => {
  const store = new Map([["secret/token", { value: "my-token" }]]);
  const provider = createVaultProvider({
    client: createMockVaultClient(store),
    auth: createMockAuth(),
    defaultMount: "secret",
  });

  const result = await provider.getSecret("token");
  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.value, "my-token");
});

Deno.test("VaultProvider: getSecret returns first field when no 'value' key", async () => {
  const store = new Map([["secret/single", { only_key: "only_value" }]]);
  const provider = createVaultProvider({
    client: createMockVaultClient(store),
    auth: createMockAuth(),
    defaultMount: "secret",
  });

  const result = await provider.getSecret("single");
  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.value, "only_value");
});

Deno.test("VaultProvider: setSecret writes to KV v2", async () => {
  const store = new Map<string, Record<string, string>>();
  const provider = createVaultProvider({
    client: createMockVaultClient(store),
    auth: createMockAuth(),
    defaultMount: "secret",
  });

  const result = await provider.setSecret("new-secret", "new-value");
  assertEquals(result.ok, true);
  assertEquals(store.get("secret/new-secret")?.["value"], "new-value");
});

Deno.test("VaultProvider: setSecret with key separator writes specific field", async () => {
  const store = new Map<string, Record<string, string>>();
  const provider = createVaultProvider({
    client: createMockVaultClient(store),
    auth: createMockAuth(),
    defaultMount: "secret",
  });

  const result = await provider.setSecret("app#api_key", "key123");
  assertEquals(result.ok, true);
  assertEquals(store.get("secret/app")?.["api_key"], "key123");
});

Deno.test("VaultProvider: deleteSecret removes from KV v2", async () => {
  const store = new Map([["secret/to-delete", { value: "gone" }]]);
  const provider = createVaultProvider({
    client: createMockVaultClient(store),
    auth: createMockAuth(),
    defaultMount: "secret",
  });

  const result = await provider.deleteSecret("to-delete");
  assertEquals(result.ok, true);
  assertEquals(store.has("secret/to-delete"), false);
});

Deno.test("VaultProvider: probeHealth returns health status", async () => {
  const store = new Map<string, Record<string, string>>();
  const provider = createVaultProvider({
    client: createMockVaultClient(store),
    auth: createMockAuth(),
    defaultMount: "secret",
  });

  const result = await provider.probeHealth();
  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.value.healthy, true);
});

Deno.test("VaultProvider: fetchSecretWithMetadata returns value and metadata", async () => {
  const store = new Map([["secret/meta", { api_key: "metaval" }]]);
  const provider = createVaultProvider({
    client: createMockVaultClient(store),
    auth: createMockAuth(),
    defaultMount: "secret",
  });

  const result = await provider.fetchSecretWithMetadata("meta#api_key");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.value, "metaval");
    assertEquals(result.value.metadata.version, 1);
  }
});

Deno.test("VaultProvider: pathPrefix is prepended to all lookups", async () => {
  const store = new Map([
    ["secret/triggerfish/myapp", { value: "prefixed" }],
  ]);
  const provider = createVaultProvider({
    client: createMockVaultClient(store),
    auth: createMockAuth(),
    defaultMount: "secret",
    pathPrefix: "triggerfish/",
  });

  const result = await provider.getSecret("myapp");
  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.value, "prefixed");
});

Deno.test("VaultProvider: providerId is 'vault'", () => {
  const provider = createVaultProvider({
    client: createMockVaultClient(new Map()),
    auth: createMockAuth(),
    defaultMount: "secret",
  });
  assertEquals(provider.providerId, "vault");
});

Deno.test("VaultProvider: error when secret key not found in response", async () => {
  const store = new Map([["secret/app", { other_key: "val" }]]);
  const provider = createVaultProvider({
    client: createMockVaultClient(store),
    auth: createMockAuth(),
    defaultMount: "secret",
  });

  const result = await provider.getSecret("app#missing_key");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("missing_key"), true);
  }
});
