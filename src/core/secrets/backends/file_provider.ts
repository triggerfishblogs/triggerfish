/**
 * File-backed secret store.
 *
 * Reads and writes secrets from a JSON or .env file on disk.
 * Auto-detects format from file extension. Validates file
 * permissions (0600) on Linux/macOS.
 *
 * @module
 */

import { dirname } from "@std/path";
import type { Result } from "../../types/classification.ts";
import type { SecretStore } from "./secret_store.ts";
import { createLogger } from "../../logger/logger.ts";

const log = createLogger("secrets");

/** Options for creating a file-backed secret store. */
export interface FileSecretStoreOptions {
  /** Path to the secrets file (.json or .env). */
  readonly path: string;
}

/** Strip matching surrounding quotes (single or double) from a value. */
function stripEnvQuotes(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Parse a .env file into key-value pairs.
 *
 * Handles comments (#), blank lines, optional quoting, and inline comments.
 */
function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const rawValue = trimmed.slice(eqIdx + 1).trim();
    result[key] = stripEnvQuotes(rawValue);
  }
  return result;
}

/**
 * Serialize key-value pairs to .env format.
 */
function serializeEnvFile(data: Record<string, string>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    // Quote values that contain spaces or special characters
    if (value.includes(" ") || value.includes("=") || value.includes("#")) {
      lines.push(`${key}="${value}"`);
    } else {
      lines.push(`${key}=${value}`);
    }
  }
  return lines.join("\n") + "\n";
}

/**
 * Detect file format from extension.
 */
function detectFormat(path: string): "json" | "env" {
  if (path.endsWith(".json")) {
    return "json";
  }
  return "env";
}

/**
 * Check file permissions on Linux/macOS. Warns if not 0600.
 */
function checkPermissions(path: string): void {
  if (Deno.build.os === "windows") {
    return;
  }
  try {
    const stat = Deno.statSync(path);
    if (stat.mode !== null && stat.mode !== undefined) {
      const perms = stat.mode & 0o777;
      if (perms !== 0o600) {
        log.warn("Secret file permissions too open", {
          operation: "checkPermissions",
          path,
          perms: perms.toString(8),
        });
      }
    }
  } catch {
    // File may not exist yet
  }
}

/**
 * Create a file-backed secret store.
 *
 * Supports `.json` and `.env` formats (auto-detected from extension).
 * Lazy-loads the file on first access and caches in memory.
 * Validates file permissions (0600) on Linux/macOS, skips on Windows.
 *
 * @param options - Configuration for the file store
 * @returns A SecretStore backed by a file on disk
 */
export function createFileSecretStore(
  options: FileSecretStoreOptions,
): SecretStore {
  const { path } = options;
  const format = detectFormat(path);
  let cache: Record<string, string> | null = null;

  function loadCache(): Record<string, string> {
    if (cache !== null) {
      return cache;
    }

    checkPermissions(path);

    try {
      const content = Deno.readTextFileSync(path);
      if (format === "json") {
        cache = JSON.parse(content) as Record<string, string>;
      } else {
        cache = parseEnvFile(content);
      }
    } catch {
      cache = {};
    }
    return cache;
  }

  function writeBack(): void {
    const data = cache ?? {};
    let content: string;
    if (format === "json") {
      content = JSON.stringify(data, null, 2) + "\n";
    } else {
      content = serializeEnvFile(data);
    }
    Deno.mkdirSync(dirname(path), { recursive: true });
    Deno.writeTextFileSync(path, content);

    // Set restrictive permissions on Linux/macOS
    if (Deno.build.os !== "windows") {
      try {
        Deno.chmodSync(path, 0o600);
      } catch {
        // May not have permission to chmod
      }
    }
  }

  return {
    getSecret(name: string): Promise<Result<string, string>> {
      const data = loadCache();
      const value = data[name];
      if (value === undefined) {
        return Promise.resolve({
          ok: false,
          error: `Secret '${name}' not found in ${path}`,
        });
      }
      return Promise.resolve({ ok: true, value });
    },

    setSecret(name: string, value: string): Promise<Result<true, string>> {
      log.warn("Secret write requested", { name, store: path });
      const data = loadCache();
      data[name] = value;
      try {
        writeBack();
        return Promise.resolve({ ok: true, value: true });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return Promise.resolve({
          ok: false,
          error: `Failed to write secrets file: ${message}`,
        });
      }
    },

    deleteSecret(name: string): Promise<Result<true, string>> {
      log.warn("Secret delete requested", { name, store: path });
      const data = loadCache();
      if (!(name in data)) {
        return Promise.resolve({
          ok: false,
          error: `Secret '${name}' not found in ${path}`,
        });
      }
      delete data[name];
      try {
        writeBack();
        return Promise.resolve({ ok: true, value: true });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return Promise.resolve({
          ok: false,
          error: `Failed to write secrets file: ${message}`,
        });
      }
    },

    listSecrets(): Promise<Result<string[], string>> {
      const data = loadCache();
      return Promise.resolve({ ok: true, value: Object.keys(data) });
    },
  };
}
