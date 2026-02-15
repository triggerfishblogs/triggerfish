/**
 * Path resolution for Triggerfish data and config directories.
 *
 * Centralizes path logic so Docker, custom data dirs, and default
 * `$HOME/.triggerfish` all resolve through a single code path.
 *
 * @module
 */

import { join } from "@std/path";
import { isDockerEnvironment } from "../core/env.ts";

/**
 * Expand a leading `~` to the user's home directory.
 *
 * Uses `HOME` on Unix and falls back to `USERPROFILE` on Windows.
 *
 * @param inputPath - A filesystem path that may start with `~`
 * @returns The path with `~` replaced by the home directory
 */
export function expandTilde(inputPath: string): string {
  if (!inputPath.startsWith("~")) return inputPath;
  const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? "";
  return join(home, inputPath.slice(1).replace(/^[/\\]/, ""));
}

/**
 * Resolve the base data directory for Triggerfish.
 *
 * Priority:
 * 1. `TRIGGERFISH_DATA_DIR` env var (explicit override)
 * 2. Docker environment → `/data`
 * 3. Default → `$HOME/.triggerfish`
 *
 * @returns Absolute path to the base data directory
 */
export function resolveBaseDir(): string {
  const explicit = Deno.env.get("TRIGGERFISH_DATA_DIR");
  if (explicit) {
    return explicit;
  }

  if (isDockerEnvironment()) {
    return "/data";
  }

  const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? ".";
  return join(home, ".triggerfish");
}

/**
 * Resolve the path to the triggerfish.yaml config file.
 *
 * @param baseDir - Optional base directory override (defaults to resolveBaseDir())
 * @returns Absolute path to triggerfish.yaml
 */
export function resolveConfigPath(baseDir?: string): string {
  const base = baseDir ?? resolveBaseDir();
  return join(base, "triggerfish.yaml");
}
