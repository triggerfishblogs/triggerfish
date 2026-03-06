/**
 * OS keychain factory — detects platform and returns the appropriate backend.
 *
 * Re-exports the {@link SecretStore} interface and
 * {@link createMemorySecretStore} for convenience, so existing
 * importers that reference `./keychain.ts` continue to work.
 *
 * @module
 */

import { join } from "@std/path";
import { isDockerEnvironment } from "../../env.ts";
import { createEncryptedFileSecretStore } from "../encrypted/encrypted_file_provider.ts";
import { createLinuxKeychain } from "./linux_keychain.ts";
import { createMacKeychain } from "./mac_keychain.ts";
import { createMemorySecretStore } from "../backends/memory_store.ts";
import type { SecretStore } from "../backends/secret_store.ts";
import { createLogger } from "../../logger/logger.ts";

const log = createLogger("secrets");

// Re-export so existing `import … from "./keychain.ts"` sites compile.
export { createMemorySecretStore } from "../backends/memory_store.ts";
export type { SecretStore } from "../backends/secret_store.ts";

/** Resolve encrypted-file secret store paths for Windows. */
function resolveWindowsSecretStorePaths(): {
  readonly secretsPath: string;
  readonly keyPath: string;
} {
  const dataDir = Deno.env.get("TRIGGERFISH_DATA_DIR") ??
    join(
      Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? ".",
      ".triggerfish",
    );
  return {
    secretsPath: join(dataDir, "secrets.json"),
    keyPath: join(dataDir, "secrets.key"),
  };
}

/** Select the secret backend for Docker environments. */
function createDockerSecretStore(): SecretStore {
  log.info("Secret backend selected: encrypted-file (Docker)");
  return createEncryptedFileSecretStore({
    secretsPath: "/data/secrets.json",
    keyPath: "/data/secrets.key",
  });
}

/** Select the secret backend based on the host operating system. */
function selectNativeSecretStore(): SecretStore {
  const os = Deno.build.os;
  switch (os) {
    case "linux":
      log.info("Secret backend selected: libsecret (Linux)");
      return createLinuxKeychain();
    case "darwin":
      log.info("Secret backend selected: Keychain (macOS)");
      return createMacKeychain();
    case "windows":
      log.info("Secret backend selected: encrypted-file (Windows)");
      return createEncryptedFileSecretStore(resolveWindowsSecretStorePaths());
    default:
      log.warn(
        "Secret backend selected: in-memory (unsupported OS — secrets will not persist)",
        { os },
      );
      return createMemorySecretStore();
  }
}

/**
 * Detect the current OS and return the appropriate keychain backend.
 *
 * - Docker: encrypted-file store at /data/
 * - Linux: `secret-tool` (libsecret / GNOME Keyring)
 * - macOS: `security` CLI (Keychain Access)
 * - Windows: encrypted-file store in TRIGGERFISH_DATA_DIR
 * - Other: in-memory fallback
 *
 * @returns A SecretStore implementation appropriate for the current OS
 */
export function createKeychain(): SecretStore {
  if (isDockerEnvironment()) return createDockerSecretStore();
  return selectNativeSecretStore();
}
