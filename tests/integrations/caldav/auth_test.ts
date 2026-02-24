/**
 * CalDAV authentication tests.
 *
 * Tests credential resolution from keychain and Authorization header building.
 */
import { assertEquals } from "@std/assert";
import {
  resolveCalDavCredentials,
  buildAuthHeaders,
} from "../../../src/integrations/caldav/auth.ts";
import type { CalDavConfig, CalDavCredentials } from "../../../src/integrations/caldav/types.ts";
import type { SecretStore } from "../../../src/core/secrets/keychain/keychain.ts";

// ─── Mock SecretStore ─────────────────────────────────────────────────────────

function createMockSecretStore(
  secrets: Record<string, string>,
): SecretStore {
  return {
    getSecret: (key: string) => {
      const value = secrets[key];
      if (value !== undefined) {
        return Promise.resolve({ ok: true as const, value });
      }
      return Promise.resolve({
        ok: false as const,
        error: `Secret "${key}" not found`,
      });
    },
    setSecret: () => Promise.resolve({ ok: true as const, value: true as const }),
    deleteSecret: () =>
      Promise.resolve({ ok: true as const, value: true as const }),
    listSecrets: () =>
      Promise.resolve({ ok: true as const, value: Object.keys(secrets) }),
  };
}

// ─── Credential Resolution ────────────────────────────────────────────────────

Deno.test("resolveCalDavCredentials: resolves basic auth from keychain", async () => {
  const store = createMockSecretStore({ "caldav-password": "secret123" });
  const config: CalDavConfig = {
    enabled: true,
    server_url: "https://caldav.example.com",
    username: "user@example.com",
  };

  const result = await resolveCalDavCredentials({ secretStore: store, config });
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.method, "basic");
    if (result.value.method === "basic") {
      assertEquals(result.value.username, "user@example.com");
      assertEquals(result.value.password, "secret123");
    }
  }
});

Deno.test("resolveCalDavCredentials: uses credential_ref from config", async () => {
  const store = createMockSecretStore({ "my-caldav-pass": "custompass" });
  const config: CalDavConfig = {
    enabled: true,
    server_url: "https://caldav.example.com",
    username: "user@example.com",
    credential_ref: "my-caldav-pass",
  };

  const result = await resolveCalDavCredentials({ secretStore: store, config });
  assertEquals(result.ok, true);
  if (result.ok && result.value.method === "basic") {
    assertEquals(result.value.password, "custompass");
  }
});

Deno.test("resolveCalDavCredentials: returns error with setup instructions when secret missing", async () => {
  const store = createMockSecretStore({});
  const config: CalDavConfig = {
    enabled: true,
    server_url: "https://caldav.example.com",
    username: "user@example.com",
  };

  const result = await resolveCalDavCredentials({ secretStore: store, config });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("triggerfish connect caldav"), true);
  }
});

Deno.test("resolveCalDavCredentials: returns error when username missing", async () => {
  const store = createMockSecretStore({ "caldav-password": "secret" });
  const config: CalDavConfig = {
    enabled: true,
    server_url: "https://caldav.example.com",
  };

  const result = await resolveCalDavCredentials({ secretStore: store, config });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("username"), true);
  }
});

// ─── Auth Headers ─────────────────────────────────────────────────────────────

Deno.test("buildAuthHeaders: builds Basic auth header", () => {
  const creds: CalDavCredentials = {
    method: "basic",
    username: "user@example.com",
    password: "secret",
  };

  const headers = buildAuthHeaders(creds);
  assertEquals(headers.Authorization.startsWith("Basic "), true);
  const decoded = atob(headers.Authorization.substring(6));
  assertEquals(decoded, "user@example.com:secret");
});

Deno.test("buildAuthHeaders: builds Bearer auth header for OAuth2", () => {
  const creds: CalDavCredentials = {
    method: "oauth2",
    accessToken: "token123",
  };

  const headers = buildAuthHeaders(creds);
  assertEquals(headers.Authorization, "Bearer token123");
});
