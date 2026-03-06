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

function buildGmailDispatch(
  ctx: GoogleToolContext,
): Readonly<Record<string, ActionHandler>> {
  return {
    search: (input) => executeGmailSearch(ctx.gmail, input),
    read: (input) => executeGmailRead(ctx.gmail, input),
    send: (input) => executeGmailSend(ctx.gmail, input),
    label: (input) => executeGmailLabel(ctx.gmail, input),
  };
}

function buildCalendarDispatch(
  ctx: GoogleToolContext,
): Readonly<Record<string, ActionHandler>> {
  return {
    list: (input) => executeCalendarList(ctx.calendar, input),
    create: (input) => executeCalendarCreate(ctx.calendar, input),
    update: (input) => executeCalendarUpdate(ctx.calendar, input),
  };
}

function buildTasksDispatch(
  ctx: GoogleToolContext,
): Readonly<Record<string, ActionHandler>> {
  return {
    list: (input) => executeTasksList(ctx.tasks, input),
    create: (input) => executeTasksCreate(ctx.tasks, input),
    complete: (input) => executeTasksComplete(ctx.tasks, input),
  };
}

function buildDriveDispatch(
  ctx: GoogleToolContext,
): Readonly<Record<string, ActionHandler>> {
  return {
    search: (input) => executeDriveSearch(ctx.drive, input),
    read: (input) => executeDriveRead(ctx.drive, input),
  };
}

function buildSheetsDispatch(
  ctx: GoogleToolContext,
): Readonly<Record<string, ActionHandler>> {
  return {
    read: (input) => executeSheetsRead(ctx.sheets, input),
    write: (input) => executeSheetsWrite(ctx.sheets, input),
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
