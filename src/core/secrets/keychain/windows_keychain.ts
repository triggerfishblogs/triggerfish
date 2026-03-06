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
import { runCommand } from "./command_runner.ts";

const log = createLogger("secrets");

/** DPAPI secrets file format. */
interface DpapiSecretsFile {
  readonly v: 1;
  readonly entries: Record<string, string>;
}

/** PowerShell command to DPAPI-protect a value piped via stdin. */
const PROTECT_SCRIPT =
  `Add-Type -AssemblyName System.Security; ` +
  `$bytes = [System.Text.Encoding]::UTF8.GetBytes($input); ` +
  `$enc = [System.Security.Cryptography.ProtectedData]::Protect(` +
  `$bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser); ` +
  `[Convert]::ToBase64String($enc)`;

/** PowerShell command to DPAPI-unprotect a base64 blob piped via stdin. */
const UNPROTECT_SCRIPT =
  `Add-Type -AssemblyName System.Security; ` +
  `$enc = [Convert]::FromBase64String($input); ` +
  `$dec = [System.Security.Cryptography.ProtectedData]::Unprotect(` +
  `$enc, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser); ` +
  `[System.Text.Encoding]::UTF8.GetString($dec)`;

/** Resolve the path for the DPAPI secrets JSON file. */
export function resolveDpapiSecretsPath(): string {
  const dataDir = Deno.env.get("TRIGGERFISH_DATA_DIR") ??
    join(
      Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? ".",
      ".triggerfish",
    );
  return join(dataDir, "dpapi_secrets.json");
}

/** Resolve encrypted-file secret store paths for DPAPI fallback. */
function resolveEncryptedFilePaths(): {
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

/** Probe whether DPAPI is available by running a trivial protect/unprotect cycle. */
export async function probeWindowsDpapi(): Promise<boolean> {
  const protectResult = await runCommand(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", PROTECT_SCRIPT],
    "dpapi-probe-test",
  );
  if (!protectResult.ok) return false;

  const unprotectResult = await runCommand(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", UNPROTECT_SCRIPT],
    protectResult.value,
  );
  if (!unprotectResult.ok) return false;

  return unprotectResult.value === "dpapi-probe-test";
}

/** DPAPI-encrypt a secret value via PowerShell. */
async function protectSecret(value: string): Promise<Result<string, string>> {
  const result = await runCommand(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", PROTECT_SCRIPT],
    value,
  );
  if (!result.ok) {
    return {
      ok: false,
      error: `DPAPI protect failed: ${result.error}`,
    };
  }
  return { ok: true, value: result.value };
}

/** DPAPI-decrypt a base64 ciphertext blob via PowerShell. */
async function unprotectSecret(
  base64Ciphertext: string,
): Promise<Result<string, string>> {
  const result = await runCommand(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-Command", UNPROTECT_SCRIPT],
    base64Ciphertext,
  );
  if (!result.ok) {
    return {
      ok: false,
      error: `DPAPI unprotect failed: ${result.error}`,
    };
  }
  return { ok: true, value: result.value };
}

/** Read the DPAPI secrets JSON file from disk. */
async function readDpapiSecretsFile(
  path: string,
): Promise<DpapiSecretsFile> {
  try {
    const raw = await Deno.readTextFile(path);
    const parsed = JSON.parse(raw) as DpapiSecretsFile;
    if (parsed.v === 1 && typeof parsed.entries === "object") return parsed;
    return { v: 1, entries: {} };
  } catch {
    return { v: 1, entries: {} };
  }
}

/** Write the DPAPI secrets JSON file to disk. */
async function writeDpapiSecretsFile(
  path: string,
  file: DpapiSecretsFile,
): Promise<Result<true, string>> {
  try {
    const dir = path.substring(0, path.lastIndexOf(Deno.build.os === "windows" ? "\\" : "/"));
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(path, JSON.stringify(file, null, 2));
    return { ok: true, value: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `DPAPI secrets file write failed: ${message}`,
    };
  }
}

/** Build a SecretStore backed by DPAPI encryption. */
function buildDpapiSecretStore(secretsPath: string): SecretStore {
  return {
    async getSecret(name: string): Promise<Result<string, string>> {
      log.debug("DPAPI secret read requested", { name });
      const file = await readDpapiSecretsFile(secretsPath);
      const entry = file.entries[name];
      if (entry === undefined) {
        log.warn("DPAPI secret not found", { name, store: secretsPath });
        return {
          ok: false,
          error: `Secret '${name}' not found in DPAPI store`,
        };
      }
      return unprotectSecret(entry);
    },

    async setSecret(
      name: string,
      value: string,
    ): Promise<Result<true, string>> {
      log.warn("DPAPI secret write requested", { name, store: secretsPath });
      const protectResult = await protectSecret(value);
      if (!protectResult.ok) return { ok: false, error: protectResult.error };

      const file = await readDpapiSecretsFile(secretsPath);
      const updated: DpapiSecretsFile = {
        v: 1,
        entries: { ...file.entries, [name]: protectResult.value },
      };
      return writeDpapiSecretsFile(secretsPath, updated);
    },

    async deleteSecret(name: string): Promise<Result<true, string>> {
      log.warn("DPAPI secret delete requested", { name, store: secretsPath });
      const file = await readDpapiSecretsFile(secretsPath);
      if (!(name in file.entries)) {
        return {
          ok: false,
          error: `Secret '${name}' not found in DPAPI store`,
        };
      }
      const newEntries = { ...file.entries };
      delete newEntries[name];
      return writeDpapiSecretsFile(secretsPath, { v: 1, entries: newEntries });
    },

    async listSecrets(): Promise<Result<string[], string>> {
      const file = await readDpapiSecretsFile(secretsPath);
      return { ok: true, value: Object.keys(file.entries) };
    },
  };
}

/**
 * Backend state: tracks whether DPAPI is available.
 *
 * Probed lazily on the first secret operation. If DPAPI is unavailable,
 * all subsequent calls are routed to the encrypted-file fallback.
 */
interface WindowsBackendState {
  probed: boolean;
  dpapiAvailable: boolean;
  activeStore: SecretStore | null;
}

/** Ensure the backend has been probed and the active store is selected. */
async function ensureBackendReady(
  state: WindowsBackendState,
  secretsPath: string,
): Promise<SecretStore> {
  if (state.activeStore !== null) return state.activeStore;

  const available = await probeWindowsDpapi();
  state.probed = true;
  state.dpapiAvailable = available;

  if (available) {
    log.info("DPAPI probe succeeded, using DPAPI backend", {
      store: secretsPath,
    });
    state.activeStore = buildDpapiSecretStore(secretsPath);
  } else {
    log.info(
      "DPAPI probe failed, falling back to encrypted-file backend " +
        "(headless, container, or Windows Server Core without PowerShell)",
    );
    state.activeStore = createEncryptedFileSecretStore(
      resolveEncryptedFilePaths(),
    );
  }
  return state.activeStore;
}

/**
 * Create a Windows secret store with DPAPI encryption.
 *
 * On first operation, probes whether DPAPI is available via PowerShell.
 * If available, secrets are DPAPI-encrypted and stored in `dpapi_secrets.json`.
 * If unavailable, falls back to the AES-256-GCM encrypted-file store.
 *
 * This keeps `createKeychain()` synchronous while supporting async DPAPI probing.
 */
export function createWindowsKeychain(): SecretStore {
  const secretsPath = resolveDpapiSecretsPath();
  const state: WindowsBackendState = {
    probed: false,
    dpapiAvailable: false,
    activeStore: null,
  };

  return {
    async getSecret(name: string): Promise<Result<string, string>> {
      const store = await ensureBackendReady(state, secretsPath);
      return store.getSecret(name);
    },
    async setSecret(
      name: string,
      value: string,
    ): Promise<Result<true, string>> {
      const store = await ensureBackendReady(state, secretsPath);
      return store.setSecret(name, value);
    },
    async deleteSecret(name: string): Promise<Result<true, string>> {
      const store = await ensureBackendReady(state, secretsPath);
      return store.deleteSecret(name);
    },
    async listSecrets(): Promise<Result<string[], string>> {
      const store = await ensureBackendReady(state, secretsPath);
      return store.listSecrets();
    },
  };
}
