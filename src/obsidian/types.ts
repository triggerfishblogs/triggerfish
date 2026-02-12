/**
 * Obsidian vault integration types.
 *
 * All paths in these interfaces are relative to the vault root.
 * All properties are readonly for immutability.
 *
 * @module
 */

import type { ClassificationLevel } from "../core/types/classification.ts";

/** Configuration for an Obsidian vault. */
export interface ObsidianVaultConfig {
  /** Absolute path to the vault root directory. */
  readonly vaultPath: string;
  /** Default classification level for the vault. */
  readonly classification: ClassificationLevel;
  /** Daily notes settings. */
  readonly dailyNotes?: DailyNotesConfig;
  /** Folders to exclude from all operations. */
  readonly excludeFolders?: readonly string[];
  /** Per-folder classification overrides (most specific wins). */
  readonly folderClassifications?: Readonly<Record<string, ClassificationLevel>>;
}

/** Configuration for daily notes. */
export interface DailyNotesConfig {
  /** Folder for daily notes, relative to vault root. */
  readonly folder: string;
  /** Date format string (supports YYYY, MM, DD). */
  readonly dateFormat: string;
  /** Template path relative to vault root (optional). */
  readonly template?: string;
}

/** A parsed Obsidian note. */
export interface ObsidianNote {
  /** Path relative to vault root (e.g. "folder/note.md"). */
  readonly path: string;
  /** Filename without extension. */
  readonly name: string;
  /** Raw markdown content. */
  readonly content: string;
  /** Parsed YAML frontmatter key-value pairs. */
  readonly frontmatter: Readonly<Record<string, unknown>>;
  /** All tags (from frontmatter and inline). */
  readonly tags: readonly string[];
  /** All wikilink targets found in content. */
  readonly wikilinks: readonly string[];
  /** Heading structure. */
  readonly headings: readonly Heading[];
  /** File creation time. */
  readonly createdAt: Date;
  /** File last modified time. */
  readonly modifiedAt: Date;
}

/** A heading extracted from markdown content. */
export interface Heading {
  /** Heading level (1-6). */
  readonly level: number;
  /** Heading text (without the # prefix). */
  readonly text: string;
}

/** Options for creating a new note. */
export interface NoteCreateOptions {
  /** Path relative to vault root (e.g. "folder/note.md"). */
  readonly path: string;
  /** Markdown content. */
  readonly content: string;
  /** Optional frontmatter to set. */
  readonly frontmatter?: Readonly<Record<string, unknown>>;
  /** Optional template path relative to vault root. */
  readonly template?: string;
}

/** Options for updating an existing note. */
export interface NoteUpdateOptions {
  /** Path relative to vault root. */
  readonly path: string;
  /** New content (replaces entire body if set). */
  readonly content?: string;
  /** Append text to end of note. */
  readonly append?: string;
  /** Prepend text after frontmatter. */
  readonly prepend?: string;
  /** Frontmatter fields to merge (preserves existing keys not in update). */
  readonly frontmatter?: Readonly<Record<string, unknown>>;
}

/** Options for searching notes. */
export interface NoteSearchOptions {
  /** Search query (case-insensitive substring match on content + filename). */
  readonly query: string;
  /** Restrict search to a folder (relative to vault root). */
  readonly folder?: string;
  /** Filter by tags. */
  readonly tags?: readonly string[];
  /** Maximum number of results. */
  readonly maxResults?: number;
}

/** Options for listing notes. */
export interface NoteListOptions {
  /** Restrict to a folder (relative to vault root). */
  readonly folder?: string;
  /** Filter by tags. */
  readonly tags?: readonly string[];
  /** Sort field. */
  readonly sortBy?: "name" | "modified" | "created";
  /** Maximum number of results. */
  readonly maxResults?: number;
}

/** Options for daily note operations. */
export interface DailyNoteOptions {
  /** Date string in YYYY-MM-DD format. Defaults to today. */
  readonly date?: string;
  /** Template path relative to vault root. */
  readonly template?: string;
}

/** A resolved wikilink target. */
export interface WikilinkTarget {
  /** The wikilink text as written (e.g. "My Note"). */
  readonly link: string;
  /** Resolved path relative to vault root, or null if broken. */
  readonly resolvedPath: string | null;
  /** Display alias if specified (e.g. from [[target|alias]]). */
  readonly alias?: string;
}

/** A backlink — a note that links to a target. */
export interface Backlink {
  /** Path of the note containing the link (relative to vault root). */
  readonly sourcePath: string;
  /** Name of the source note. */
  readonly sourceName: string;
  /** The wikilink text found in the source. */
  readonly linkText: string;
}
