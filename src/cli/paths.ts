/**
 * Path resolution for Triggerfish data and config directories.
 *
 * Centralizes path logic so Docker, custom data dirs, and default
 * `$HOME/.triggerfish` all resolve through a single code path.
 *
 * @module
 */

import { isDockerEnvironment } from "../core/env.ts";

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
  return `${home}/.triggerfish`;
}

/**
 * Resolve the path to the triggerfish.yaml config file.
 *
 * @param baseDir - Optional base directory override (defaults to resolveBaseDir())
 * @returns Absolute path to triggerfish.yaml
 */
export function resolveConfigPath(baseDir?: string): string {
  const base = baseDir ?? resolveBaseDir();
  return `${base}/triggerfish.yaml`;
}
