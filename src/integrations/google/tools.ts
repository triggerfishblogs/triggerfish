/**
 * Google Workspace tool executor.
 *
 * Creates a chain-compatible executor for the 5 consolidated Google
 * Workspace tools. Each tool dispatches on the `action` parameter
 * to the per-service executor module.
 *
 * @module
 */

import type { GoogleToolContext } from "./types.ts";
import { recordGoogleLineage } from "./lineage.ts";

import {
  executeGmailLabel,
  executeGmailRead,
  executeGmailSearch,
  executeGmailSend,
} from "./gmail/tools_exec_gmail.ts";
import {
  executeCalendarCreate,
  executeCalendarList,
  executeCalendarUpdate,
} from "./calendar/tools_exec_calendar.ts";
import {
  executeTasksComplete,
  executeTasksCreate,
  executeTasksList,
} from "./tasks/tools_exec_tasks.ts";
import {
  executeDriveRead,
  executeDriveSearch,
} from "./drive/tools_exec_drive.ts";
import {
  executeSheetsRead,
  executeSheetsWrite,
} from "./sheets/tools_exec_sheets.ts";

// ─── Barrel re-exports from tools_defs.ts ───────────────────────────────────

export {
  getGoogleToolDefinitions,
  GOOGLE_TOOLS_SYSTEM_PROMPT,
} from "./tools_defs.ts";

// ─── Action dispatch tables ─────────────────────────────────────────────────

type ActionHandler = (input: Record<string, unknown>) => Promise<string>;

/** Wrap an executor call so lineage is recorded after a successful response. */
function withLineage(
  ctx: GoogleToolContext,
  service: string,
  action: string,
  handler: (input: Record<string, unknown>) => Promise<string>,
): ActionHandler {
  return async (input) => {
    const result = await handler(input);
    await recordGoogleLineage(ctx, service, action, result);
    return result;
  };
}

function buildGmailDispatch(
  ctx: GoogleToolContext,
): Readonly<Record<string, ActionHandler>> {
  return {
    search: withLineage(ctx, "gmail", "search", (i) =>
      executeGmailSearch(ctx.gmail, i)),
    read: withLineage(ctx, "gmail", "read", (i) =>
      executeGmailRead(ctx.gmail, i)),
    send: withLineage(ctx, "gmail", "send", (i) =>
      executeGmailSend(ctx.gmail, i)),
    label: withLineage(ctx, "gmail", "label", (i) =>
      executeGmailLabel(ctx.gmail, i)),
  };
}

function buildCalendarDispatch(
  ctx: GoogleToolContext,
): Readonly<Record<string, ActionHandler>> {
  return {
    list: withLineage(ctx, "calendar", "list", (i) =>
      executeCalendarList(ctx.calendar, i)),
    create: withLineage(ctx, "calendar", "create", (i) =>
      executeCalendarCreate(ctx.calendar, i)),
    update: withLineage(ctx, "calendar", "update", (i) =>
      executeCalendarUpdate(ctx.calendar, i)),
  };
}

function buildTasksDispatch(
  ctx: GoogleToolContext,
): Readonly<Record<string, ActionHandler>> {
  return {
    list: withLineage(ctx, "tasks", "list", (i) =>
      executeTasksList(ctx.tasks, i)),
    create: withLineage(ctx, "tasks", "create", (i) =>
      executeTasksCreate(ctx.tasks, i)),
    complete: withLineage(ctx, "tasks", "complete", (i) =>
      executeTasksComplete(ctx.tasks, i)),
  };
}

function buildDriveDispatch(
  ctx: GoogleToolContext,
): Readonly<Record<string, ActionHandler>> {
  return {
    search: withLineage(ctx, "drive", "search", (i) =>
      executeDriveSearch(ctx.drive, i)),
    read: withLineage(ctx, "drive", "read", (i) =>
      executeDriveRead(ctx.drive, i)),
  };
}

function buildSheetsDispatch(
  ctx: GoogleToolContext,
): Readonly<Record<string, ActionHandler>> {
  return {
    read: withLineage(ctx, "sheets", "read", (i) =>
      executeSheetsRead(ctx.sheets, i)),
    write: withLineage(ctx, "sheets", "write", (i) =>
      executeSheetsWrite(ctx.sheets, i)),
  };
}

// ─── Executor ───────────────────────────────────────────────────────────────

/**
 * Create a tool executor for Google Workspace tools.
 *
 * Returns null for unknown tool names (allowing chaining with other executors).
 *
 * @param ctx - Google tool context with services and session state
 * @returns An executor function: (name, input) => Promise<string | null>
 */
export function createGoogleToolExecutor(
  ctx: GoogleToolContext,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  const dispatchers: Readonly<
    Record<string, Readonly<Record<string, ActionHandler>>>
  > = {
    google_gmail: buildGmailDispatch(ctx),
    google_calendar: buildCalendarDispatch(ctx),
    google_tasks: buildTasksDispatch(ctx),
    google_drive: buildDriveDispatch(ctx),
    google_sheets: buildSheetsDispatch(ctx),
  };

  // deno-lint-ignore require-await
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    const actionMap = dispatchers[name];
    if (!actionMap) return null;

    const action = input.action;
    if (typeof action !== "string" || action.length === 0) {
      return `Error: ${name} requires an 'action' parameter (string).`;
    }

    const handler = actionMap[action];
    if (!handler) {
      const valid = Object.keys(actionMap).join(", ");
      return `Error: unknown action "${action}" for ${name}. Valid actions: ${valid}`;
    }

    return handler(input);
  };
}
