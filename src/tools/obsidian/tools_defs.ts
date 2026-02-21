/**
 * Obsidian tool types, definitions, and system prompt.
 *
 * Defines ObsidianToolContext, the 6 obsidian tool schemas
 * (obsidian_read, obsidian_write, obsidian_search, obsidian_list,
 * obsidian_daily, obsidian_links), and the LLM system prompt section.
 *
 * Separated from the executor in `tools.ts` for lighter type-only imports.
 *
 * @module
 */

import type { ToolDefinition } from "../../agent/orchestrator.ts";
import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { SessionId } from "../../core/types/session.ts";
import type { LineageStore } from "../../core/session/lineage.ts";
import type { VaultContext } from "./vault.ts";
import type { NoteStore } from "./notes.ts";
import type { DailyNoteManager } from "./daily.ts";
import type { LinkResolver } from "./links.ts";

/** Context required by the obsidian tool executor. */
export interface ObsidianToolContext {
  readonly vaultContext: VaultContext;
  readonly noteStore: NoteStore;
  readonly dailyNoteManager: DailyNoteManager;
  readonly linkResolver: LinkResolver;
  readonly getSessionTaint: () => ClassificationLevel;
  readonly sessionId: SessionId;
  readonly lineageStore?: LineageStore;
}

/** Tool definitions for the 6 obsidian operations. */
export function getObsidianToolDefinitions(): readonly ToolDefinition[] {
  return [
    {
      name: "obsidian_read",
      description:
        "Read an Obsidian note by name or path. Returns the note content, " +
        "frontmatter, tags, and wikilinks. The name can be a filename (without " +
        ".md) or a vault-relative path.",
      parameters: {
        name: {
          type: "string",
          description: "Note name or vault-relative path (e.g. 'My Note' or 'folder/note.md')",
          required: true,
        },
      },
    },
    {
      name: "obsidian_write",
      description:
        "Create or update an Obsidian note. Specify content for full replacement, " +
        "or use append/prepend for incremental updates. Frontmatter is merged " +
        "with existing values. Classification is enforced — you cannot write to " +
        "a folder with higher classification than the current session.",
      parameters: {
        name: {
          type: "string",
          description: "Note name or vault-relative path",
          required: true,
        },
        content: {
          type: "string",
          description: "Full note content (replaces body if updating)",
        },
        append: {
          type: "string",
          description: "Text to append to end of note",
        },
        prepend: {
          type: "string",
          description: "Text to prepend after frontmatter",
        },
        folder: {
          type: "string",
          description: "Folder to create note in (for new notes)",
        },
        frontmatter: {
          type: "object",
          description: "Frontmatter fields to set/merge (e.g. {\"tags\": [\"project\"]})",
        },
        template: {
          type: "string",
          description: "Template path to use for new notes",
        },
      },
    },
    {
      name: "obsidian_search",
      description:
        "Search Obsidian notes by content and filename. Case-insensitive " +
        "substring matching. Optionally filter by folder and tags.",
      parameters: {
        query: {
          type: "string",
          description: "Search query (matches content and filenames)",
          required: true,
        },
        folder: {
          type: "string",
          description: "Restrict search to a folder",
        },
        tags: {
          type: "array",
          description: "Filter by tags (notes must have all specified tags)",
          items: { type: "string" },
        },
        max_results: {
          type: "number",
          description: "Maximum results to return (default: 20)",
        },
      },
    },
    {
      name: "obsidian_list",
      description:
        "List notes in the Obsidian vault. Optionally filter by folder and " +
        "tags, and sort by name, modified date, or creation date.",
      parameters: {
        folder: {
          type: "string",
          description: "Restrict to a folder",
        },
        tags: {
          type: "array",
          description: "Filter by tags",
          items: { type: "string" },
        },
        sort_by: {
          type: "string",
          description: "Sort by 'name', 'modified', or 'created' (default: 'name')",
        },
        max_results: {
          type: "number",
          description: "Maximum results (default: 100)",
        },
      },
    },
    {
      name: "obsidian_daily",
      description:
        "Get or create today's daily note (or a specific date). " +
        "Returns the note content. Creates the note from template if it " +
        "doesn't exist yet.",
      parameters: {
        date: {
          type: "string",
          description: "Date in YYYY-MM-DD format (default: today)",
        },
        template: {
          type: "string",
          description: "Template path for new daily notes",
        },
      },
    },
    {
      name: "obsidian_links",
      description:
        "Explore wikilink connections. Get backlinks (notes linking TO a note), " +
        "outlinks (notes a note links TO), or resolve a specific wikilink.",
      parameters: {
        note: {
          type: "string",
          description: "Note name to find links for",
          required: true,
        },
        direction: {
          type: "string",
          description: "'backlinks', 'outlinks', or 'resolve' (default: 'backlinks')",
        },
      },
    },
  ];
}

/** System prompt section for obsidian tools. */
export const OBSIDIAN_SYSTEM_PROMPT = `## Obsidian Vault

You have tools to interact with the user's Obsidian vault (obsidian_read, obsidian_write, obsidian_search, obsidian_list, obsidian_daily, obsidian_links).

Use [[wikilinks]] when referencing notes in content you write. Use obsidian_daily for journal entries and daily logs. Use obsidian_links to explore note connections.

When creating notes, use descriptive names and add relevant tags in frontmatter. Respect the vault's folder structure.

Classification is enforced — you can only read notes at or below the current session's security level, and cannot write classified data to lower-classification folders.`;
