/**
 * File I/O, format validation, and legacy migration for encrypted secrets.
 *
 * Handles reading/writing the secrets JSON file, detecting legacy
 * plain-text format, and migrating it to the encrypted v1 schema.
 *
 * @module
 */

import { dirname } from "@std/path";
import type { Result } from "../../types/classification.ts";
import type {
  EncryptedEntry,
  EncryptedSecretsFile,
  SecretsFileCache,
} from "./encrypted_file_types.ts";
import { encryptSecretValue } from "./encrypted_file_crypto.ts";
import { createLogger } from "../../logger/mod.ts";

const log = createLogger("secrets");

/** Persist an encrypted secrets file to disk with restrictive permissions. */
export async function persistSecretsFile(
  secretsPath: string,
  file: EncryptedSecretsFile,
): Promise<void> {
  await Deno.mkdir(dirname(secretsPath), { recursive: true });
  await Deno.writeTextFile(secretsPath, JSON.stringify(file, null, 2) + "\n");
  if (Deno.build.os !== "windows") {
    try {
      await Deno.chmod(secretsPath, 0o600);
    } catch { /* Best-effort */ }
  }
}

/** Write an updated secrets file and return success, caching the update. */
export async function writeUpdatedSecretsFile(
  secretsPath: string,
  updated: EncryptedSecretsFile,
  cache: SecretsFileCache,
): Promise<Result<true, string>> {
  try {
    await persistSecretsFile(secretsPath, updated);
    cache.file = updated;
    return { ok: true, value: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to write secrets file: ${message}` };
  }
}

/** Read raw secrets file text, returning an empty v1 file if missing. */
export async function readSecretsFileRaw(
  secretsPath: string,
): Promise<Result<string, EncryptedSecretsFile>> {
  try {
    return { ok: true, value: await Deno.readTextFile(secretsPath) };
  } catch {
    return { ok: false, error: { v: 1, entries: {} } };
  }
}

/** Parse raw JSON text into an unknown value. */
export function parseSecretsJson(
  raw: string,
  secretsPath: string,
): Result<unknown, string> {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return {
      ok: false,
      error: `Failed to parse secrets file: ${secretsPath}`,
    };
  }
}

/** Check if parsed JSON is a legacy flat format (no v/entries fields). */
export function isLegacySecretsFormat(parsed: unknown): boolean {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    !("v" in parsed) &&
    !("entries" in parsed)
  );
}

/** Validate that parsed JSON conforms to the v1 encrypted format. */
export function isValidSecretsFileFormat(parsed: unknown): boolean {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    (parsed as Record<string, unknown>)["v"] === 1 &&
    typeof (parsed as Record<string, unknown>)["entries"] === "object"
  );
}

/** Migrate a legacy flat JSON secrets file to encrypted v1 format. */
export async function migrateLegacySecretsFile(
  legacy: Record<string, string>,
  key: CryptoKey,
): Promise<Result<EncryptedSecretsFile, string>> {
  const entries: Record<string, EncryptedEntry> = {};
  for (const [name, value] of Object.entries(legacy)) {
    const result = await encryptSecretValue(key, value);
    if (!result.ok) {
      return {
        ok: false,
        error: `Migration failed for '${name}': ${result.error}`,
      };
    }
    entries[name] = result.value;
  }
  return { ok: true, value: { v: 1, entries } };
}

/** Handle legacy format migration: encrypt all plaintext entries. */
async function handleLegacyMigration(
  parsed: Record<string, string>,
  getKey: () => Promise<Result<CryptoKey, string>>,
  secretsPath: string,
  cache: SecretsFileCache,
): Promise<Result<EncryptedSecretsFile, string>> {
  const entryCount = Object.keys(parsed).length;
  log.warn("Migrating legacy plaintext secrets to encrypted format", {
    operation: "migrateSecrets",
    secretsPath,
    entryCount,
  });

  const keyResult = await getKey();
  if (!keyResult.ok) return { ok: false, error: keyResult.error };
  const migrated = await migrateLegacySecretsFile(parsed, keyResult.value);
  if (!migrated.ok) return migrated;

  // Write encrypted to a temp file first, then rename over the legacy
  // plaintext. This ensures the encrypted data is safely on disk before
  // the plaintext is removed — a crash between writes is recoverable.
  cache.file = migrated.value;
  const tmpPath = secretsPath + ".tmp";
  await persistSecretsFile(tmpPath, migrated.value);
  await Deno.rename(tmpPath, secretsPath);

  log.warn(
    "Secret rotation recommended after migration from plaintext storage",
    { operation: "migrateSecrets", secretsPath },
  );

  return { ok: true, value: migrated.value };
}

/** Classify parsed JSON and resolve it to an EncryptedSecretsFile. */
// deno-lint-ignore require-await
export async function classifyAndResolveSecretsJson(
  parsed: unknown,
  getKey: () => Promise<Result<CryptoKey, string>>,
  secretsPath: string,
  cache: SecretsFileCache,
): Promise<Result<EncryptedSecretsFile, string>> {
  if (isLegacySecretsFormat(parsed)) {
    return handleLegacyMigration(
      parsed as Record<string, string>,
      getKey,
      secretsPath,
      cache,
    );
  }
  if (!isValidSecretsFileFormat(parsed)) {
    return {
      ok: false,
      error: `Unrecognized secrets file format: ${secretsPath}`,
    };
  }
  cache.file = parsed as EncryptedSecretsFile;
  return { ok: true, value: cache.file };
}
