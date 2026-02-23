/**
 * Google Workspace module — Gmail, Calendar, Tasks, Drive, Sheets.
 *
 * @module
 */

export type {
  GoogleAuthConfig,
  GoogleAuthManager,
  GoogleAuthResult,
  GoogleTokens,
  GoogleApiClient,
  GoogleApiResult,
  GoogleApiError,
  GoogleToolContext,
  GmailMessage,
  GmailSearchOptions,
  GmailSendOptions,
  GmailLabelOptions,
  GmailService,
  CalendarEvent,
  Attendee,
  CalendarListOptions,
  CalendarCreateOptions,
  CalendarUpdateOptions,
  CalendarService,
  TaskItem,
  TaskListOptions,
  TaskCreateOptions,
  TasksService,
  DriveFile,
  DriveSearchOptions,
  DriveService,
  SheetRange,
  SheetWriteOptions,
  SheetsService,
} from "./types.ts";

export { createGoogleAuthManager } from "./auth/auth.ts";

export { createGoogleApiClient } from "./auth/client.ts";

export { createGmailService } from "./gmail/gmail.ts";
export { createCalendarService } from "./calendar/calendar.ts";
export { createTasksService } from "./tasks/tasks.ts";
export { createDriveService } from "./drive/drive.ts";
export { createSheetsService } from "./sheets/sheets.ts";

export {
  getGoogleToolDefinitions,
  createGoogleToolExecutor,
  GOOGLE_TOOLS_SYSTEM_PROMPT,
} from "./tools.ts";
