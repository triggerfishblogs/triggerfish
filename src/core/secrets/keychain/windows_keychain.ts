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

import { dirname, join } from "@std/path";
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
const PROTECT_SCRIPT = `Add-Type -AssemblyName System.Security; ` +
  `$bytes = [System.Text.Encoding]::UTF8.GetBytes($input); ` +
  `$enc = [System.Security.Cryptography.ProtectedData]::Protect(` +
  `$bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser); ` +
  `[Convert]::ToBase64String($enc)`;

/** PowerShell command to DPAPI-unprotect a base64 blob piped via stdin. */
const UNPROTECT_SCRIPT = `Add-Type -AssemblyName System.Security; ` +
  `$enc = [Convert]::FromBase64String($input); ` +
  `$dec = [System.Security.Cryptography.ProtectedData]::Unprotect(` +
  `$enc, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser); ` +
  `[System.Text.Encoding]::UTF8.GetString($dec)`;

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
    if (
      parsed.v === 1 && parsed.entries !== null &&
      typeof parsed.entries === "object"
    ) return parsed;
    return { v: 1, entries: {} };
  } catch (err) {
    log.debug("DPAPI secrets file unreadable, starting empty", {
      operation: "readDpapiSecretsFile",
      path,
      err,
    });
    return { v: 1, entries: {} };
  }
}

/** Write the DPAPI secrets JSON file to disk. */
async function writeDpapiSecretsFile(
  path: string,
  file: DpapiSecretsFile,
): Promise<Result<true, string>> {
  try {
    const dir = dirname(path);
    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(path, JSON.stringify(file, null, 2));
    return { ok: true, value: true };
  } catch (err: unknown) {
    log.error("DPAPI secrets file write failed", {
      operation: "writeDpapiSecretsFile",
      path,
      err,
    });
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `DPAPI secrets file write failed: ${message}`,
    };
  }
}

/** Retrieve a single DPAPI-encrypted secret by name. */
async function dpapiGetSecret(
  secretsPath: string,
  name: string,
): Promise<Result<string, string>> {
  log.debug("DPAPI secret read requested", { name });
  const file = await readDpapiSecretsFile(secretsPath);
  const entry = file.entries[name];
  if (entry === undefined) {
    log.warn("DPAPI secret not found", { name, store: secretsPath });
    return { ok: false, error: `Secret '${name}' not found in DPAPI store` };
  }
  return unprotectSecret(entry);
}

/** DPAPI-encrypt and persist a secret. */
async function dpapiSetSecret(
  secretsPath: string,
  name: string,
  value: string,
): Promise<Result<true, string>> {
  log.info("DPAPI secret write requested", { name, store: secretsPath });
  const protectResult = await protectSecret(value);
  if (!protectResult.ok) return { ok: false, error: protectResult.error };

  const file = await readDpapiSecretsFile(secretsPath);
  const updated: DpapiSecretsFile = {
    v: 1,
    entries: { ...file.entries, [name]: protectResult.value },
  };
  return writeDpapiSecretsFile(secretsPath, updated);
}

/** Remove a secret from the DPAPI store. */
async function dpapiDeleteSecret(
  secretsPath: string,
  name: string,
): Promise<Result<true, string>> {
  log.info("DPAPI secret delete requested", { name, store: secretsPath });
  const file = await readDpapiSecretsFile(secretsPath);
  if (!(name in file.entries)) {
    return { ok: false, error: `Secret '${name}' not found in DPAPI store` };
  }
  const newEntries = { ...file.entries };
  delete newEntries[name];
  return writeDpapiSecretsFile(secretsPath, { v: 1, entries: newEntries });
}

/** List all secret names in the DPAPI store. */
async function dpapiListSecrets(
  secretsPath: string,
): Promise<Result<string[], string>> {
  const file = await readDpapiSecretsFile(secretsPath);
  return { ok: true, value: Object.keys(file.entries) };
}

/** Build a SecretStore backed by DPAPI encryption. */
function buildDpapiSecretStore(secretsPath: string): SecretStore {
  return {
    getSecret: (name) => dpapiGetSecret(secretsPath, name),
    setSecret: (name, value) => dpapiSetSecret(secretsPath, name, value),
    deleteSecret: (name) => dpapiDeleteSecret(secretsPath, name),
    listSecrets: () => dpapiListSecrets(secretsPath),
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
      // Write to both backends — DPAPI for interactive use, encrypted-file
      // for Windows service (LocalSystem) which can't decrypt DPAPI blobs
      // encrypted by the interactive user.
      const dpapiResult = await dpapi.setSecret(name, value);
      const fileResult = await fileStore.setSecret(name, value);
      // Return success if at least one backend succeeded
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
 * DPAPI is user-bound — LocalSystem cannot decrypt blobs encrypted by the
 * interactive user — so we skip the probe entirely. The encrypted-file
 * store is a plain file on disk, accessible from any user context, and
 * was the original backend before DPAPI was introduced (migration preserves
 * those files as backups).
 *
 * **Interactive context** (terminal, dive wizard): probes DPAPI. If
 * available, uses a dual-store — writes go to both DPAPI and the
 * encrypted-file backend so secrets are always readable by the service.
 * If DPAPI is unavailable (headless/container), uses encrypted-file only.
 *
 * This keeps `createKeychain()` synchronous while supporting async DPAPI probing.
 */
export function createWindowsKeychain(): SecretStore {
  const secretsPath = resolveDpapiSecretsPath();
  const filePaths = resolveEncryptedFilePaths();

  // In the service context, skip DPAPI entirely. The service runs as
  // LocalSystem and cannot decrypt secrets encrypted by the interactive user.
  // The encrypted-file store is file-based and accessible from any user context.
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
