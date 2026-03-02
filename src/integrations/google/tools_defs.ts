/**
 * Google Workspace tool definitions and system prompt.
 *
 * Barrel that re-exports the 14 tool schemas across Gmail, Calendar,
 * Tasks, Drive, and Sheets from their dedicated per-service modules.
 *
 * @module
 */

import type { ToolDefinition } from "../../core/types/tool.ts";

import {
  buildGmailLabelDef,
  buildGmailReadDef,
  buildGmailSearchDef,
  buildGmailSendDef,
} from "./gmail/tools_defs_gmail.ts";

import {
  buildCalendarCreateDef,
  buildCalendarListDef,
  buildCalendarUpdateDef,
} from "./calendar/tools_defs_calendar.ts";

import {
  buildTasksCompleteDef,
  buildTasksCreateDef,
  buildTasksListDef,
} from "./tasks/tools_defs_tasks.ts";

import {
  buildDriveReadDef,
  buildDriveSearchDef,
} from "./drive/tools_defs_drive.ts";

import {
  buildSheetsReadDef,
  buildSheetsWriteDef,
} from "./sheets/tools_defs_sheets.ts";

// ── Public API ──

/** Get all 14 Google Workspace tool definitions. */
export function getGoogleToolDefinitions(): readonly ToolDefinition[] {
  return [
    buildGmailSearchDef(),
    buildGmailReadDef(),
    buildGmailSendDef(),
    buildGmailLabelDef(),
    buildCalendarListDef(),
    buildCalendarCreateDef(),
    buildCalendarUpdateDef(),
    buildTasksListDef(),
    buildTasksCreateDef(),
    buildTasksCompleteDef(),
    buildDriveSearchDef(),
    buildDriveReadDef(),
    buildSheetsReadDef(),
    buildSheetsWriteDef(),
  ];
}

/** System prompt section explaining Google Workspace tools to the LLM. */
export const GOOGLE_TOOLS_SYSTEM_PROMPT = `## Google Workspace

You have access to Google Workspace tools for Gmail, Calendar, Tasks, Drive, and Sheets.

- Use gmail_search to find emails, then gmail_read for full content. Use gmail_send to compose and send.
- Use calendar_list to see upcoming events. Use calendar_create and calendar_update to manage the schedule.
- Use tasks_list, tasks_create, and tasks_complete for task management.
- Use drive_search to find files, then drive_read for content. For spreadsheets, prefer sheets_read/sheets_write.
- When the user asks about their schedule, emails, or documents, use these tools directly — never narrate intent.
- All Google data is classified at least INTERNAL. Do not share Google data on PUBLIC channels.`;
