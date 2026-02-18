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
import type { Result } from "../core/types/classification.ts";
import type { SecretStore } from "./keychain.ts";
import { loadOrCreateMachineKey } from "./key_manager.ts";

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

/**
 * Create an AES-256-GCM encrypted file-backed secret store.
 *
 * - Each entry is encrypted with a fresh random 12-byte IV on every write.
 * - The encryption key is derived from a machine-bound key file.
 * - On first access, a legacy plain-text JSON file is auto-migrated.
 * - The `SecretStore` interface is identical to other backends.
 *
 * @param options - Paths for the secrets file and key file
 * @returns A SecretStore backed by an AES-256-GCM encrypted JSON file
 */
export function createEncryptedFileSecretStore(
  options: EncryptedFileSecretStoreOptions,
): SecretStore {
  const { secretsPath, keyPath } = options;

  // Cached key — loaded once per store instance
  let cachedKey: CryptoKey | null = null;
  // Cached parsed file — invalidated on every write
  let cachedFile: EncryptedSecretsFile | null = null;

  async function getKey(): Promise<Result<CryptoKey, string>> {
    if (cachedKey !== null) {
      return { ok: true, value: cachedKey };
    }
    const result = await loadOrCreateMachineKey({ keyPath });
    if (result.ok) {
      cachedKey = result.value;
    }
    return result;
  }

  async function loadFile(): Promise<Result<EncryptedSecretsFile, string>> {
    if (cachedFile !== null) {
      return { ok: true, value: cachedFile };
    }

    let raw: string;
    try {
      raw = await Deno.readTextFile(secretsPath);
    } catch {
      // File does not exist — start with empty store
      const empty: EncryptedSecretsFile = { v: 1, entries: {} };
      cachedFile = empty;
      return { ok: true, value: empty };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: `Failed to parse secrets file: ${secretsPath}` };
    }

    // Detect and migrate legacy flat format: { "KEY": "plaintext-value" }
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      !("v" in parsed) &&
      !("entries" in parsed)
    ) {
      const keyResult = await getKey();
      if (!keyResult.ok) {
        return { ok: false, error: keyResult.error };
      }
      const migrated = await migrateLegacyFile(
        parsed as Record<string, string>,
        keyResult.value,
      );
      if (!migrated.ok) {
        return migrated;
      }
      cachedFile = migrated.value;
      await persistFile(migrated.value);
      console.log("Migrating secrets.json to encrypted format");
      return { ok: true, value: migrated.value };
    }

    // Validate v1 format
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      (parsed as Record<string, unknown>)["v"] !== 1 ||
      typeof (parsed as Record<string, unknown>)["entries"] !== "object"
    ) {
      return {
        ok: false,
        error: `Unrecognized secrets file format: ${secretsPath}`,
      };
    }

    cachedFile = parsed as EncryptedSecretsFile;
    return { ok: true, value: cachedFile };
  }

  async function persistFile(file: EncryptedSecretsFile): Promise<void> {
    await Deno.mkdir(dirname(secretsPath), { recursive: true });
    await Deno.writeTextFile(secretsPath, JSON.stringify(file, null, 2) + "\n");
    if (Deno.build.os !== "windows") {
      try {
        await Deno.chmod(secretsPath, 0o600);
      } catch {
        // Best-effort
      }
    }
  }

  async function encryptValue(
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
        value: {
          iv: toBase64(iv),
          ct: toBase64(new Uint8Array(ciphertext)),
        },
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, error: `Encryption failed: ${message}` };
    }
  }

  async function decryptEntry(
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

  async function migrateLegacyFile(
    legacy: Record<string, string>,
    key: CryptoKey,
  ): Promise<Result<EncryptedSecretsFile, string>> {
    const entries: Record<string, EncryptedEntry> = {};
    for (const [name, value] of Object.entries(legacy)) {
      const result = await encryptValue(key, value);
      if (!result.ok) {
        return { ok: false, error: `Migration failed for '${name}': ${result.error}` };
      }
      entries[name] = result.value;
    }
    return { ok: true, value: { v: 1, entries } };
  }

  return {
    async getSecret(name: string): Promise<Result<string, string>> {
      const fileResult = await loadFile();
      if (!fileResult.ok) {
        return { ok: false, error: fileResult.error };
      }

      const entry = fileResult.value.entries[name];
      if (entry === undefined) {
        return { ok: false, error: `Secret '${name}' not found in ${secretsPath}` };
      }

      const keyResult = await getKey();
      if (!keyResult.ok) {
        return { ok: false, error: keyResult.error };
      }

      return decryptEntry(keyResult.value, entry);
    },

    async setSecret(name: string, value: string): Promise<Result<true, string>> {
      const keyResult = await getKey();
      if (!keyResult.ok) {
        return { ok: false, error: keyResult.error };
      }

      const fileResult = await loadFile();
      if (!fileResult.ok) {
        return { ok: false, error: fileResult.error };
      }

      const encResult = await encryptValue(keyResult.value, value);
      if (!encResult.ok) {
        return { ok: false, error: encResult.error };
      }

      const updated: EncryptedSecretsFile = {
        v: 1,
        entries: {
          ...fileResult.value.entries,
          [name]: encResult.value,
        },
      };

      try {
        await persistFile(updated);
        cachedFile = updated;
        return { ok: true, value: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: `Failed to write secrets file: ${message}` };
      }
    },

    async deleteSecret(name: string): Promise<Result<true, string>> {
      const fileResult = await loadFile();
      if (!fileResult.ok) {
        return { ok: false, error: fileResult.error };
      }

      if (!(name in fileResult.value.entries)) {
        return { ok: false, error: `Secret '${name}' not found in ${secretsPath}` };
      }

      const newEntries = { ...fileResult.value.entries };
      delete newEntries[name];

      const updated: EncryptedSecretsFile = { v: 1, entries: newEntries };

      try {
        await persistFile(updated);
        cachedFile = updated;
        return { ok: true, value: true };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: `Failed to write secrets file: ${message}` };
      }
    },

    async listSecrets(): Promise<Result<string[], string>> {
      const fileResult = await loadFile();
      if (!fileResult.ok) {
        return { ok: false, error: fileResult.error };
      }
      return { ok: true, value: Object.keys(fileResult.value.entries) };
    },
  };
}
