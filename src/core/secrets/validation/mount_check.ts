/**
 * Docker volume mount point validation.
 *
 * Verifies that a target path (typically `/data`) is backed by a Docker
 * volume or bind mount rather than the container's writable overlay layer.
 * If secrets are written to the overlay, a `docker commit` could persist
 * them into an image.
 *
 * Detection approach: parse `/proc/self/mountinfo` (Linux) and check
 * whether the target path appears as a mount point. Falls back gracefully
 * on non-Linux systems or when `/proc` is unavailable.
 *
 * @module
 */

import type { Result } from "../../types/classification.ts";
import { createLogger } from "../../logger/logger.ts";

const log = createLogger("secrets");

/** Outcome of a mount point verification check. */
export interface MountCheckResult {
  /** Whether the target path is a detected mount point. */
  readonly isMountPoint: boolean;
  /** Human-readable explanation of the check result. */
  readonly message: string;
}

/**
 * Parse `/proc/self/mountinfo` content and extract mount points.
 *
 * Each line of mountinfo has the format (simplified):
 * `id parent major:minor root mount-point options ... - fs-type source super-options`
 *
 * We extract field 5 (0-indexed: field 4) which is the mount point path.
 *
 * @param content - Raw text content of `/proc/self/mountinfo`
 * @returns Array of mount point paths found in the file
 */
export function parseMountPoints(content: string): readonly string[] {
  const mountPoints: string[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    // mountinfo fields are space-separated; mount point is field index 4
    const fields = trimmed.split(" ");
    if (fields.length >= 5) {
      mountPoints.push(fields[4]);
    }
  }
  return mountPoints;
}

/**
 * Verify that a target path is a mount point (not on the container overlay).
 *
 * Reads `/proc/self/mountinfo` and checks if the target path appears
 * as a mount point. This detects whether the path is backed by a Docker
 * volume, bind mount, or tmpfs — all of which are safer than the
 * container's writable layer.
 *
 * @param targetPath - Path to check (e.g. `/data`)
 * @returns Mount check result, or error if mountinfo cannot be read
 */
export async function verifyMountPoint(
  targetPath: string,
): Promise<Result<MountCheckResult, string>> {
  if (Deno.build.os !== "linux") {
    return {
      ok: true,
      value: {
        isMountPoint: true,
        message:
          `Mount point check skipped: not running on Linux (os=${Deno.build.os})`,
      },
    };
  }

  try {
    const content = await Deno.readTextFile("/proc/self/mountinfo");
    const mountPoints = parseMountPoints(content);
    const normalizedTarget = targetPath.replace(/\/+$/, "");
    const found = mountPoints.some((mp) =>
      mp === normalizedTarget || mp === normalizedTarget + "/"
    );

    if (found) {
      log.info("Volume mount verified", {
        operation: "verifyMountPoint",
        targetPath,
      });
      return {
        ok: true,
        value: {
          isMountPoint: true,
          message:
            `'${targetPath}' is a mount point — secrets will not leak into the container layer.`,
        },
      };
    }

    log.warn("Path is not a mount point", {
      operation: "verifyMountPoint",
      targetPath,
    });
    return {
      ok: true,
      value: {
        isMountPoint: false,
        message:
          `'${targetPath}' does not appear to be a mount point. ` +
          `Secrets written here may persist in the container's writable layer. ` +
          `Use 'docker run -v triggerfish-data:${targetPath}' to mount a volume.`,
      },
    };
  } catch (err: unknown) {
    if (err instanceof Deno.errors.NotFound) {
      return {
        ok: true,
        value: {
          isMountPoint: true,
          message:
            "Mount point check skipped: /proc/self/mountinfo not available",
        },
      };
    }
    return {
      ok: false,
      error:
        `Mount point check failed for '${targetPath}': ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
