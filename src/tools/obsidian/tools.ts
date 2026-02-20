/**
 * Obsidian tools — LLM-callable operations for vault interaction.
 *
 * Provides 6 tool definitions (obsidian_read, obsidian_write, obsidian_search,
 * obsidian_list, obsidian_daily, obsidian_links) and a tool executor factory.
 *
 * Classification enforcement:
 * - Reads: verify canFlowTo(noteClassification, sessionTaint)
 * - Writes: verify canFlowTo(sessionTaint, folderClassification) — prevent write-down
 *
 * @module
 */

import type { ToolDefinition } from "../../agent/orchestrator.ts";
import type { ClassificationLevel } from "../../core/types/classification.ts";
import { canFlowTo } from "../../core/types/classification.ts";
import type { SessionId } from "../../core/types/session.ts";
import type { LineageStore, LineageOrigin, LineageClassification } from "../../core/session/lineage.ts";
import type { VaultContext } from "./vault.ts";
import { getClassificationForPath } from "./vault.ts";
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

/**
 * Create a tool executor for obsidian operations.
 *
 * Returns a handler that accepts tool name + args and returns a result string,
 * or null if the tool name is not an obsidian tool.
 */
export function createObsidianToolExecutor(
  ctx: ObsidianToolContext,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    switch (name) {
      case "obsidian_read": {
        const noteName = input.name;
        if (typeof noteName !== "string" || noteName.length === 0) {
          return "Error: obsidian_read requires a 'name' argument (non-empty string).";
        }

        const notePath = resolveNotePath(noteName);

        // Classification check: note classification must flow to session taint
        const noteClassification = getClassificationForPath(ctx.vaultContext, notePath);
        if (!canFlowTo(noteClassification, ctx.getSessionTaint())) {
          return `Error: Access denied — note classification ${noteClassification} exceeds session level ${ctx.getSessionTaint()}.`;
        }

        const result = await ctx.noteStore.read(notePath);
        if (!result.ok) return `Error: ${result.error}`;

        // Record lineage
        if (ctx.lineageStore) {
          await recordLineage(ctx, notePath, noteClassification, "read");
        }

        return JSON.stringify({
          path: result.value.path,
          name: result.value.name,
          content: result.value.content,
          frontmatter: result.value.frontmatter,
          tags: result.value.tags,
          wikilinks: result.value.wikilinks,
          headings: result.value.headings,
        });
      }

      case "obsidian_write": {
        const noteName = input.name;
        if (typeof noteName !== "string" || noteName.length === 0) {
          return "Error: obsidian_write requires a 'name' argument (non-empty string).";
        }

        const folder = typeof input.folder === "string" ? input.folder : undefined;
        const notePath = folder
          ? `${folder}/${resolveNotePath(noteName)}`
          : resolveNotePath(noteName);

        // Classification check: prevent write-down
        // Session taint must flow to folder classification
        const folderClassification = getClassificationForPath(ctx.vaultContext, notePath);
        if (!canFlowTo(ctx.getSessionTaint(), folderClassification)) {
          return `Error: Write-down prevented — session taint ${ctx.getSessionTaint()} cannot write to folder classified ${folderClassification}.`;
        }

        const content = typeof input.content === "string" ? input.content : undefined;
        const append = typeof input.append === "string" ? input.append : undefined;
        const prepend = typeof input.prepend === "string" ? input.prepend : undefined;
        const template = typeof input.template === "string" ? input.template : undefined;
        const frontmatter = (input.frontmatter && typeof input.frontmatter === "object" && !Array.isArray(input.frontmatter))
          ? input.frontmatter as Record<string, unknown>
          : undefined;

        // Try update first, then create
        const existing = await ctx.noteStore.read(notePath);
        let result;
        if (existing.ok) {
          result = await ctx.noteStore.update({
            path: notePath,
            content,
            append,
            prepend,
            frontmatter,
          });
        } else {
          result = await ctx.noteStore.create({
            path: notePath,
            content: content ?? "",
            frontmatter,
            template,
          });
        }

        if (!result.ok) return `Error: ${result.error}`;

        // Record lineage
        if (ctx.lineageStore) {
          await recordLineage(ctx, notePath, folderClassification, "write");
        }

        return JSON.stringify({
          written: true,
          path: result.value.path,
          name: result.value.name,
        });
      }

      case "obsidian_search": {
        const query = input.query;
        if (typeof query !== "string" || query.length === 0) {
          return "Error: obsidian_search requires a 'query' argument (non-empty string).";
        }

        const folder = typeof input.folder === "string" ? input.folder : undefined;
        const tags = Array.isArray(input.tags)
          ? input.tags.filter((t): t is string => typeof t === "string")
          : undefined;
        const maxResults = typeof input.max_results === "number" ? input.max_results : undefined;

        const result = await ctx.noteStore.search({ query, folder, tags, maxResults });
        if (!result.ok) return `Error: ${result.error}`;

        // Filter by classification
        const filtered = result.value.filter((note) => {
          const noteClass = getClassificationForPath(ctx.vaultContext, note.path);
          return canFlowTo(noteClass, ctx.getSessionTaint());
        });

        return JSON.stringify({
          results: filtered.map((note) => ({
            path: note.path,
            name: note.name,
            tags: note.tags,
            headings: note.headings,
          })),
          total: filtered.length,
          query,
        });
      }

      case "obsidian_list": {
        const folder = typeof input.folder === "string" ? input.folder : undefined;
        const tags = Array.isArray(input.tags)
          ? input.tags.filter((t): t is string => typeof t === "string")
          : undefined;
        const sortBy = typeof input.sort_by === "string"
          ? input.sort_by as "name" | "modified" | "created"
          : undefined;
        const maxResults = typeof input.max_results === "number" ? input.max_results : undefined;

        const result = await ctx.noteStore.list({ folder, tags, sortBy, maxResults });
        if (!result.ok) return `Error: ${result.error}`;

        // Filter by classification
        const filtered = result.value.filter((note) => {
          const noteClass = getClassificationForPath(ctx.vaultContext, note.path);
          return canFlowTo(noteClass, ctx.getSessionTaint());
        });

        return JSON.stringify({
          notes: filtered.map((note) => ({
            path: note.path,
            name: note.name,
            tags: note.tags,
          })),
          total: filtered.length,
        });
      }

      case "obsidian_daily": {
        const date = typeof input.date === "string" ? input.date : undefined;
        const template = typeof input.template === "string" ? input.template : undefined;

        const result = await ctx.dailyNoteManager.getOrCreate(date, template);
        if (!result.ok) return `Error: ${result.error}`;

        return JSON.stringify({
          path: result.value.path,
          name: result.value.name,
          content: result.value.content,
          frontmatter: result.value.frontmatter,
          tags: result.value.tags,
        });
      }

      case "obsidian_links": {
        const noteName = input.note;
        if (typeof noteName !== "string" || noteName.length === 0) {
          return "Error: obsidian_links requires a 'note' argument (non-empty string).";
        }

        const direction = typeof input.direction === "string" ? input.direction : "backlinks";

        if (direction === "resolve") {
          const resolved = await ctx.linkResolver.resolveWikilink(noteName);
          if (!resolved.ok) return `Error: ${resolved.error}`;
          return JSON.stringify(resolved.value);
        }

        if (direction === "outlinks") {
          const notePath = resolveNotePath(noteName);
          const outlinks = await ctx.linkResolver.getOutlinks(notePath);
          if (!outlinks.ok) return `Error: ${outlinks.error}`;
          return JSON.stringify({ outlinks: outlinks.value });
        }

        // Default: backlinks
        const backlinks = await ctx.linkResolver.getBacklinks(noteName);
        if (!backlinks.ok) return `Error: ${backlinks.error}`;
        return JSON.stringify({ backlinks: backlinks.value });
      }

      default:
        return null;
    }
  };
}

/** System prompt section for obsidian tools. */
export const OBSIDIAN_SYSTEM_PROMPT = `## Obsidian Vault

You have tools to interact with the user's Obsidian vault (obsidian_read, obsidian_write, obsidian_search, obsidian_list, obsidian_daily, obsidian_links).

Use [[wikilinks]] when referencing notes in content you write. Use obsidian_daily for journal entries and daily logs. Use obsidian_links to explore note connections.

When creating notes, use descriptive names and add relevant tags in frontmatter. Respect the vault's folder structure.

Classification is enforced — you can only read notes at or below the current session's security level, and cannot write classified data to lower-classification folders.`;

/** Convert a note name to a vault-relative path. */
function resolveNotePath(name: string): string {
  // Already has .md extension or contains a path separator
  if (name.endsWith(".md")) return name;
  // Has path separators — treat as relative path
  if (name.includes("/")) return name + ".md";
  // Just a name — return as top-level .md file
  return name + ".md";
}

/** Record a lineage entry for an obsidian operation. */
async function recordLineage(
  ctx: ObsidianToolContext,
  notePath: string,
  classification: ClassificationLevel,
  operation: string,
): Promise<void> {
  if (!ctx.lineageStore) return;

  const origin: LineageOrigin = {
    source_type: "obsidian_vault",
    source_name: notePath,
    accessed_at: new Date().toISOString(),
    accessed_by: ctx.sessionId as string,
    access_method: `obsidian_${operation}`,
  };

  const lineageClassification: LineageClassification = {
    level: classification,
    reason: `Obsidian vault ${operation}: ${notePath}`,
  };

  try {
    await ctx.lineageStore.create({
      content: notePath,
      origin,
      classification: lineageClassification,
      sessionId: ctx.sessionId,
    });
  } catch {
    // Lineage failure should not block the operation
  }
}
