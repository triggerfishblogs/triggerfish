/**
 * Note CRUD — read, create, update, search, list operations.
 *
 * All paths are validated through {@link resolveVaultPath} for confinement.
 * Excluded folders are skipped automatically.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import type {
  NoteCreateOptions,
  NoteListOptions,
  NoteSearchOptions,
  NoteUpdateOptions,
  ObsidianNote,
} from "./types.ts";
import type { VaultContext } from "./vault.ts";
import { isExcluded, resolveVaultPath } from "./vault.ts";
import {
  buildNote,
  mergeFrontmatter,
  parseFrontmatter,
  serializeFrontmatter,
} from "./markdown.ts";

/** Interface for note CRUD operations. */
export interface NoteStore {
  /** Read a note by its vault-relative path. */
  read(path: string): Promise<Result<ObsidianNote, string>>;
  /** Create a new note. */
  create(options: NoteCreateOptions): Promise<Result<ObsidianNote, string>>;
  /** Update an existing note. */
  update(options: NoteUpdateOptions): Promise<Result<ObsidianNote, string>>;
  /** Search notes by content and filename. */
  search(
    options: NoteSearchOptions,
  ): Promise<Result<readonly ObsidianNote[], string>>;
  /** List notes in the vault. */
  list(
    options: NoteListOptions,
  ): Promise<Result<readonly ObsidianNote[], string>>;
}

/** Read a note file from the vault, returning the parsed note. */
async function readNoteFromVault(
  ctx: VaultContext,
  path: string,
): Promise<Result<ObsidianNote, string>> {
  if (isExcluded(ctx, path)) {
    return { ok: false, error: `Path is excluded: ${path}` };
  }
  const resolved = await resolveVaultPath(ctx, path);
  if (!resolved.ok) return resolved;
  try {
    const content = await Deno.readTextFile(resolved.value);
    const stat = await Deno.stat(resolved.value);
    return {
      ok: true,
      value: buildNote(path, content, {
        mtime: stat.mtime,
        birthtime: stat.birthtime,
      }),
    };
  } catch (err) {
    return {
      ok: false,
      error: `Failed to read note: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}

/** Resolve note content from template or direct content, applying frontmatter. */
async function resolveNoteContent(
  ctx: VaultContext,
  options: NoteCreateOptions,
): Promise<Result<string, string>> {
  let content: string;
  if (options.template) {
    const templateResult = await readTemplate(ctx, options.template);
    if (!templateResult.ok) return templateResult;
    content = templateResult.value;
  } else {
    content = options.content;
  }
  if (options.frontmatter && Object.keys(options.frontmatter).length > 0) {
    const { data, body } = parseFrontmatter(content);
    content = serializeFrontmatter(
      mergeFrontmatter(data, options.frontmatter),
      body,
    );
  }
  return { ok: true, value: content };
}

/** Create a new note in the vault. */
async function createNoteInVault(
  ctx: VaultContext,
  options: NoteCreateOptions,
): Promise<Result<ObsidianNote, string>> {
  const notePath = ensureMdExtension(options.path);
  if (isExcluded(ctx, notePath)) {
    return { ok: false, error: `Path is excluded: ${notePath}` };
  }
  const resolved = await resolveVaultPath(ctx, notePath);
  if (!resolved.ok) return resolved;
  try {
    await Deno.stat(resolved.value);
    return { ok: false, error: `Note already exists: ${notePath}` };
  } catch { /* Expected — file should not exist */ }
  const contentResult = await resolveNoteContent(ctx, options);
  if (!contentResult.ok) return contentResult;
  const parentDir = resolved.value.substring(
    0,
    resolved.value.lastIndexOf("/"),
  );
  try {
    await Deno.mkdir(parentDir, { recursive: true });
  } catch { /* Directory may already exist */ }
  try {
    await Deno.writeTextFile(resolved.value, contentResult.value, {
      createNew: true,
    });
    const stat = await Deno.stat(resolved.value);
    return {
      ok: true,
      value: buildNote(notePath, contentResult.value, {
        mtime: stat.mtime,
        birthtime: stat.birthtime,
      }),
    };
  } catch (err) {
    return {
      ok: false,
      error: `Failed to create note: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}

/** Apply content changes (replace, prepend, append) and frontmatter to existing note content. */
function applyNoteContentUpdates(
  existingContent: string,
  options: NoteUpdateOptions,
): string {
  let { data, body } = parseFrontmatter(existingContent);
  if (options.frontmatter) {
    data = mergeFrontmatter(data, options.frontmatter);
  }
  if (options.content !== undefined) body = options.content;
  if (options.prepend) body = options.prepend + "\n" + body;
  if (options.append) body = body.trimEnd() + "\n" + options.append + "\n";
  return serializeFrontmatter(data, body);
}

/** Update an existing note in the vault. */
async function updateNoteInVault(
  ctx: VaultContext,
  options: NoteUpdateOptions,
): Promise<Result<ObsidianNote, string>> {
  if (isExcluded(ctx, options.path)) {
    return { ok: false, error: `Path is excluded: ${options.path}` };
  }
  const resolved = await resolveVaultPath(ctx, options.path);
  if (!resolved.ok) return resolved;
  let existingContent: string;
  try {
    existingContent = await Deno.readTextFile(resolved.value);
  } catch (err) {
    return {
      ok: false,
      error: `Note not found: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
  const finalContent = applyNoteContentUpdates(existingContent, options);
  try {
    await Deno.writeTextFile(resolved.value, finalContent);
    const stat = await Deno.stat(resolved.value);
    return {
      ok: true,
      value: buildNote(options.path, finalContent, {
        mtime: stat.mtime,
        birthtime: stat.birthtime,
      }),
    };
  } catch (err) {
    return {
      ok: false,
      error: `Failed to update note: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}

/** Check if a note matches all required tags. */
function noteMatchesTags(
  note: ObsidianNote,
  tags: readonly string[] | undefined,
): boolean {
  if (!tags || tags.length === 0) return true;
  return tags.every((t) => note.tags.includes(t));
}

/** Sort notes by the specified field. */
function sortNotesByField(
  notes: ObsidianNote[],
  sortBy: string,
): void {
  notes.sort((a, b) => {
    switch (sortBy) {
      case "modified":
        return b.modifiedAt.getTime() - a.modifiedAt.getTime();
      case "created":
        return b.createdAt.getTime() - a.createdAt.getTime();
      case "name":
      default:
        return a.name.localeCompare(b.name);
    }
  });
}

/**
 * Create a NoteStore for the given vault context.
 */
export function createNoteStore(ctx: VaultContext): NoteStore {
  return {
    read: (path) => readNoteFromVault(ctx, path),
    create: (options) => createNoteInVault(ctx, options),
    update: (options) => updateNoteInVault(ctx, options),

    async search(
      options: NoteSearchOptions,
    ): Promise<Result<readonly ObsidianNote[], string>> {
      const maxResults = options.maxResults ?? 20;
      const queryLower = options.query.toLowerCase();
      const results: ObsidianNote[] = [];
      try {
        for await (const note of walkNotes(ctx, options.folder)) {
          if (!noteMatchesTags(note, options.tags)) continue;
          const contentLower = note.content.toLowerCase();
          const nameLower = note.name.toLowerCase();
          if (
            contentLower.includes(queryLower) || nameLower.includes(queryLower)
          ) {
            results.push(note);
            if (results.length >= maxResults) break;
          }
        }
        return { ok: true, value: results };
      } catch (err) {
        return {
          ok: false,
          error: `Search failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        };
      }
    },

    async list(
      options: NoteListOptions,
    ): Promise<Result<readonly ObsidianNote[], string>> {
      const maxResults = options.maxResults ?? 100;
      const notes: ObsidianNote[] = [];
      try {
        for await (const note of walkNotes(ctx, options.folder)) {
          if (!noteMatchesTags(note, options.tags)) continue;
          notes.push(note);
        }
        sortNotesByField(notes, options.sortBy ?? "name");
        return { ok: true, value: notes.slice(0, maxResults) };
      } catch (err) {
        return {
          ok: false,
          error: `List failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        };
      }
    },
  };
}

/** Ensure a path ends with .md */
function ensureMdExtension(path: string): string {
  return path.endsWith(".md") ? path : path + ".md";
}

/** Read a template file from the vault. */
async function readTemplate(
  ctx: VaultContext,
  templatePath: string,
): Promise<Result<string, string>> {
  const resolved = await resolveVaultPath(ctx, templatePath);
  if (!resolved.ok) return resolved;

  try {
    return { ok: true, value: await Deno.readTextFile(resolved.value) };
  } catch (err) {
    return {
      ok: false,
      error: `Template not found: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}

/**
 * Walk all .md files in the vault (or a subfolder), yielding parsed notes.
 * Skips excluded folders.
 */
async function* walkNotes(
  ctx: VaultContext,
  folder?: string,
): AsyncGenerator<ObsidianNote> {
  const basePath = folder
    ? `${ctx.realVaultPath}/${folder}`
    : ctx.realVaultPath;

  try {
    for await (const entry of walkDir(basePath)) {
      if (!entry.name.endsWith(".md")) continue;

      // Compute relative path
      const relativePath = entry.path.substring(ctx.realVaultPath.length + 1);
      if (isExcluded(ctx, relativePath)) continue;

      try {
        const content = await Deno.readTextFile(entry.path);
        const stat = await Deno.stat(entry.path);
        yield buildNote(relativePath, content, {
          mtime: stat.mtime,
          birthtime: stat.birthtime,
        });
      } catch {
        // Skip files we can't read
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }
}

/** Recursively walk a directory, yielding file entries with full paths. */
async function* walkDir(
  dirPath: string,
): AsyncGenerator<{ name: string; path: string }> {
  for await (const entry of Deno.readDir(dirPath)) {
    const fullPath = `${dirPath}/${entry.name}`;
    if (entry.isDirectory) {
      yield* walkDir(fullPath);
    } else if (entry.isFile) {
      yield { name: entry.name, path: fullPath };
    }
  }
}
