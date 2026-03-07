/**
 * Docker volume mount point verification.
 *
 * Parses `/proc/self/mountinfo` to detect whether a path is a separate
 * mount point (Docker volume) or part of the container's writable overlay
 * layer. Running on the overlay means a `docker commit` could persist
 * secrets into a new image.
 *
 * @module
 */

import type { Result } from "../../types/classification.ts";
import { createLogger } from "../../logger/logger.ts";

const log = createLogger("secrets");

/** Result of a mount point verification check. */
export interface MountCheckResult {
  /** Whether the target path is a separate mount point. */
  readonly isMounted: boolean;
  /** Human-readable diagnostic message. */
  readonly message: string;
}

/**
 * Parse mount points from `/proc/self/mountinfo` content.
 *
 * Each line of mountinfo has space-separated fields. Field index 4 (0-based)
 * is the mount point path. Lines are split on ` - ` to separate optional
 * fields from filesystem type info.
 *
 * @param content - Raw text content of `/proc/self/mountinfo`
 * @returns Array of mount point paths
 */
export function parseMountPoints(content: string): readonly string[] {
  const mounts: string[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    // Fields before the " - " separator:
    // mount_id parent_id major:minor root mount_point options ...
    const separatorIdx = trimmed.indexOf(" - ");
    const prefix = separatorIdx >= 0
      ? trimmed.substring(0, separatorIdx)
      : trimmed;
    const fields = prefix.split(/\s+/);
    if (fields.length >= 5) {
      mounts.push(fields[4]);
    }
  }
  return mounts;
}

/**
 * Verify that a path is a mount point (not on the container overlay layer).
 *
 * Reads `/proc/self/mountinfo` and checks whether the target path appears
 * as a mount point. On non-Linux or when `/proc` is unavailable, returns
 * a graceful "skipped" result.
 *
 * Opt-out via `TRIGGERFISH_SKIP_MOUNT_CHECK=true`.
 *
 * @param targetPath - Path to verify (e.g. `/data`)
 * @returns Mount check result, or error string on failure
 */
export async function verifyMountPoint(
  targetPath: string,
): Promise<Result<MountCheckResult, string>> {
  if (Deno.env.get("TRIGGERFISH_SKIP_MOUNT_CHECK") === "true") {
    log.info("Mount point check skipped via TRIGGERFISH_SKIP_MOUNT_CHECK", {
      operation: "verifyMountPoint",
      targetPath,
    });
    return {
      ok: true,
      value: {
        isMounted: true,
        message: `Mount point check skipped (opted out): ${targetPath}`,
      },
    };
  }

  if (Deno.build.os !== "linux") {
    return {
      ok: true,
      value: {
        isMounted: true,
        message:
          `Mount point check skipped (non-Linux OS: ${Deno.build.os}): ${targetPath}`,
      },
    };
  }

  try {
    const content = await Deno.readTextFile("/proc/self/mountinfo");
    const mounts = parseMountPoints(content);
    const isMounted = mounts.includes(targetPath);

    if (isMounted) {
      log.info("Data directory is a mount point", {
        operation: "verifyMountPoint",
        targetPath,
      });
    } else {
      log.warn("Data directory is NOT a mount point — secrets may persist in container layer", {
        operation: "verifyMountPoint",
        targetPath,
        hint: "Use 'docker run -v volume:/data' to mount a volume",
      });
    }

    return {
      ok: true,
      value: {
        isMounted,
        message: isMounted
          ? `Data directory is a mount point: ${targetPath}`
          : `Data directory is NOT a mount point (container overlay): ${targetPath}. ` +
            `Use 'docker run -v volume:/data' to mount a separate volume.`,
      },
    };
  } catch (err: unknown) {
    if (err instanceof Deno.errors.NotFound) {
      return {
        ok: true,
        value: {
          isMounted: true,
          message:
            `Mount point check skipped (/proc/self/mountinfo not found): ${targetPath}`,
        },
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error:
        `Mount point check failed for '${targetPath}': ${message}`,
    };
  }
}
