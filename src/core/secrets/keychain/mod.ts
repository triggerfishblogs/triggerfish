/**
 * OS keychain integration: platform detection, Linux libsecret, macOS Keychain,
 * Windows DPAPI.
 *
 * @module
 */

export { createKeychain, resolveDockerKeyPath } from "./keychain.ts";
export { createLinuxKeychain } from "./linux_keychain.ts";
export { createMacKeychain } from "./mac_keychain.ts";
export { createWindowsKeychain } from "./windows_keychain.ts";
export { migrateEncryptedFileToDpapi } from "./windows_migration.ts";
export { runCommand } from "./command_runner.ts";
