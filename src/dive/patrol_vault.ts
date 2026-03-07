/**
 * Vault patrol diagnostic checks.
 *
 * Integrates Vault health monitoring with the `triggerfish patrol`
 * diagnostic system.
 *
 * @module
 */

import type { Result } from "../core/types/classification.ts";
import type { VaultClient } from "../core/secrets/vault/vault_client.ts";
import type { SecretCache } from "../core/secrets/cache/secret_cache.ts";
import {
  generateVaultHealthReport,
  collectVaultPatrolChecks,
} from "../core/secrets/vault/health.ts";
import type { PatrolCheckResult } from "../core/secrets/vault/health.ts";

/** Options for running Vault patrol checks. */
export interface VaultPatrolOptions {
  readonly client: VaultClient;
  readonly getToken: () => string;
  readonly cache?: SecretCache;
}

/**
 * Run Vault diagnostic checks for the patrol system.
 *
 * @returns Array of patrol check results
 */
export async function conductVaultPatrol(
  options: VaultPatrolOptions,
): Promise<Result<PatrolCheckResult[], string>> {
  const cacheStats = options.cache
    ? () => options.cache!.stats()
    : () => ({ entries: 0, hits: 0, misses: 0, staleServes: 0 });

  const reportResult = await generateVaultHealthReport({
    client: options.client,
    getToken: options.getToken,
    cacheStats,
  });

  if (!reportResult.ok) {
    return reportResult;
  }

  return { ok: true, value: collectVaultPatrolChecks(reportResult.value) };
}
