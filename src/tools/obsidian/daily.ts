/**
 * Daily note management — create, retrieve, and append to daily notes.
 *
 * Supports configurable date formats (YYYY, MM, DD subset) and templates.
 * Creates the daily notes folder if missing.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import type { DailyNotesConfig, ObsidianNote } from "./types.ts";
import type { VaultContext } from "./vault.ts";
import type { NoteStore } from "./notes/mod.ts";

/** Default daily notes configuration. */
const DEFAULT_DAILY_CONFIG: DailyNotesConfig = {
  folder: "daily",
  dateFormat: "YYYY-MM-DD",
};

/** Interface for daily note operations. */
export interface DailyNoteManager {
  /** Get or create a daily note for the given date. */
  getOrCreate(
    date?: string,
    template?: string,
  ): Promise<Result<ObsidianNote, string>>;
  /** Get recent daily notes (most recent first). */
  getRecent(count?: number): Promise<Result<readonly ObsidianNote[], string>>;
  /** Append text to a daily note (creates if missing). */
  append(text: string, date?: string): Promise<Result<ObsidianNote, string>>;
}

/**
 * Create a DailyNoteManager for the given vault context.
 */
export function createDailyNoteManager(
  ctx: VaultContext,
  noteStore: NoteStore,
): DailyNoteManager {
  const dailyConfig = ctx.config.dailyNotes ?? DEFAULT_DAILY_CONFIG;

  return {
    async getOrCreate(
      date?: string,
      template?: string,
    ): Promise<Result<ObsidianNote, string>> {
      const dateStr = date ?? todayString();
      const parseResult = parseDate(dateStr);
      if (!parseResult.ok) return parseResult;

      const filename = formatDate(parseResult.value, dailyConfig.dateFormat);
      const notePath = `${dailyConfig.folder}/${filename}.md`;

      // Try to read existing
      const existing = await noteStore.read(notePath);
      if (existing.ok) return existing;

      // Create new daily note
      const templatePath = template ?? dailyConfig.template;
      return noteStore.create({
        path: notePath,
        content: `# ${filename}\n\n`,
        template: templatePath,
      });
    },

    async getRecent(
      count?: number,
    ): Promise<Result<readonly ObsidianNote[], string>> {
      const max = count ?? 7;
      const result = await noteStore.list({
        folder: dailyConfig.folder,
        sortBy: "modified",
        maxResults: max,
      });
      return result;
    },

    async append(
      text: string,
      date?: string,
    ): Promise<Result<ObsidianNote, string>> {
      const dateStr = date ?? todayString();
      const parseResult = parseDate(dateStr);
      if (!parseResult.ok) return parseResult;

      const filename = formatDate(parseResult.value, dailyConfig.dateFormat);
      const notePath = `${dailyConfig.folder}/${filename}.md`;

      // Ensure the note exists first
      const existing = await noteStore.read(notePath);
      if (!existing.ok) {
        // Create it first
        const created = await noteStore.create({
          path: notePath,
          content: `# ${filename}\n\n`,
        });
        if (!created.ok) return created;
      }

      // Append to the note
      return noteStore.update({
        path: notePath,
        append: text,
      });
    },
  };
}

/** Parsed date components. */
interface DateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/** Get today as YYYY-MM-DD. */
function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a YYYY-MM-DD string into date parts. */
function parseDate(dateStr: string): Result<DateParts, string> {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return {
      ok: false,
      error: `Invalid date format (expected YYYY-MM-DD): ${dateStr}`,
    };
  }
  return {
    ok: true,
    value: {
      year: parseInt(match[1], 10),
      month: parseInt(match[2], 10),
      day: parseInt(match[3], 10),
    },
  };
}

/** Format date parts using a format string (supports YYYY, MM, DD). */
function formatDate(parts: DateParts, format: string): string {
  return format
    .replace("YYYY", String(parts.year))
    .replace("MM", String(parts.month).padStart(2, "0"))
    .replace("DD", String(parts.day).padStart(2, "0"));
}
