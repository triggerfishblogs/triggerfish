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

import type { Result } from "../../types/classification.ts";
import type { SecretStore } from "../backends/secret_store.ts";
import { loadOrCreateMachineKey } from "../backends/key_manager.ts";
import { createLogger } from "../../logger/logger.ts";
import type {
  EncryptedFileSecretStoreOptions,
  EncryptedSecretsFile,
  SecretsFileCache,
} from "./encrypted_file_types.ts";
import { decryptSecretEntry, encryptSecretValue } from "./encrypted_file_crypto.ts";
import {
  classifyAndResolveSecretsJson,
  parseSecretsJson,
  readSecretsFileRaw,
  writeUpdatedSecretsFile,
} from "./encrypted_file_io.ts";

export type { EncryptedFileSecretStoreOptions } from "./encrypted_file_types.ts";

const log = createLogger("secrets");

/** Load the encryption key, caching it after the first successful load. */
async function resolveEncryptionKey(
  keyPath: string,
  cached: { key: CryptoKey | null },
): Promise<Result<CryptoKey, string>> {
  if (cached.key !== null) return { ok: true, value: cached.key };
  const result = await loadOrCreateMachineKey({ keyPath });
  if (result.ok) cached.key = result.value;
  return result;
}

/** Load and cache the encrypted secrets file from disk. */
async function loadSecretsFile(
  secretsPath: string,
  getKey: () => Promise<Result<CryptoKey, string>>,
  cache: SecretsFileCache,
): Promise<Result<EncryptedSecretsFile, string>> {
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
  const keyCache: { key: CryptoKey | null } = { key: null };
  const fileCache: SecretsFileCache = { file: null };

  const getKey = () => resolveEncryptionKey(keyPath, keyCache);
  const loadFile = () => loadSecretsFile(secretsPath, getKey, fileCache);

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
      return writeUpdatedSecretsFile(secretsPath, updated, fileCache);
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
        fileCache,
      );
    },

    async listSecrets(): Promise<Result<string[], string>> {
      const fileResult = await loadFile();
      if (!fileResult.ok) return { ok: false, error: fileResult.error };
      return { ok: true, value: Object.keys(fileResult.value.entries) };
    },
  };
}
