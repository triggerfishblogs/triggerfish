/**
 * AES-256-GCM encrypted file-backed secret store.
 *
 * @module
 */

export { createEncryptedFileSecretStore } from "./encrypted_file_provider.ts";
export type { EncryptedFileSecretStoreOptions } from "./encrypted_file_types.ts";
export {
  decryptSecretEntry,
  encryptSecretValue,
  fromBase64,
  toBase64,
} from "./encrypted_file_crypto.ts";
export type {
  EncryptedEntry,
  EncryptedSecretsFile,
  SecretsFileCache,
} from "./encrypted_file_types.ts";
export {
  classifyAndResolveSecretsJson,
  isLegacySecretsFormat,
  isValidSecretsFileFormat,
  migrateLegacySecretsFile,
  parseSecretsJson,
  persistSecretsFile,
  readSecretsFileRaw,
  writeUpdatedSecretsFile,
} from "./encrypted_file_io.ts";
