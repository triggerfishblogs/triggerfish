/**
 * DPAPI-backed secret store — file I/O and CRUD operations.
 *
 * Reads and writes encrypted secrets to `~/.triggerfish/dpapi_secrets.json`.
 * Each entry is a base64-encoded DPAPI ciphertext blob.
 *
 * @module
 */

import { dirname } from "@std/path";
import type { Result } from "../../types/classification.ts";
import type { SecretStore } from "../backends/secret_store.ts";
import { createLogger } from "../../logger/logger.ts";
import { protectSecret, unprotectSecret } from "./dpapi_crypto.ts";

const log = createLogger("secrets");

/** DPAPI secrets file format. */
interface DpapiSecretsFile {
  readonly v: 1;
  readonly entries: Record<string, string>;
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
    const isNotFound = err instanceof Deno.errors.NotFound;
    const level = isNotFound ? "debug" : "warn";
    log[level]("DPAPI secrets file unreadable, starting empty", {
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
  const result = await unprotectSecret(entry);
  if (!result.ok) {
    log.warn("DPAPI secret decryption failed", {
      operation: "dpapiGetSecret",
      name,
      err: result.error,
    });
  }
  return result;
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
export function buildDpapiSecretStore(secretsPath: string): SecretStore {
  return {
    getSecret: (name) => dpapiGetSecret(secretsPath, name),
    setSecret: (name, value) => dpapiSetSecret(secretsPath, name, value),
    deleteSecret: (name) => dpapiDeleteSecret(secretsPath, name),
    listSecrets: () => dpapiListSecrets(secretsPath),
  };
}
