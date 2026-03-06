/**
 * Key file permission verification for Docker environments.
 *
 * Checks that the encryption key file has restrictive permissions
 * (0600 or stricter) to prevent unauthorized access.
 *
 * @module
 */

import type { Result } from "../../types/classification.ts";
import { createLogger } from "../../logger/logger.ts";

const log = createLogger("secrets");

/** Result of a key file permission check. */
export interface PermissionCheckResult {
  /** Whether the file permissions are secure (no group/other access). */
  readonly valid: boolean;
  /** The actual Unix mode bits of the file. */
  readonly mode: number;
  /** Human-readable diagnostic message. */
  readonly message: string;
}

/**
 * Check whether a Unix file mode has no group or other access bits set.
 *
 * A file is considered secure if bits 0o077 are all zero, meaning
 * only the owner has any access.
 *
 * @param mode - Unix file mode (e.g. from `Deno.stat().mode`)
 * @returns true if the file has no group or other permissions
 */
export function isPermissionSecure(mode: number): boolean {
  return (mode & 0o077) === 0;
}

/**
 * Verify that a key file has restrictive permissions (0600 or stricter).
 *
 * Reads file metadata via `Deno.stat()` and checks that no group or
 * other permission bits are set. Returns a structured result with the
 * actual mode and a diagnostic message.
 *
 * @param keyPath - Absolute path to the key file
 * @returns Permission check result, or error string if stat fails
 */
export async function verifyKeyFilePermissions(
  keyPath: string,
): Promise<Result<PermissionCheckResult, string>> {
  try {
    const stat = await Deno.stat(keyPath);

    if (stat.mode === null) {
      return {
        ok: true,
        value: {
          valid: true,
          mode: 0,
          message:
            `Key file permission check skipped (mode unavailable): ${keyPath}`,
        },
      };
    }

    const mode = stat.mode & 0o777;
    const valid = isPermissionSecure(mode);
    const octal = `0o${mode.toString(8).padStart(3, "0")}`;

    if (valid) {
      log.info("Key file permissions verified", {
        operation: "verifyKeyFilePermissions",
        keyPath,
        mode: octal,
      });
    } else {
      log.warn("Key file has insecure permissions", {
        operation: "verifyKeyFilePermissions",
        keyPath,
        mode: octal,
        expected: "0o600 or stricter",
      });
    }

    return {
      ok: true,
      value: {
        valid,
        mode,
        message: valid
          ? `Key file permissions secure (${octal}): ${keyPath}`
          : `Key file permissions insecure (${octal}, expected 0o600 or stricter): ${keyPath}`,
      },
    };
  } catch (err: unknown) {
    if (err instanceof Deno.errors.NotFound) {
      return {
        ok: false,
        error: `Key file not found: ${keyPath}`,
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Key file permission check failed for '${keyPath}': ${message}`,
    };
  }
}
