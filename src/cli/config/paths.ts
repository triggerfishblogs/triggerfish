/**
 * Path resolution for Triggerfish data and config directories.
 *
 * Centralizes path logic so Docker, custom data dirs, and default
 * `$HOME/.triggerfish` all resolve through a single code path.
 *
 * @module
 */

import { join } from "@std/path";
import { isDockerEnvironment } from "../../core/env.ts";
import { createLogger } from "../../core/logger/mod.ts";

const log = createLogger("paths");

/**
 * Resolve the canonical (symlink-free) home directory.
 *
 * On systems where `$HOME` is a symlink (e.g. Fedora Atomic:
 * `/home` → `/var/home`), paths derived from $HOME won't match
 * the real filesystem paths. Resolving symlinks here ensures all
 * derived paths use the physical location.
 */
function resolveCanonicalHome(): string {
  const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? ".";
  try {
    return Deno.realPathSync(home);
  } catch (err: unknown) {
    log.debug("Home directory symlink resolution failed, using raw path", {
      operation: "resolveCanonicalHome",
      home,
      err,
    });
    return home;
  }
}

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
  const home = resolveCanonicalHome();
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

  const home = resolveCanonicalHome();
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

/** Maximum number of config backups to retain. */
const MAX_CONFIG_BACKUPS = 10;

/** Check whether a file exists on disk. */
async function fileExists(path: string): Promise<boolean> {
  try {
    await Deno.stat(path);
    return true;
  } catch {
    return false;
  }
}

/** Remove old config backups beyond {@link MAX_CONFIG_BACKUPS}. */
async function pruneOldConfigBackups(backupDir: string): Promise<void> {
  const entries: string[] = [];
  for await (const entry of Deno.readDir(backupDir)) {
    if (entry.isFile && entry.name.startsWith("triggerfish.yaml.")) {
      entries.push(entry.name);
    }
  }
  entries.sort();
  const excess = entries.length - MAX_CONFIG_BACKUPS;
  for (let i = 0; i < excess; i++) {
    await Deno.remove(join(backupDir, entries[i]));
  }
}

/**
 * Create a timestamped backup of triggerfish.yaml before modifying it.
 *
 * Backups are stored in `~/.triggerfish/backups/` with filenames like
 * `triggerfish.yaml.2026-02-16T14-30-45Z`. Old backups beyond
 * {@link MAX_CONFIG_BACKUPS} are pruned automatically.
 *
 * Silently no-ops if the config file doesn't exist yet.
 *
 * @param configPath - Absolute path to triggerfish.yaml
 */
export async function backupConfig(configPath: string): Promise<void> {
  if (!await fileExists(configPath)) return;

  const backupDir = join(resolveBaseDir(), "backups");
  await Deno.mkdir(backupDir, { recursive: true });

  const ts = new Date().toISOString().replace(/:/g, "-");
  const backupPath = join(backupDir, `triggerfish.yaml.${ts}`);
  await Deno.copyFile(configPath, backupPath);

  await pruneOldConfigBackups(backupDir);
}
