/**
 * Google Workspace tool executor.
 *
 * Creates a chain-compatible executor for the 14 Google Workspace tools.
 * Tool definitions live in `tools_defs.ts`; per-domain execution logic
 * lives in `tools_exec_*.ts` modules.
 *
 * @module
 */

import type { GoogleToolContext } from "./types.ts";
import type { ClassificationLevel } from "../../core/types/classification.ts";

import { executeGmailSearch, executeGmailRead, executeGmailSend, executeGmailLabel } from "./gmail/tools_exec_gmail.ts";
import { executeCalendarList, executeCalendarCreate, executeCalendarUpdate } from "./calendar/tools_exec_calendar.ts";
import { executeTasksList, executeTasksCreate, executeTasksComplete } from "./tasks/tools_exec_tasks.ts";
import { executeDriveSearch, executeDriveRead } from "./drive/tools_exec_drive.ts";
import { executeSheetsRead, executeSheetsWrite } from "./sheets/tools_exec_sheets.ts";

// ─── Barrel re-exports from tools_defs.ts ───────────────────────────────────

export { getGoogleToolDefinitions, GOOGLE_TOOLS_SYSTEM_PROMPT } from "./tools_defs.ts";

// ─── Dispatch table ─────────────────────────────────────────────────────────

/** Map tool name to a per-domain executor function. */
function buildDispatchTable(
  ctx: GoogleToolContext,
): ReadonlyMap<string, (input: Record<string, unknown>) => Promise<string>> {
  return new Map<string, (input: Record<string, unknown>) => Promise<string>>([
    ["gmail_search", (input) => executeGmailSearch(ctx.gmail, input)],
    ["gmail_read", (input) => executeGmailRead(ctx.gmail, input)],
    ["gmail_send", (input) => executeGmailSend(ctx.gmail, input)],
    ["gmail_label", (input) => executeGmailLabel(ctx.gmail, input)],
    ["calendar_list", (input) => executeCalendarList(ctx.calendar, input)],
    ["calendar_create", (input) => executeCalendarCreate(ctx.calendar, input)],
    ["calendar_update", (input) => executeCalendarUpdate(ctx.calendar, input)],
    ["tasks_list", (input) => executeTasksList(ctx.tasks, input)],
    ["tasks_create", (input) => executeTasksCreate(ctx.tasks, input)],
    ["tasks_complete", (input) => executeTasksComplete(ctx.tasks, input)],
    ["drive_search", (input) => executeDriveSearch(ctx.drive, input)],
    ["drive_read", (input) => executeDriveRead(ctx.drive, input)],
    ["sheets_read", (input) => executeSheetsRead(ctx.sheets, input)],
    ["sheets_write", (input) => executeSheetsWrite(ctx.sheets, input)],
  ]);
}

// ─── Response Classification ─────────────────────────────────────────────────

/**
 * Inject `_classification` into a tool response so the dispatch layer
 * can escalate session taint via `escalateResponseClassification()`.
 *
 * - JSON objects: adds `_classification` field
 * - JSON arrays: wraps in `{ items, _classification }`
 * - Non-JSON (errors, plain text): returned unchanged
 */
export function injectResponseClassification(
  result: string,
  sessionTaint: ClassificationLevel,
): string {
  try {
    const parsed: unknown = JSON.parse(result);
    if (Array.isArray(parsed)) {
      return JSON.stringify({ items: parsed, _classification: sessionTaint });
    }
    if (typeof parsed === "object" && parsed !== null) {
      return JSON.stringify({ ...parsed as Record<string, unknown>, _classification: sessionTaint });
    }
  } catch {
    /* Not JSON (error string or plain text) — return as-is */
  }
  return result;
}

// ─── Executor ───────────────────────────────────────────────────────────────

/**
 * Create a tool executor for Google Workspace tools.
 *
 * Returns null for unknown tool names (allowing chaining with other executors).
 * Every successful JSON response is annotated with `_classification` set to
 * the current session taint, enabling response-based taint escalation.
 *
 * @param ctx - Google tool context with services and session state
 * @returns An executor function: (name, input) => Promise<string | null>
 */
export function createGoogleToolExecutor(
  ctx: GoogleToolContext,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  const dispatch = buildDispatchTable(ctx);

  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    const handler = dispatch.get(name);
    if (!handler) return null;
    const result = await handler(input);
    return injectResponseClassification(result, ctx.sessionTaint());
  };
}
