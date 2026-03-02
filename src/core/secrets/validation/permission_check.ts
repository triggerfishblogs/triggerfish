/**
 * Key file permission verification for Docker secret stores.
 *
 * Checks that the encryption key file has restrictive permissions (0600
 * or stricter) to prevent unauthorized access. In strict mode, insecure
 * permissions cause a hard failure instead of a warning.
 *
 * @module
 */

import type { Result } from "../../types/classification.ts";
import { createLogger } from "../../logger/logger.ts";

const log = createLogger("secrets");

/** Outcome of a key file permission check. */
export interface PermissionCheckResult {
  /** Whether the file permissions are considered secure. */
  readonly secure: boolean;
  /** Octal permission mode of the file. */
  readonly mode: number;
  /** Human-readable explanation of the check result. */
  readonly message: string;
}

/** Bitmask for group and other permission bits. */
const GROUP_OTHER_MASK = 0o077;

/**
 * Determine whether a Unix file mode is secure (no group/other access).
 *
 * A mode is secure when bits 0-5 (group rwx + other rwx) are all zero,
 * meaning only the file owner can read or write.
 */
export function isPermissionSecure(mode: number): boolean {
  return (mode & GROUP_OTHER_MASK) === 0;
}

/**
 * Verify that a key file has restrictive permissions (0600 or stricter).
 *
 * Reads the file's stat info and checks the lower 9 permission bits.
 * Returns a structured result with the actual mode and a diagnostic message.
 *
 * @param keyPath - Absolute path to the key file to check
 * @returns Permission check result, or error if the file cannot be stat'd
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
          secure: true,
          mode: 0,
          message:
            `Key file permission check skipped: OS does not report mode for '${keyPath}'`,
        },
      };
    }

    const mode = stat.mode & 0o777;
    const secure = isPermissionSecure(mode);
    const octal = `0o${mode.toString(8).padStart(3, "0")}`;

    if (secure) {
      log.info("Key file permissions verified secure", {
        operation: "verifyKeyFilePermissions",
        keyPath,
        mode: octal,
      });
      return {
        ok: true,
        value: {
          secure: true,
          mode,
          message: `Key file '${keyPath}' has secure permissions: ${octal}`,
        },
      };
    }

    log.warn("Key file has insecure permissions", {
      operation: "verifyKeyFilePermissions",
      keyPath,
      mode: octal,
      expectedMode: "0o600",
    });
    return {
      ok: true,
      value: {
        secure: false,
        mode,
        message:
          `Key file '${keyPath}' has insecure permissions ${octal} (expected 0o600 or stricter). ` +
          `Other users on the system may be able to read the encryption key.`,
      },
    };
  } catch (err: unknown) {
    if (err instanceof Deno.errors.NotFound) {
      return {
        ok: false,
        error: `Key file not found: '${keyPath}'`,
      };
    }
    return {
      ok: false,
      error:
        `Permission check failed for '${keyPath}': ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
