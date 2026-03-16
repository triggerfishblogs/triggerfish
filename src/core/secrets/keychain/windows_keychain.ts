/**
 * Windows DPAPI secret store using PowerShell subprocess.
 *
 * Encrypts secrets with `System.Security.Cryptography.ProtectedData` (DPAPI),
 * binding them to the current Windows user's credentials. Encrypted blobs are
 * stored as base64 entries in a JSON file at `~/.triggerfish/dpapi_secrets.json`.
 *
 * Falls back to the AES-256-GCM encrypted-file store when DPAPI is unavailable
 * (e.g. headless containers, Windows Server Core without PowerShell).
 *
 * @module
 */

import { join } from "@std/path";
import type { Result } from "../../types/classification.ts";
import type { SecretStore } from "../backends/secret_store.ts";
import { createEncryptedFileSecretStore } from "../encrypted/encrypted_file_provider.ts";
import { createLogger } from "../../logger/logger.ts";
import { probeWindowsDpapi } from "./dpapi_crypto.ts";
import { buildDpapiSecretStore } from "./dpapi_store.ts";

export { probeWindowsDpapi } from "./dpapi_crypto.ts";

const log = createLogger("secrets");

/** Resolve the triggerfish data directory from env or default. */
export function resolveTriggerfishDataDir(): string {
  return Deno.env.get("TRIGGERFISH_DATA_DIR") ??
    join(
      Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? ".",
      ".triggerfish",
    );
}

/** Resolve the path for the DPAPI secrets JSON file. */
export function resolveDpapiSecretsPath(): string {
  return join(resolveTriggerfishDataDir(), "dpapi_secrets.json");
}

/** Resolve encrypted-file secret store paths for DPAPI fallback. */
function resolveEncryptedFilePaths(): {
  readonly secretsPath: string;
  readonly keyPath: string;
} {
  const dataDir = resolveTriggerfishDataDir();
  return {
    secretsPath: join(dataDir, "secrets.json"),
    keyPath: join(dataDir, "secrets.key"),
  };
}

/**
 * Build a dual-write SecretStore that stores in both DPAPI and encrypted-file.
 *
 * Writes go to both backends so secrets are available regardless of which
 * Windows user context reads them (interactive user vs LocalSystem service).
 * Reads try DPAPI first; if DPAPI unprotect fails (cross-user context),
 * falls back to the encrypted-file backend.
 */
function buildDualSecretStore(
  dpapiSecretsPath: string,
  filePaths: { readonly secretsPath: string; readonly keyPath: string },
): SecretStore {
  const dpapi = buildDpapiSecretStore(dpapiSecretsPath);
  const fileStore = createEncryptedFileSecretStore(filePaths);

  return {
    async getSecret(name: string): Promise<Result<string, string>> {
      const dpapiResult = await dpapi.getSecret(name);
      if (dpapiResult.ok) return dpapiResult;
      log.debug("DPAPI read failed, trying encrypted-file fallback", {
        name,
        dpapiError: dpapiResult.error,
      });
      return fileStore.getSecret(name);
    },

    async setSecret(
      name: string,
      value: string,
    ): Promise<Result<true, string>> {
      const dpapiResult = await dpapi.setSecret(name, value);
      const fileResult = await fileStore.setSecret(name, value);
      if (dpapiResult.ok) return dpapiResult;
      if (fileResult.ok) return fileResult;
      return {
        ok: false,
        error:
          `Both backends failed — DPAPI: ${dpapiResult.error}; file: ${fileResult.error}`,
      };
    },

    async deleteSecret(name: string): Promise<Result<true, string>> {
      const dpapiResult = await dpapi.deleteSecret(name);
      const fileResult = await fileStore.deleteSecret(name);
      if (dpapiResult.ok) return dpapiResult;
      if (fileResult.ok) return fileResult;
      return dpapiResult;
    },

    async listSecrets(): Promise<Result<string[], string>> {
      const dpapiResult = await dpapi.listSecrets();
      const fileResult = await fileStore.listSecrets();
      const dpapiNames = dpapiResult.ok ? dpapiResult.value : [];
      const fileNames = fileResult.ok ? fileResult.value : [];
      const merged = [...new Set([...dpapiNames, ...fileNames])];
      return { ok: true, value: merged };
    },
  };
}

/** Delegate a secret store method through the lazy-probed backend. */
async function delegateToBackend<T>(
  resolveBackend: () => Promise<SecretStore>,
  op: (store: SecretStore) => Promise<T>,
): Promise<T> {
  const store = await resolveBackend();
  return op(store);
}

/**
 * Detect whether we're running inside the Windows service wrapper.
 *
 * The C# service wrapper redirects stdout, so it is never a TTY.
 * Interactive sessions (terminal, dive wizard) always have a TTY.
 */
function isWindowsServiceContext(): boolean {
  return Deno.build.os === "windows" && !Deno.stdout.isTerminal();
}

/**
 * Create a Windows secret store with DPAPI encryption.
 *
 * **Service context** (daemon running under the C# service wrapper as
 * LocalSystem): uses the AES-256-GCM encrypted-file store directly.
 *
 * **Interactive context** (terminal, dive wizard): probes DPAPI. If
 * available, uses a dual-store. If DPAPI is unavailable, uses encrypted-file only.
 */
export function createWindowsKeychain(): SecretStore {
  const secretsPath = resolveDpapiSecretsPath();
  const filePaths = resolveEncryptedFilePaths();

  if (isWindowsServiceContext()) {
    log.info(
      "Windows service context — using encrypted-file backend directly " +
        "(skipping DPAPI: service runs as LocalSystem, cannot decrypt user-bound blobs)",
      { store: filePaths.secretsPath },
    );
    return createEncryptedFileSecretStore(filePaths);
  }

  let backendPromise: Promise<SecretStore> | null = null;

  /** Lazily probe DPAPI and cache the resulting store. */
  function resolveBackend(): Promise<SecretStore> {
    if (backendPromise !== null) return backendPromise;
    backendPromise = probeWindowsDpapi().then((available) => {
      if (available) {
        log.info(
          "DPAPI probe succeeded, using dual-store backend " +
            "(writes to both DPAPI and encrypted-file so the service can always read)",
          { dpapiStore: secretsPath, fileStore: filePaths.secretsPath },
        );
        return buildDualSecretStore(secretsPath, filePaths);
      }
      log.info(
        "DPAPI probe failed, falling back to encrypted-file backend " +
          "(headless, container, or Windows Server Core without PowerShell)",
      );
      return createEncryptedFileSecretStore(filePaths);
    });
    return backendPromise;
  }

  const delegate = <T>(op: (s: SecretStore) => Promise<T>) =>
    delegateToBackend(resolveBackend, op);

  return {
    getSecret: (name) => delegate((s) => s.getSecret(name)),
    setSecret: (name, value) => delegate((s) => s.setSecret(name, value)),
    deleteSecret: (name) => delegate((s) => s.deleteSecret(name)),
    listSecrets: () => delegate((s) => s.listSecrets()),
  };
}
