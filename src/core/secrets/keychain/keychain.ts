/**
 * OS keychain factory — detects platform and returns the appropriate backend.
 *
 * Re-exports the {@link SecretStore} interface and
 * {@link createMemorySecretStore} for convenience, so existing
 * importers that reference `./keychain.ts` continue to work.
 *
 * @module
 */

import { isDockerEnvironment } from "../../env.ts";
import { createEncryptedFileSecretStore } from "../encrypted/encrypted_file_provider.ts";
import { createLinuxKeychain } from "./linux_keychain.ts";
import { createMacKeychain } from "./mac_keychain.ts";
import { createWindowsKeychain } from "./windows_keychain.ts";
import { createMemorySecretStore } from "../backends/memory_store.ts";
import type { SecretStore } from "../backends/secret_store.ts";
import { createLogger } from "../../logger/logger.ts";

const log = createLogger("secrets");

// Re-export so existing `import … from "./keychain.ts"` sites compile.
export { createMemorySecretStore } from "../backends/memory_store.ts";
export type { SecretStore } from "../backends/secret_store.ts";

/** Create a store that rejects all operations for unsupported platforms. */
function createRejectingSecretStore(os: string): SecretStore {
  const reason =
    `Unsupported OS '${os}' for secrets storage. ` +
    "Set TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true to use an " +
    "in-memory store (secrets will not persist across restarts).";
  return {
    getSecret: () => Promise.resolve({ ok: false, error: reason }),
    setSecret: () => Promise.resolve({ ok: false, error: reason }),
    deleteSecret: () => Promise.resolve({ ok: false, error: reason }),
    listSecrets: () => Promise.resolve({ ok: false, error: reason }),
  };
}

/**
 * Resolve the Docker encryption key path.
 *
 * Uses `TRIGGERFISH_KEY_PATH` env var if set, otherwise defaults to
 * `/data/secrets.key` (co-located with secrets file).
 */
export function resolveDockerKeyPath(): string {
  return Deno.env.get("TRIGGERFISH_KEY_PATH") ?? "/data/secrets.key";
}

/** Select the secret backend for Docker environments. */
function createDockerSecretStore(): SecretStore {
  const keyPath = resolveDockerKeyPath();
  log.info("Secret backend selected: encrypted-file (Docker)", { keyPath });
  return createEncryptedFileSecretStore({
    secretsPath: "/data/secrets.json",
    keyPath,
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
      log.info("Secret backend selected: DPAPI with encrypted-file fallback (Windows)");
      return createWindowsKeychain();
    default: {
      const allowMemory = Deno.env.get(
        "TRIGGERFISH_SECRETS_MEMORY_FALLBACK",
      );
      if (allowMemory === "true" || allowMemory === "1") {
        log.warn(
          "Secret backend selected: in-memory (unsupported OS, explicit opt-in)",
          { os },
        );
        return createMemorySecretStore();
      }
      log.error("Secret backend selection failed — unsupported OS", { os });
      return createRejectingSecretStore(os);
    }
  }
}

/**
 * Detect the current OS and return the appropriate keychain backend.
 *
 * - Docker: encrypted-file store at /data/
 * - Linux: `secret-tool` (libsecret / GNOME Keyring)
 * - macOS: `security` CLI (Keychain Access)
 * - Windows: DPAPI (PowerShell) with encrypted-file fallback
 * - Other: in-memory fallback
 *
 * @returns A SecretStore implementation appropriate for the current OS
 */
export function createKeychain(): SecretStore {
  if (isDockerEnvironment()) return createDockerSecretStore();
  return selectNativeSecretStore();
}
