/**
 * Types and interfaces for the AES-256-GCM encrypted file secret store.
 *
 * Defines the on-disk format (v1), individual encrypted entries,
 * and configuration options for store creation.
 *
 * @module
 */

/** Options for creating an encrypted file-backed secret store. */
export interface EncryptedFileSecretStoreOptions {
  /** Path to the encrypted secrets JSON file. */
  readonly secretsPath: string;
  /** Path to the companion key file (32 raw bytes). */
  readonly keyPath: string;
}

/** An encrypted entry in the secrets file. */
export interface EncryptedEntry {
  /** Base64-encoded 12-byte IV. */
  readonly iv: string;
  /** Base64-encoded AES-GCM ciphertext + 16-byte auth tag. */
  readonly ct: string;
}

/** The on-disk format for the encrypted secrets file (version 1). */
export interface EncryptedSecretsFile {
  readonly v: 1;
  readonly entries: Record<string, EncryptedEntry>;
}

/** Mutable cache wrapper for the loaded secrets file. */
export interface SecretsFileCache {
  file: EncryptedSecretsFile | null;
}
