/**
 * Google Workspace shared types — barrel re-export.
 *
 * All interfaces for OAuth2 auth, Gmail, Calendar, Tasks, Drive,
 * and Sheets services. Split by domain concept into dedicated files.
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
} from "./types_auth.ts";

export type {
  GmailMessage,
  GmailSearchOptions,
  GmailSendOptions,
  GmailLabelOptions,
  GmailService,
} from "./types_gmail.ts";

export type {
  Attendee,
  CalendarEvent,
  CalendarListOptions,
  CalendarCreateOptions,
  CalendarUpdateOptions,
  CalendarService,
} from "./types_calendar.ts";

export type {
  TaskItem,
  TaskListOptions,
  TaskCreateOptions,
  TasksService,
} from "./types_tasks.ts";

export type {
  DriveFile,
  DriveSearchOptions,
  DriveService,
} from "./types_drive.ts";

export type {
  SheetRange,
  SheetWriteOptions,
  SheetsService,
} from "./types_sheets.ts";

export type { GoogleToolContext } from "./types_context.ts";
