/**
 * Migration from encrypted-file secret store to Windows DPAPI backend.
 *
 * On first DPAPI startup, checks for existing `secrets.json` + `secrets.key`.
 * If found, decrypts entries with the old AES key and re-encrypts with DPAPI.
 * Old files are preserved as backups until the user explicitly removes them.
 *
 * @module
 */

import { join } from "@std/path";
import type { Result } from "../../types/classification.ts";
import type { SecretStore } from "../backends/secret_store.ts";
import { createEncryptedFileSecretStore } from "../encrypted/encrypted_file_provider.ts";
import { createLogger } from "../../logger/logger.ts";
import { resolveTriggerfishDataDir } from "./windows_keychain.ts";

const log = createLogger("secrets");

/** Resolve the paths for the legacy encrypted-file store. */
function resolveLegacyPaths(): {
  readonly secretsPath: string;
  readonly keyPath: string;
} {
  const dataDir = resolveTriggerfishDataDir();
  return {
    secretsPath: join(dataDir, "secrets.json"),
    keyPath: join(dataDir, "secrets.key"),
  };
}

/** Check if the legacy encrypted-file store files exist. */
async function legacyStoreExists(paths: {
  readonly secretsPath: string;
  readonly keyPath: string;
}): Promise<boolean> {
  try {
    await Deno.stat(paths.secretsPath);
    await Deno.stat(paths.keyPath);
    return true;
  } catch (err) {
    log.debug("Legacy secrets file stat failed, treating as absent", { operation: "legacyStoreExists", secretsPath: paths.secretsPath, err });
    return false;
  }
}

/**
 * Migrate secrets from the encrypted-file store to the DPAPI backend.
 *
 * Reads all entries from the legacy AES-256-GCM store, then writes each
 * one to the DPAPI store. Legacy files are left in place as backups.
 *
 * @param dpapiStore - The target DPAPI-backed SecretStore
 * @returns Count of migrated secrets, or an error
 */
export async function migrateEncryptedFileToDpapi(
  dpapiStore: SecretStore,
): Promise<Result<number, string>> {
  const legacyPaths = resolveLegacyPaths();

  if (!(await legacyStoreExists(legacyPaths))) {
    log.debug("DPAPI migration skipped: no legacy encrypted-file store found");
    return { ok: true, value: 0 };
  }

  log.info("DPAPI migration: legacy encrypted-file store detected", {
    secretsPath: legacyPaths.secretsPath,
    keyPath: legacyPaths.keyPath,
  });

  const legacyStore = createEncryptedFileSecretStore(legacyPaths);
  const listResult = await legacyStore.listSecrets();
  if (!listResult.ok) {
    return {
      ok: false,
      error: `DPAPI migration failed to list legacy secrets: ${listResult.error}`,
    };
  }

  const names = listResult.value;
  if (names.length === 0) {
    log.info("DPAPI migration: legacy store is empty, nothing to migrate");
    return { ok: true, value: 0 };
  }

  let migrated = 0;
  for (const name of names) {
    const getResult = await legacyStore.getSecret(name);
    if (!getResult.ok) {
      log.warn("DPAPI migration: failed to read legacy secret, skipping", {
        name,
        err: getResult.error,
      });
      continue;
    }

    const setResult = await dpapiStore.setSecret(name, getResult.value);
    if (!setResult.ok) {
      log.warn("DPAPI migration: failed to write secret to DPAPI, skipping", {
        name,
        err: setResult.error,
      });
      continue;
    }
    migrated++;
  }

  log.info("DPAPI migration complete", {
    total: names.length,
    migrated,
    skipped: names.length - migrated,
    legacyFilesPreserved: true,
  });

  return { ok: true, value: migrated };
}
