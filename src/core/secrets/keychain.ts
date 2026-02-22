/**
 * OS keychain / vault secrets management.
 *
 * Provides a unified interface for storing and retrieving secrets
 * using the OS-native keychain (macOS Keychain, Linux libsecret)
 * with an in-memory fallback for environments without a keyring.
 *
 * @module
 */

import { join } from "@std/path";
import type { Result } from "../types/classification.ts";
import { isDockerEnvironment } from "../env.ts";
import { createEncryptedFileSecretStore } from "./encrypted_file_provider.ts";
import { createLogger } from "../logger/logger.ts";

const log = createLogger("secrets");

/** Service name used for all keychain entries. */
const SERVICE_NAME = "triggerfish";

/**
 * Interface for secret storage backends.
 *
 * All implementations store secrets under the "triggerfish" service name.
 * Methods return Result types rather than throwing exceptions.
 */
export interface SecretStore {
  /**
   * Retrieve a secret by name.
   *
   * @param name - The secret key/attribute name
   * @returns The secret value, or an error if not found
   */
  readonly getSecret: (name: string) => Promise<Result<string, string>>;

  /**
   * Store a secret with the given name and value.
   *
   * @param name - The secret key/attribute name
   * @param value - The secret value to store
   * @returns true on success, or an error message
   */
  readonly setSecret: (
    name: string,
    value: string,
  ) => Promise<Result<true, string>>;

  /**
   * Delete a secret by name.
   *
   * @param name - The secret key/attribute name
   * @returns true on success, or an error if the secret does not exist
   */
  readonly deleteSecret: (name: string) => Promise<Result<true, string>>;

  /**
   * List all secret names stored under the triggerfish service.
   *
   * @returns Array of secret names, or an error message
   */
  readonly listSecrets: () => Promise<Result<string[], string>>;
}

/**
 * Run a Deno.Command and capture stdout/stderr.
 *
 * @param cmd - The command to run
 * @param args - Arguments for the command
 * @param stdin - Optional stdin data to pipe
 * @returns stdout text on success, or an error with stderr
 */
async function runCommand(
  cmd: string,
  args: string[],
  stdin?: string,
): Promise<Result<string, string>> {
  try {
    const command = new Deno.Command(cmd, {
      args,
      stdout: "piped",
      stderr: "piped",
      stdin: stdin !== undefined ? "piped" : "null",
    });

    const process = command.spawn();

    if (stdin !== undefined) {
      const writer = process.stdin.getWriter();
      await writer.write(new TextEncoder().encode(stdin));
      await writer.close();
    }

    const output = await process.output();
    const stdout = new TextDecoder().decode(output.stdout).trim();
    const stderr = new TextDecoder().decode(output.stderr).trim();

    if (output.success) {
      return { ok: true, value: stdout };
    }
    return {
      ok: false,
      error: stderr || `Command '${cmd}' failed with exit code ${output.code}`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to execute '${cmd}': ${message}` };
  }
}

/**
 * Create a Linux secret store using `secret-tool` (libsecret / GNOME Keyring).
 *
 * Secrets are stored with attributes: service=triggerfish, key=<name>
 */
function createLinuxKeychain(): SecretStore {
  return {
    async getSecret(name: string): Promise<Result<string, string>> {
      const result = await runCommand("secret-tool", [
        "lookup",
        "service",
        SERVICE_NAME,
        "key",
        name,
      ]);
      if (!result.ok) {
        return {
          ok: false,
          error: `Secret '${name}' not found: ${result.error}`,
        };
      }
      if (result.value === "") {
        return { ok: false, error: `Secret '${name}' not found` };
      }
      return { ok: true, value: result.value };
    },

    async setSecret(
      name: string,
      value: string,
    ): Promise<Result<true, string>> {
      const result = await runCommand(
        "secret-tool",
        [
          "store",
          "--label",
          `triggerfish:${name}`,
          "service",
          SERVICE_NAME,
          "key",
          name,
        ],
        value,
      );
      if (!result.ok) {
        return {
          ok: false,
          error: `Failed to store secret '${name}': ${result.error}`,
        };
      }
      return { ok: true, value: true };
    },

    async deleteSecret(name: string): Promise<Result<true, string>> {
      const result = await runCommand("secret-tool", [
        "clear",
        "service",
        SERVICE_NAME,
        "key",
        name,
      ]);
      if (!result.ok) {
        return {
          ok: false,
          error: `Failed to delete secret '${name}': ${result.error}`,
        };
      }
      return { ok: true, value: true };
    },

    async listSecrets(): Promise<Result<string[], string>> {
      // secret-tool search returns all matching attributes
      const result = await runCommand("secret-tool", [
        "search",
        "service",
        SERVICE_NAME,
      ]);
      if (!result.ok) {
        // If no secrets exist, search may return non-zero
        return { ok: true, value: [] };
      }
      // Parse output: lines like "attribute.key = <name>"
      const names: string[] = [];
      for (const line of result.value.split("\n")) {
        const match = line.match(/^attribute\.key\s*=\s*(.+)$/);
        if (match) {
          names.push(match[1].trim());
        }
      }
      return { ok: true, value: names };
    },
  };
}

/**
 * Create a macOS secret store using the `security` CLI (Keychain Access).
 *
 * Secrets are stored as generic passwords with service=triggerfish, account=<name>.
 */
function createMacKeychain(): SecretStore {
  return {
    async getSecret(name: string): Promise<Result<string, string>> {
      const result = await runCommand("security", [
        "find-generic-password",
        "-s",
        SERVICE_NAME,
        "-a",
        name,
        "-w",
      ]);
      if (!result.ok) {
        return {
          ok: false,
          error: `Secret '${name}' not found: ${result.error}`,
        };
      }
      return { ok: true, value: result.value };
    },

    async setSecret(
      name: string,
      value: string,
    ): Promise<Result<true, string>> {
      // Delete existing entry first (ignore errors if it doesn't exist)
      await runCommand("security", [
        "delete-generic-password",
        "-s",
        SERVICE_NAME,
        "-a",
        name,
      ]);
      const result = await runCommand("security", [
        "add-generic-password",
        "-s",
        SERVICE_NAME,
        "-a",
        name,
        "-w",
        value,
      ]);
      if (!result.ok) {
        return {
          ok: false,
          error: `Failed to store secret '${name}': ${result.error}`,
        };
      }
      return { ok: true, value: true };
    },

    async deleteSecret(name: string): Promise<Result<true, string>> {
      const result = await runCommand("security", [
        "delete-generic-password",
        "-s",
        SERVICE_NAME,
        "-a",
        name,
      ]);
      if (!result.ok) {
        return {
          ok: false,
          error: `Failed to delete secret '${name}': ${result.error}`,
        };
      }
      return { ok: true, value: true };
    },

    async listSecrets(): Promise<Result<string[], string>> {
      // Dump all generic passwords and filter by service
      const result = await runCommand("security", [
        "dump-keychain",
      ]);
      if (!result.ok) {
        return { ok: true, value: [] };
      }
      const names: string[] = [];
      let inTriggerfishEntry = false;
      for (const line of result.value.split("\n")) {
        // Detect service match
        if (line.includes(`"svce"<blob>="${SERVICE_NAME}"`)) {
          inTriggerfishEntry = true;
        }
        // Extract account name from matching entry
        if (inTriggerfishEntry) {
          const match = line.match(/"acct"<blob>="([^"]+)"/);
          if (match) {
            names.push(match[1]);
            inTriggerfishEntry = false;
          }
        }
        // Reset on new entry boundary
        if (line.startsWith("keychain:") || line.startsWith("class:")) {
          if (!line.includes(SERVICE_NAME)) {
            inTriggerfishEntry = false;
          }
        }
      }
      return { ok: true, value: names };
    },
  };
}

/**
 * Create an in-memory secret store.
 *
 * Useful for testing and environments without an OS keychain.
 * Secrets are lost when the process exits.
 */
export function createMemorySecretStore(): SecretStore {
  const store = new Map<string, string>();

  return {
    getSecret(name: string): Promise<Result<string, string>> {
      const value = store.get(name);
      if (value === undefined) {
        return Promise.resolve({
          ok: false,
          error: `Secret '${name}' not found`,
        });
      }
      return Promise.resolve({ ok: true, value });
    },

    setSecret(name: string, value: string): Promise<Result<true, string>> {
      store.set(name, value);
      return Promise.resolve({ ok: true, value: true });
    },

    deleteSecret(name: string): Promise<Result<true, string>> {
      if (!store.has(name)) {
        return Promise.resolve({
          ok: false,
          error: `Secret '${name}' not found`,
        });
      }
      store.delete(name);
      return Promise.resolve({ ok: true, value: true });
    },

    listSecrets(): Promise<Result<string[], string>> {
      return Promise.resolve({ ok: true, value: [...store.keys()] });
    },
  };
}

/**
 * Detect the current OS and return the appropriate keychain backend.
 *
 * - Linux: uses `secret-tool` (libsecret / GNOME Keyring)
 * - macOS (darwin): uses `security` CLI (Keychain Access)
 * - Other: falls back to in-memory store
 *
 * @returns A SecretStore implementation appropriate for the current OS
 */
export function createKeychain(): SecretStore {
  if (isDockerEnvironment()) {
    log.info("Secret backend selected: encrypted-file (Docker)");
    return createEncryptedFileSecretStore({
      secretsPath: "/data/secrets.json",
      keyPath: "/data/secrets.key",
    });
  }

  const os = Deno.build.os;

  switch (os) {
    case "linux":
      log.info("Secret backend selected: libsecret (Linux)");
      return createLinuxKeychain();
    case "darwin":
      log.info("Secret backend selected: Keychain (macOS)");
      return createMacKeychain();
    case "windows": {
      // Store secrets alongside triggerfish.yaml so the Windows Service
      // (which runs under a different account) resolves the same path
      // as the interactive CLI user.
      const dataDir = Deno.env.get("TRIGGERFISH_DATA_DIR") ??
        join(
          Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? ".",
          ".triggerfish",
        );
      log.info("Secret backend selected: encrypted-file (Windows)");
      return createEncryptedFileSecretStore({
        secretsPath: join(dataDir, "secrets.json"),
        keyPath: join(dataDir, "secrets.key"),
      });
    }
    default:
      log.warn("Secret backend selected: in-memory (unsupported OS)", { os });
      return createMemorySecretStore();
  }
}
