/**
 * Vault filesystem traversal — walk directories and yield parsed notes.
 *
 * Skips excluded folders automatically via {@link isExcluded}.
 *
 * @module
 */

import type { ObsidianNote } from "../types.ts";
import type { VaultContext } from "../vault.ts";
import { isExcluded } from "../vault.ts";
import { buildNote } from "../markdown.ts";

/**
 * Walk all .md files in the vault (or a subfolder), yielding parsed notes.
 * Skips excluded folders.
 */
export async function* walkNotes(
  ctx: VaultContext,
  folder?: string,
): AsyncGenerator<ObsidianNote> {
  const basePath = folder
    ? `${ctx.realVaultPath}/${folder}`
    : ctx.realVaultPath;

  try {
    for await (const entry of walkDir(basePath)) {
      if (!entry.name.endsWith(".md")) continue;

      const relativePath = entry.path.substring(ctx.realVaultPath.length + 1);
      if (isExcluded(ctx, relativePath)) continue;

      yield* readAndBuildNote(relativePath, entry.path);
    }
  } catch {
    // Directory doesn't exist or can't be read
  }
}

/** Read a single file and yield a parsed note, swallowing read errors. */
async function* readAndBuildNote(
  relativePath: string,
  absolutePath: string,
): AsyncGenerator<ObsidianNote> {
  try {
    const content = await Deno.readTextFile(absolutePath);
    const stat = await Deno.stat(absolutePath);
    yield buildNote(relativePath, content, {
      mtime: stat.mtime,
      birthtime: stat.birthtime,
    });
  } catch {
    // Skip files we can't read
  }
}

/** Recursively walk a directory, yielding file entries with full paths. */
async function* walkDir(
  dirPath: string,
): AsyncGenerator<{ readonly name: string; readonly path: string }> {
  for await (const entry of Deno.readDir(dirPath)) {
    const fullPath = `${dirPath}/${entry.name}`;
    if (entry.isDirectory) {
      yield* walkDir(fullPath);
    } else if (entry.isFile) {
      yield { name: entry.name, path: fullPath };
    }
  }
}
