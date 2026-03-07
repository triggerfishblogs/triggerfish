/**
 * Vault health reporting.
 *
 * Generates comprehensive health reports for Vault provider
 * integration with `triggerfish patrol` diagnostics.
 *
 * @module
 */

import type { Result } from "../../types/classification.ts";
import type { CacheStats } from "../cache/secret_cache.ts";
import type { VaultClient } from "./vault_client.ts";

/** Comprehensive Vault health report. */
export interface VaultHealthReport {
  readonly connected: boolean;
  readonly initialized: boolean;
  readonly sealed: boolean;
  readonly latencyMs: number;
  readonly tokenTtlSeconds: number;
  readonly tokenRenewable: boolean;
  readonly cacheStats: CacheStats;
}

/** Options for generating a health report. */
export interface VaultHealthCheckOptions {
  readonly client: VaultClient;
  readonly getToken: () => string;
  readonly cacheStats: () => CacheStats;
}

/**
 * Generate a comprehensive Vault health report.
 *
 * Checks server health, token validity, and cache statistics.
 */
export async function generateVaultHealthReport(
  options: VaultHealthCheckOptions,
): Promise<Result<VaultHealthReport, string>> {
  const { client, cacheStats } = options;

  const start = Date.now();
  const healthResult = await client.healthCheck();
  const latencyMs = Date.now() - start;

  if (!healthResult.ok) {
    return {
      ok: true,
      value: {
        connected: false,
        initialized: false,
        sealed: true,
        latencyMs,
        tokenTtlSeconds: 0,
        tokenRenewable: false,
        cacheStats: cacheStats(),
      },
    };
  }

  const health = healthResult.value;

  let tokenTtlSeconds = 0;
  let tokenRenewable = false;

  const tokenResult = await client.tokenLookupSelf();
  if (tokenResult.ok) {
    tokenTtlSeconds = tokenResult.value.ttl;
    tokenRenewable = tokenResult.value.renewable;
  }

  return {
    ok: true,
    value: {
      connected: true,
      initialized: health.initialized,
      sealed: health.sealed,
      latencyMs,
      tokenTtlSeconds,
      tokenRenewable,
      cacheStats: cacheStats(),
    },
  };
}

/** Patrol check result. */
export interface PatrolCheckResult {
  readonly name: string;
  readonly status: "pass" | "warn" | "fail";
  readonly message: string;
}

/**
 * Run patrol diagnostic checks against a Vault health report.
 *
 * Returns individual check results for each health dimension.
 */
export function runVaultPatrolChecks(
  report: VaultHealthReport,
): PatrolCheckResult[] {
  const checks: PatrolCheckResult[] = [];

  checks.push({
    name: "vault_reachable",
    status: report.connected ? "pass" : "fail",
    message: report.connected
      ? `Vault reachable (${report.latencyMs}ms)`
      : "Vault unreachable",
  });

  if (report.connected) {
    checks.push({
      name: "vault_unsealed",
      status: !report.sealed ? "pass" : "fail",
      message: report.sealed ? "Vault is sealed" : "Vault is unsealed",
    });

    checks.push({
      name: "vault_auth_valid",
      status: report.tokenTtlSeconds > 60 ? "pass" : report.tokenTtlSeconds > 0 ? "warn" : "fail",
      message: report.tokenTtlSeconds > 0
        ? `Token TTL: ${report.tokenTtlSeconds}s (renewable: ${report.tokenRenewable})`
        : "Token expired or invalid",
    });

    const hitRate = report.cacheStats.hits + report.cacheStats.misses > 0
      ? report.cacheStats.hits /
        (report.cacheStats.hits + report.cacheStats.misses)
      : 1;

    checks.push({
      name: "vault_cache_health",
      status: hitRate >= 0.5 ? "pass" : "warn",
      message:
        `Cache: ${report.cacheStats.entries} entries, ${(hitRate * 100).toFixed(0)}% hit rate, ${report.cacheStats.staleServes} stale serves`,
    });
  }

  return checks;
}
