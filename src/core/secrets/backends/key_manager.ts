/**
 * Machine-bound encryption key management.
 *
 * Generates or loads a 256-bit AES-GCM key stored as raw bytes in a
 * dedicated key file. The key file is the machine secret: it is placed
 * in a user-owned directory and chmod 0600 on Unix systems.
 *
 * @module
 */

import { dirname } from "@std/path";
import type { Result } from "../../types/classification.ts";
import { createLogger } from "../../logger/logger.ts";
import {
  type PermissionStrictness,
  resolvePermissionStrictness,
} from "./secret_store.ts";

const log = createLogger("secrets");

/** Options for loading or creating the machine key. */
export interface MachineKeyOptions {
  /** Absolute path to the key file (e.g. `~/.triggerfish/secrets.key`). */
  readonly keyPath: string;
  /** How to handle file permission violations. Defaults to env or `"warn"`. */
  readonly permissionStrictness?: PermissionStrictness;
}

/**
 * Verify that a key file has restrictive permissions (0600).
 *
 * @returns An error string if permissions are unacceptable under the
 *          current strictness setting, or `undefined` if acceptable.
 */
async function verifyKeyFilePermissions(
  keyPath: string,
  strictness: PermissionStrictness,
): Promise<string | undefined> {
  if (Deno.build.os === "windows" || strictness === "ignore") return undefined;
  try {
    const stat = await Deno.stat(keyPath);
    if (stat.mode === null || stat.mode === undefined) return undefined;
    const perms = stat.mode & 0o777;
    if (perms !== 0o600) {
      const detail = {
        operation: "verifyKeyFilePermissions",
        keyPath,
        expected: "600",
        actual: perms.toString(8),
      };
      if (strictness === "error") {
        log.error("Machine key file permissions too open", detail);
        return (
          `Machine key file '${keyPath}' has permissions 0${
            perms.toString(8)
          } ` +
          "(expected 0600). Set TRIGGERFISH_SECRETS_PERMISSION_STRICTNESS=warn " +
          "or =ignore to override."
        );
      }
      log.warn("Machine key file permissions too open", detail);
    }
  } catch (err) {
    log.warn("Key file stat failed during permission check", {
      operation: "verifyKeyFilePermissions",
      keyPath,
      err,
    });
  }
  return undefined;
}

/** Set permissions to 0600 on Unix, with fallback logging. */
async function setRestrictivePermissions(keyPath: string): Promise<void> {
  if (Deno.build.os === "windows") return;
  try {
    await Deno.chmod(keyPath, 0o600);
  } catch (err: unknown) {
    log.warn("Machine key chmod failed — verify permissions manually", {
      operation: "setRestrictivePermissions",
      keyPath,
      err,
    });
  }
}

/**
 * Load the machine encryption key from disk, or generate a new one if
 * the key file does not exist.
 *
 * - If the key file exists: reads 32 raw bytes and imports as AES-256-GCM.
 * - If absent: generates a new random 256-bit key, writes raw bytes to disk,
 *   and sets file permissions to 0600 on Unix.
 * - Verifies actual file permissions after write (respects `permissionStrictness`).
 *
 * @param options - Key file path configuration
 * @returns The CryptoKey on success, or an error string on failure
 */
export async function loadOrCreateMachineKey(
  options: MachineKeyOptions,
): Promise<Result<CryptoKey, string>> {
  const { keyPath } = options;
  const strictness = resolvePermissionStrictness(options.permissionStrictness);

  try {
    // Attempt to read existing key file
    let rawBytes: Uint8Array;
    try {
      const fileBytes = await Deno.readFile(keyPath);
      if (fileBytes.byteLength !== 32) {
        log.warn("Machine key file corrupt", {
          keyPath,
          expectedBytes: 32,
          actualBytes: fileBytes.byteLength,
        });
        return {
          ok: false,
          error:
            `Key file '${keyPath}' is corrupt: expected 32 bytes, got ${fileBytes.byteLength}`,
        };
      }
      log.info("Machine key loaded from disk", { keyPath });
      rawBytes = fileBytes;

      // Verify permissions on existing key file
      const permError = await verifyKeyFilePermissions(keyPath, strictness);
      if (permError !== undefined) return { ok: false, error: permError };
    } catch (readErr) {
      if (!(readErr instanceof Deno.errors.NotFound)) {
        log.warn("Machine key file read failed unexpectedly", {
          operation: "loadOrCreateMachineKey",
          keyPath,
          err: readErr,
        });
      }
      // Key file missing or unreadable — generate a new key
      const key = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"],
      );
      const exported = await crypto.subtle.exportKey("raw", key);
      rawBytes = new Uint8Array(exported);

      // Write key file with restrictive permissions
      await Deno.mkdir(dirname(keyPath), { recursive: true });
      log.warn("Machine key generated", { keyPath });
      await Deno.writeFile(keyPath, rawBytes, { mode: 0o600 });

      // Explicitly chmod on Unix (writeFile mode may be masked by umask)
      await setRestrictivePermissions(keyPath);

      // Verify actual permissions after write
      const permError = await verifyKeyFilePermissions(keyPath, strictness);
      if (permError !== undefined) return { ok: false, error: permError };

      return { ok: true, value: key };
    }

    // Import the existing raw bytes as AES-GCM key
    const key = await crypto.subtle.importKey(
      "raw",
      rawBytes.buffer as ArrayBuffer,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );
    return { ok: true, value: key };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Failed to load machine key: ${message}` };
  }
}
