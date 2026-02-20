/**
 * Wikilink resolution and backlink discovery.
 *
 * Resolves wikilinks using case-insensitive name matching across the vault.
 * When multiple matches exist, the shortest path wins.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import type { WikilinkTarget, Backlink } from "./types.ts";
import type { VaultContext } from "./vault.ts";
import { isExcluded } from "./vault.ts";
import { extractWikilinks } from "./markdown.ts";

/** Interface for link resolution operations. */
export interface LinkResolver {
  /** Resolve a wikilink to its target note path. */
  resolveWikilink(link: string): Promise<Result<WikilinkTarget, string>>;
  /** Find all notes that link to a given note name. */
  getBacklinks(noteName: string): Promise<Result<readonly Backlink[], string>>;
  /** Get all outgoing wikilinks from a note. */
  getOutlinks(notePath: string): Promise<Result<readonly WikilinkTarget[], string>>;
}

/**
 * Create a LinkResolver for the given vault context.
 */
export function createLinkResolver(ctx: VaultContext): LinkResolver {
  return {
    async resolveWikilink(link: string): Promise<Result<WikilinkTarget, string>> {
      const targetName = link.toLowerCase();

      try {
        let bestMatch: string | null = null;

        for await (const entry of walkMdFiles(ctx.realVaultPath)) {
          const relativePath = entry.path.substring(ctx.realVaultPath.length + 1);
          if (isExcluded(ctx, relativePath)) continue;

          const name = entry.name.replace(/\.md$/, "");
          if (name.toLowerCase() === targetName) {
            // Shortest path wins on conflict
            if (bestMatch === null || relativePath.length < bestMatch.length) {
              bestMatch = relativePath;
            }
          }
        }

        return {
          ok: true,
          value: {
            link,
            resolvedPath: bestMatch,
          },
        };
      } catch (err) {
        return {
          ok: false,
          error: `Failed to resolve wikilink: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },

    async getBacklinks(noteName: string): Promise<Result<readonly Backlink[], string>> {
      const backlinks: Backlink[] = [];
      const targetLower = noteName.toLowerCase();

      try {
        for await (const entry of walkMdFiles(ctx.realVaultPath)) {
          const relativePath = entry.path.substring(ctx.realVaultPath.length + 1);
          if (isExcluded(ctx, relativePath)) continue;

          const content = await Deno.readTextFile(entry.path);
          const wikilinks = extractWikilinks(content);

          for (const wl of wikilinks) {
            if (wl.toLowerCase() === targetLower) {
              backlinks.push({
                sourcePath: relativePath,
                sourceName: entry.name.replace(/\.md$/, ""),
                linkText: wl,
              });
              break; // Only count each source file once
            }
          }
        }

        return { ok: true, value: backlinks };
      } catch (err) {
        return {
          ok: false,
          error: `Failed to find backlinks: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },

    async getOutlinks(notePath: string): Promise<Result<readonly WikilinkTarget[], string>> {
      try {
        const absolutePath = `${ctx.realVaultPath}/${notePath}`;
        const content = await Deno.readTextFile(absolutePath);
        const wikilinks = extractWikilinks(content);

        // Build an index of all note names for resolution
        const noteIndex = new Map<string, string>(); // lowercase name → relative path (shortest)
        for await (const entry of walkMdFiles(ctx.realVaultPath)) {
          const relativePath = entry.path.substring(ctx.realVaultPath.length + 1);
          if (isExcluded(ctx, relativePath)) continue;
          const name = entry.name.replace(/\.md$/, "").toLowerCase();
          const existing = noteIndex.get(name);
          if (!existing || relativePath.length < existing.length) {
            noteIndex.set(name, relativePath);
          }
        }

        const targets: WikilinkTarget[] = wikilinks.map((link) => ({
          link,
          resolvedPath: noteIndex.get(link.toLowerCase()) ?? null,
        }));

        return { ok: true, value: targets };
      } catch (err) {
        return {
          ok: false,
          error: `Failed to get outlinks: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    },
  };
}

/** Recursively walk .md files in a directory. */
async function* walkMdFiles(
  dirPath: string,
): AsyncGenerator<{ name: string; path: string }> {
  try {
    for await (const entry of Deno.readDir(dirPath)) {
      const fullPath = `${dirPath}/${entry.name}`;
      if (entry.isDirectory) {
        yield* walkMdFiles(fullPath);
      } else if (entry.isFile && entry.name.endsWith(".md")) {
        yield { name: entry.name, path: fullPath };
      }
    }
  } catch {
    // Skip directories we can't read
  }
}
