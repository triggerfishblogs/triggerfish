/**
 * Obsidian tool executor — LLM-callable operations for vault interaction.
 *
 * Implements the 6 obsidian tool handlers with classification enforcement:
 * - Reads: verify canFlowTo(noteClassification, sessionTaint)
 * - Writes: verify canFlowTo(sessionTaint, folderClassification) — prevent write-down
 *
 * Types, tool definitions, and system prompt live in `tools_defs.ts`.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import { canFlowTo } from "../../core/types/classification.ts";
import type { LineageOrigin, LineageClassification } from "../../core/session/lineage.ts";
import { getClassificationForPath } from "./vault.ts";
import { createLogger } from "../../core/logger/logger.ts";

import type { ObsidianToolContext } from "./tools_defs.ts";

const log = createLogger("security");

// ─── Barrel re-exports from tools_defs.ts ───────────────────────────────────

export {
  getObsidianToolDefinitions,
  OBSIDIAN_SYSTEM_PROMPT,
} from "./tools_defs.ts";
export type { ObsidianToolContext } from "./tools_defs.ts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Executor ────────────────────────────────────────────────────────────────

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
          log.warn("Obsidian read blocked: classification exceeds session taint", {
            notePath,
            noteClassification,
            sessionTaint: ctx.getSessionTaint(),
          });
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
          log.warn("Obsidian write-down blocked", {
            notePath,
            sessionTaint: ctx.getSessionTaint(),
            folderClassification,
          });
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
