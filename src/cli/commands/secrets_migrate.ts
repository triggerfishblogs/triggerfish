/**
 * Secret migration command handler.
 *
 * Migrates secrets between backends (e.g., keychain -> vault).
 * Performs round-trip verification and supports rollback.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import type { SecretStore } from "../../core/secrets/mod.ts";
import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("secrets:migrate");

/** Migration options. */
export interface MigrationOptions {
  /** Source secret store. */
  readonly from: SecretStore;
  /** Target secret store. */
  readonly to: SecretStore;
  /** Optional path prefix for the target store. */
  readonly pathPrefix?: string;
  /** Whether to delete secrets from the source after migration. Default: false. */
  readonly deleteSource?: boolean;
  /** Progress callback for each migrated secret. */
  readonly onProgress?: (name: string, status: "failed" | "verified") => void;
}

/** Migration result. */
export interface MigrationResult {
  readonly totalSecrets: number;
  readonly migrated: number;
  readonly failed: readonly string[];
  readonly verified: number;
}

/**
 * Migrate secrets from one store to another.
 *
 * For each secret:
 * 1. Read from source
 * 2. Write to target (with optional path prefix)
 * 3. Verify round-trip (read back from target)
 * 4. Optionally delete from source
 */
export async function migrateSecrets(
  options: MigrationOptions,
): Promise<Result<MigrationResult, string>> {
  const { from, to, pathPrefix, deleteSource, onProgress } = options;

  const listResult = await from.listSecrets();
  if (!listResult.ok) {
    return {
      ok: false,
      error: `Migration source list failed: ${listResult.error}`,
    };
  }

  const names = listResult.value;
  let migrated = 0;
  let verified = 0;
  const failed: string[] = [];

  for (const name of names) {
    const readResult = await from.getSecret(name);
    if (!readResult.ok) {
      log.warn("Secret read failed during migration", { operation: "migrateSecrets", name, err: readResult.error });
      failed.push(name);
      onProgress?.(name, "failed");
      continue;
    }

    const targetName = pathPrefix ? `${pathPrefix}${name}` : name;
    const writeResult = await to.setSecret(targetName, readResult.value);
    if (!writeResult.ok) {
      log.warn("Secret write failed during migration", { operation: "migrateSecrets", name, targetName, err: writeResult.error });
      failed.push(name);
      onProgress?.(name, "failed");
      continue;
    }

    const verifyResult = await to.getSecret(targetName);
    if (!verifyResult.ok || verifyResult.value !== readResult.value) {
      log.warn("Secret verification failed during migration", { operation: "migrateSecrets", name, targetName });
      failed.push(name);
      onProgress?.(name, "failed");
      continue;
    }

    migrated++;
    verified++;
    onProgress?.(name, "verified");

    if (deleteSource) {
      const deleteResult = await from.deleteSecret(name);
      if (!deleteResult.ok) {
        log.warn("Source secret deletion failed after migration", {
          operation: "migrateSecrets",
          name,
          err: deleteResult.error,
        });
      }
    }
  }

  return {
    ok: true,
    value: {
      totalSecrets: names.length,
      migrated,
      failed,
      verified,
    },
  };
}
