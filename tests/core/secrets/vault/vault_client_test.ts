/**
 * Vault HTTP client tests with mocked fetch.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createVaultClient } from "../../../../src/core/secrets/vault/vault_client.ts";

function withMockFetch(
  handler: (url: string, init?: RequestInit) => Response,
  fn: () => Promise<void>,
): Promise<void> {
  const original = globalThis.fetch;
  globalThis.fetch = (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : input.url;
    return Promise.resolve(handler(url, init));
  };
  return fn().finally(() => {
    globalThis.fetch = original;
  });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.test("VaultClient: kvRead returns secret data", () =>
  withMockFetch(
    () =>
      jsonResponse({
        data: {
          data: { api_key: "secret123" },
          metadata: {
            version: 1,
            created_time: "2026-01-01T00:00:00Z",
            deletion_time: "",
            destroyed: false,
          },
        },
      }),
    async () => {
      const client = createVaultClient(
        { address: "http://127.0.0.1:8200", requestTimeoutMs: 5000 },
        () => "test-token",
      );

      const result = await client.kvRead("secret", "myapp");
      assertEquals(result.ok, true);
      if (result.ok) {
        assertEquals(result.value.data["api_key"], "secret123");
        assertEquals(result.value.metadata.version, 1);
      }
    },
  ));

Deno.test("VaultClient: kvRead returns error for 404", () =>
  withMockFetch(
    () => jsonResponse({ errors: ["no secret found"] }, 404),
    async () => {
      const client = createVaultClient(
        { address: "http://127.0.0.1:8200", requestTimeoutMs: 5000 },
        () => "test-token",
      );

      const result = await client.kvRead("secret", "missing");
      assertEquals(result.ok, false);
    },
  ));

Deno.test("VaultClient: kvPut writes secret data", () =>
  withMockFetch(
    () =>
      jsonResponse({
        data: { version: 2, created_time: "2026-01-01T00:00:00Z" },
      }),
    async () => {
      const client = createVaultClient(
        { address: "http://127.0.0.1:8200", requestTimeoutMs: 5000 },
        () => "test-token",
      );

      const result = await client.kvPut("secret", "myapp", {
        api_key: "new-secret",
      });
      assertEquals(result.ok, true);
      if (result.ok) assertEquals(result.value.version, 2);
    },
  ));

Deno.test("VaultClient: kvDelete deletes a secret", () =>
  withMockFetch(
    () => new Response(null, { status: 204 }),
    async () => {
      const client = createVaultClient(
        { address: "http://127.0.0.1:8200", requestTimeoutMs: 5000 },
        () => "test-token",
      );

      const result = await client.kvDelete("secret", "myapp");
      assertEquals(result.ok, true);
    },
  ));

Deno.test("VaultClient: kvList returns secret keys", () =>
  withMockFetch(
    () => jsonResponse({ data: { keys: ["secret-a", "secret-b"] } }),
    async () => {
      const client = createVaultClient(
        { address: "http://127.0.0.1:8200", requestTimeoutMs: 5000 },
        () => "test-token",
      );

      const result = await client.kvList("secret", "");
      assertEquals(result.ok, true);
      if (result.ok) {
        assertEquals(result.value, ["secret-a", "secret-b"]);
      }
    },
  ));

Deno.test("VaultClient: kvList returns empty array for 404", () =>
  withMockFetch(
    () => jsonResponse({ errors: [] }, 404),
    async () => {
      const client = createVaultClient(
        { address: "http://127.0.0.1:8200", requestTimeoutMs: 5000 },
        () => "test-token",
      );

      const result = await client.kvList("secret", "empty");
      assertEquals(result.ok, true);
      if (result.ok) assertEquals(result.value, []);
    },
  ));

Deno.test("VaultClient: healthCheck returns server status", () =>
  withMockFetch(
    () =>
      jsonResponse({
        initialized: true,
        sealed: false,
        standby: false,
        server_time_utc: 1704067200,
        version: "1.15.0",
      }),
    async () => {
      const client = createVaultClient(
        { address: "http://127.0.0.1:8200", requestTimeoutMs: 5000 },
        () => "test-token",
      );

      const result = await client.healthCheck();
      assertEquals(result.ok, true);
      if (result.ok) {
        assertEquals(result.value.initialized, true);
        assertEquals(result.value.sealed, false);
      }
    },
  ));

Deno.test("VaultClient: tokenLookupSelf returns token info", () =>
  withMockFetch(
    () =>
      jsonResponse({
        data: {
          accessor: "abc123",
          creation_time: 1704067200,
          creation_ttl: 3600,
          display_name: "token",
          expire_time: "2026-01-02T00:00:00Z",
          explicit_max_ttl: 0,
          id: "s.token123",
          num_uses: 0,
          orphan: false,
          path: "auth/token/create",
          policies: ["default"],
          renewable: true,
          ttl: 3400,
          type: "service",
        },
      }),
    async () => {
      const client = createVaultClient(
        { address: "http://127.0.0.1:8200", requestTimeoutMs: 5000 },
        () => "test-token",
      );

      const result = await client.tokenLookupSelf();
      assertEquals(result.ok, true);
      if (result.ok) {
        assertEquals(result.value.renewable, true);
        assertEquals(result.value.ttl, 3400);
      }
    },
  ));

Deno.test("VaultClient: sends namespace header when configured", () =>
  withMockFetch(
    (_url, init) => {
      const headers = init?.headers as Record<string, string>;
      assertEquals(headers["X-Vault-Namespace"], "my-ns");
      return jsonResponse({ data: { data: {}, metadata: { version: 1, created_time: "", deletion_time: "", destroyed: false } } });
    },
    async () => {
      const client = createVaultClient(
        {
          address: "http://127.0.0.1:8200",
          namespace: "my-ns",
          requestTimeoutMs: 5000,
        },
        () => "test-token",
      );

      await client.kvRead("secret", "test");
    },
  ));

Deno.test("VaultClient: handles Vault error responses", () =>
  withMockFetch(
    () => jsonResponse({ errors: ["permission denied"] }, 403),
    async () => {
      const client = createVaultClient(
        { address: "http://127.0.0.1:8200", requestTimeoutMs: 5000 },
        () => "bad-token",
      );

      const result = await client.kvRead("secret", "protected");
      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.error.includes("permission denied"), true);
      }
    },
  ));
