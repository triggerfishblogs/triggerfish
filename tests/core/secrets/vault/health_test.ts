/**
 * Vault health reporting and patrol check tests.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import {
  generateVaultHealthReport,
  runVaultPatrolChecks,
} from "../../../../src/core/secrets/vault/health.ts";
import type { VaultClient } from "../../../../src/core/secrets/vault/vault_client.ts";

function createHealthyClient(): VaultClient {
  return {
    kvRead: () => Promise.resolve({ ok: false as const, error: "unused" }),
    kvPut: () => Promise.resolve({ ok: false as const, error: "unused" }),
    kvDelete: () => Promise.resolve({ ok: false as const, error: "unused" }),
    kvList: () => Promise.resolve({ ok: false as const, error: "unused" }),
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
          id: "token",
          num_uses: 0,
          orphan: false,
          path: "",
          policies: [],
          renewable: true,
          ttl: 3200,
          type: "service",
        },
      }),
  };
}

function createUnreachableClient(): VaultClient {
  return {
    kvRead: () => Promise.resolve({ ok: false as const, error: "unreachable" }),
    kvPut: () => Promise.resolve({ ok: false as const, error: "unreachable" }),
    kvDelete: () =>
      Promise.resolve({ ok: false as const, error: "unreachable" }),
    kvList: () => Promise.resolve({ ok: false as const, error: "unreachable" }),
    healthCheck: () =>
      Promise.resolve({ ok: false as const, error: "Connection refused" }),
    tokenLookupSelf: () =>
      Promise.resolve({ ok: false as const, error: "unreachable" }),
  };
}

Deno.test("health report: healthy Vault server", async () => {
  const result = await generateVaultHealthReport({
    client: createHealthyClient(),
    getToken: () => "token",
    cacheStats: () => ({
      entries: 10,
      hits: 50,
      misses: 5,
      staleServes: 2,
    }),
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.connected, true);
    assertEquals(result.value.initialized, true);
    assertEquals(result.value.sealed, false);
    assertEquals(result.value.tokenTtlSeconds, 3200);
    assertEquals(result.value.tokenRenewable, true);
    assertEquals(result.value.cacheStats.entries, 10);
  }
});

Deno.test("health report: unreachable Vault server", async () => {
  const result = await generateVaultHealthReport({
    client: createUnreachableClient(),
    getToken: () => "token",
    cacheStats: () => ({ entries: 0, hits: 0, misses: 0, staleServes: 0 }),
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.connected, false);
    assertEquals(result.value.tokenTtlSeconds, 0);
  }
});

Deno.test("patrol checks: all pass for healthy Vault", () => {
  const checks = runVaultPatrolChecks({
    connected: true,
    initialized: true,
    sealed: false,
    latencyMs: 15,
    tokenTtlSeconds: 3200,
    tokenRenewable: true,
    cacheStats: { entries: 10, hits: 50, misses: 5, staleServes: 0 },
  });

  assertEquals(checks.length, 4);
  assertEquals(checks[0].name, "vault_reachable");
  assertEquals(checks[0].status, "pass");
  assertEquals(checks[1].name, "vault_unsealed");
  assertEquals(checks[1].status, "pass");
  assertEquals(checks[2].name, "vault_auth_valid");
  assertEquals(checks[2].status, "pass");
  assertEquals(checks[3].name, "vault_cache_health");
  assertEquals(checks[3].status, "pass");
});

Deno.test("patrol checks: fail when Vault unreachable", () => {
  const checks = runVaultPatrolChecks({
    connected: false,
    initialized: false,
    sealed: true,
    latencyMs: 5000,
    tokenTtlSeconds: 0,
    tokenRenewable: false,
    cacheStats: { entries: 0, hits: 0, misses: 0, staleServes: 0 },
  });

  assertEquals(checks.length, 1);
  assertEquals(checks[0].status, "fail");
});

Deno.test("patrol checks: warn when token near expiry", () => {
  const checks = runVaultPatrolChecks({
    connected: true,
    initialized: true,
    sealed: false,
    latencyMs: 10,
    tokenTtlSeconds: 30,
    tokenRenewable: true,
    cacheStats: { entries: 0, hits: 0, misses: 0, staleServes: 0 },
  });

  const authCheck = checks.find((c) => c.name === "vault_auth_valid");
  assertEquals(authCheck?.status, "warn");
});

Deno.test("patrol checks: warn when cache hit rate low", () => {
  const checks = runVaultPatrolChecks({
    connected: true,
    initialized: true,
    sealed: false,
    latencyMs: 10,
    tokenTtlSeconds: 3600,
    tokenRenewable: true,
    cacheStats: { entries: 5, hits: 1, misses: 10, staleServes: 3 },
  });

  const cacheCheck = checks.find((c) => c.name === "vault_cache_health");
  assertEquals(cacheCheck?.status, "warn");
});
