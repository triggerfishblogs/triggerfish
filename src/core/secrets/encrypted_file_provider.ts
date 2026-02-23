/**
 * AES-256-GCM encrypted file-backed secret store.
 *
 * Stores secrets in a JSON file where each entry's value is encrypted
 * independently with a fresh 12-byte IV. The encryption key is loaded
 * from a companion key file via {@link loadOrCreateMachineKey}.
 *
 * File format (v1):
 * ```json
 * {
 *   "v": 1,
 *   "entries": {
 *     "MY_SECRET": { "iv": "<base64-12-bytes>", "ct": "<base64-ciphertext>" }
 *   }
 * }
 * ```
 *
 * Secret names are stored in plaintext (keys); only values are encrypted.
 *
 * On first load, if the file contains a legacy flat `Record<string, string>`
 * format, it is automatically migrated to the encrypted v1 format.
 *
 * @module
 */

import { dirname } from "@std/path";
import type { Result } from "../types/classification.ts";
import type { SecretStore } from "./secret_store.ts";
import { loadOrCreateMachineKey } from "./key_manager.ts";
import { createLogger } from "../logger/logger.ts";

const log = createLogger("secrets");

/** Options for creating an encrypted file-backed secret store. */
export interface EncryptedFileSecretStoreOptions {
  /** Path to the encrypted secrets JSON file. */
  readonly secretsPath: string;
  /** Path to the companion key file (32 raw bytes). */
  readonly keyPath: string;
}

/** An encrypted entry in the secrets file. */
interface EncryptedEntry {
  /** Base64-encoded 12-byte IV. */
  readonly iv: string;
  /** Base64-encoded AES-GCM ciphertext + 16-byte auth tag. */
  readonly ct: string;
}

/** The on-disk format for the encrypted secrets file (version 1). */
interface EncryptedSecretsFile {
  readonly v: 1;
  readonly entries: Record<string, EncryptedEntry>;
}

/** Encode a Uint8Array to base64 string. */
function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** Decode a base64 string to Uint8Array. */
function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Persist an encrypted secrets file to disk with restrictive permissions. */
async function persistSecretsFile(
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

/** Encrypt a plaintext value with AES-256-GCM using a fresh 12-byte IV. */
async function encryptSecretValue(
  key: CryptoKey,
  plaintext: string,
): Promise<Result<EncryptedEntry, string>> {
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encoded,
    );
    return {
      ok: true,
      value: { iv: toBase64(iv), ct: toBase64(new Uint8Array(ciphertext)) },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Encryption failed: ${message}` };
  }
}

/** Decrypt an AES-256-GCM encrypted entry back to plaintext. */
async function decryptSecretEntry(
  key: CryptoKey,
  entry: EncryptedEntry,
): Promise<Result<string, string>> {
  try {
    const iv = fromBase64(entry.iv);
    const ct = fromBase64(entry.ct);
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv.buffer as ArrayBuffer },
      key,
      ct.buffer as ArrayBuffer,
    );
    return { ok: true, value: new TextDecoder().decode(plaintext) };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Decryption failed: ${message}` };
  }
}

/** Migrate a legacy flat JSON secrets file to encrypted v1 format. */
async function migrateLegacySecretsFile(
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

/** Check if parsed JSON is a legacy flat format (no v/entries fields). */
function isLegacySecretsFormat(parsed: unknown): boolean {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    !("v" in parsed) &&
    !("entries" in parsed)
  );
}

/** Validate that parsed JSON conforms to the v1 encrypted format. */
function isValidSecretsFileFormat(parsed: unknown): boolean {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    (parsed as Record<string, unknown>)["v"] === 1 &&
    typeof (parsed as Record<string, unknown>)["entries"] === "object"
  );
}

/** Write an updated secrets file and return success, caching the update. */
async function writeUpdatedSecretsFile(
  secretsPath: string,
  updated: EncryptedSecretsFile,
  cache: { file: EncryptedSecretsFile | null },
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
async function readSecretsFileRaw(
  secretsPath: string,
): Promise<Result<string, EncryptedSecretsFile>> {
  try {
    return { ok: true, value: await Deno.readTextFile(secretsPath) };
  } catch {
    return { ok: false, error: { v: 1, entries: {} } };
  }
}

/** Parse raw JSON text into an unknown value. */
function parseSecretsJson(
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

/** Handle legacy format migration: encrypt all plaintext entries. */
async function handleLegacyMigration(
  parsed: Record<string, string>,
  getKey: () => Promise<Result<CryptoKey, string>>,
  secretsPath: string,
  cache: { file: EncryptedSecretsFile | null },
): Promise<Result<EncryptedSecretsFile, string>> {
  const keyResult = await getKey();
  if (!keyResult.ok) return { ok: false, error: keyResult.error };
  const migrated = await migrateLegacySecretsFile(parsed, keyResult.value);
  if (!migrated.ok) return migrated;
  cache.file = migrated.value;
  await persistSecretsFile(secretsPath, migrated.value);
  console.log("Migrating secrets.json to encrypted format");
  return { ok: true, value: migrated.value };
}

/** Classify parsed JSON and resolve it to an EncryptedSecretsFile. */
async function classifyAndResolveSecretsJson(
  parsed: unknown,
  getKey: () => Promise<Result<CryptoKey, string>>,
  secretsPath: string,
  cache: { file: EncryptedSecretsFile | null },
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

/**
 * Create an AES-256-GCM encrypted file-backed secret store.
 *
 * - Each entry is encrypted with a fresh random 12-byte IV on every write.
 * - The encryption key is derived from a machine-bound key file.
 * - On first access, a legacy plain-text JSON file is auto-migrated.
 * - The `SecretStore` interface is identical to other backends.
 */
export function createEncryptedFileSecretStore(
  options: EncryptedFileSecretStoreOptions,
): SecretStore {
  const { secretsPath, keyPath } = options;
  let cachedKey: CryptoKey | null = null;
  const cache: { file: EncryptedSecretsFile | null } = { file: null };

  async function getKey(): Promise<Result<CryptoKey, string>> {
    if (cachedKey !== null) return { ok: true, value: cachedKey };
    const result = await loadOrCreateMachineKey({ keyPath });
    if (result.ok) cachedKey = result.value;
    return result;
  }

  async function loadFile(): Promise<Result<EncryptedSecretsFile, string>> {
    if (cache.file !== null) return { ok: true, value: cache.file };
    const rawResult = await readSecretsFileRaw(secretsPath);
    if (!rawResult.ok) {
      cache.file = rawResult.error;
      return { ok: true, value: cache.file };
    }
    const jsonResult = parseSecretsJson(rawResult.value, secretsPath);
    if (!jsonResult.ok) return jsonResult;
    return classifyAndResolveSecretsJson(
      jsonResult.value,
      getKey,
      secretsPath,
      cache,
    );
  }

  return {
    async getSecret(name: string): Promise<Result<string, string>> {
      log.debug("Secret read requested", { name });
      const fileResult = await loadFile();
      if (!fileResult.ok) return { ok: false, error: fileResult.error };
      const entry = fileResult.value.entries[name];
      if (entry === undefined) {
        log.warn("Secret not found", { name, store: secretsPath });
        return {
          ok: false,
          error: `Secret '${name}' not found in ${secretsPath}`,
        };
      }
      const keyResult = await getKey();
      if (!keyResult.ok) return { ok: false, error: keyResult.error };
      return decryptSecretEntry(keyResult.value, entry);
    },

    async setSecret(
      name: string,
      value: string,
    ): Promise<Result<true, string>> {
      log.warn("Secret write requested", { name, store: secretsPath });
      const keyResult = await getKey();
      if (!keyResult.ok) return { ok: false, error: keyResult.error };
      const fileResult = await loadFile();
      if (!fileResult.ok) return { ok: false, error: fileResult.error };
      const encResult = await encryptSecretValue(keyResult.value, value);
      if (!encResult.ok) return { ok: false, error: encResult.error };
      const updated: EncryptedSecretsFile = {
        v: 1,
        entries: { ...fileResult.value.entries, [name]: encResult.value },
      };
      return writeUpdatedSecretsFile(secretsPath, updated, cache);
    },

    async deleteSecret(name: string): Promise<Result<true, string>> {
      log.warn("Secret delete requested", { name, store: secretsPath });
      const fileResult = await loadFile();
      if (!fileResult.ok) return { ok: false, error: fileResult.error };
      if (!(name in fileResult.value.entries)) {
        return {
          ok: false,
          error: `Secret '${name}' not found in ${secretsPath}`,
        };
      }
      const newEntries = { ...fileResult.value.entries };
      delete newEntries[name];
      return writeUpdatedSecretsFile(
        secretsPath,
        { v: 1, entries: newEntries },
        cache,
      );
    },

    async listSecrets(): Promise<Result<string[], string>> {
      const fileResult = await loadFile();
      if (!fileResult.ok) return { ok: false, error: fileResult.error };
      return { ok: true, value: Object.keys(fileResult.value.entries) };
    },
  };
}
