/**
 * Google Workspace shared types.
 *
 * All interfaces for OAuth2 auth, Gmail, Calendar, Tasks, Drive,
 * and Sheets services. All properties are readonly.
 *
 * @module
 */

import type { ClassificationLevel } from "../core/types/classification.ts";
import type { SessionId } from "../core/types/session.ts";
import type { LineageStore } from "../core/session/lineage.ts";

// ─── Auth ────────────────────────────────────────────────────────────────────

/** OAuth2 client configuration for Google APIs. */
export interface GoogleAuthConfig {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  readonly scopes: readonly string[];
}

/** OAuth2 token pair stored in the secret store. */
export interface GoogleTokens {
  readonly access_token: string;
  readonly refresh_token: string;
  readonly expires_at: number;
  readonly scope: string;
  readonly token_type: string;
  readonly clientId: string;
  readonly clientSecret: string;
}

/** Google auth manager for obtaining and refreshing access tokens. */
export interface GoogleAuthManager {
  /** Build the Google OAuth2 consent URL for the user. */
  readonly getConsentUrl: (config: GoogleAuthConfig) => string;
  /** Exchange an authorization code for tokens. */
  readonly exchangeCode: (
    code: string,
    config: GoogleAuthConfig,
  ) => Promise<GoogleAuthResult>;
  /** Get a valid access token, refreshing if needed. */
  readonly getAccessToken: () => Promise<GoogleAuthResult>;
  /** Store tokens in the secret store. */
  readonly storeTokens: (tokens: GoogleTokens) => Promise<void>;
  /** Clear stored tokens. */
  readonly clearTokens: () => Promise<void>;
  /** Check if tokens are stored. */
  readonly hasTokens: () => Promise<boolean>;
}

/** Result of an auth operation — either a token string or an error. */
export type GoogleAuthResult =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly error: GoogleApiError };

// ─── API Client ──────────────────────────────────────────────────────────────

/** Authenticated HTTP client for Google APIs. */
export interface GoogleApiClient {
  /** HTTP GET with query parameters. */
  readonly get: <T>(
    url: string,
    params?: Record<string, string>,
  ) => Promise<GoogleApiResult<T>>;
  /** HTTP POST with JSON body. */
  readonly post: <T>(
    url: string,
    body: unknown,
  ) => Promise<GoogleApiResult<T>>;
  /** HTTP PATCH with JSON body. */
  readonly patch: <T>(
    url: string,
    body: unknown,
  ) => Promise<GoogleApiResult<T>>;
  /** HTTP PUT with JSON body. */
  readonly put: <T>(
    url: string,
    body: unknown,
  ) => Promise<GoogleApiResult<T>>;
}

/** Result of a Google API call. */
export type GoogleApiResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: GoogleApiError };

/** Error from a Google API call. */
export interface GoogleApiError {
  readonly code: string;
  readonly message: string;
  readonly status?: number;
}

// ─── Gmail ───────────────────────────────────────────────────────────────────

/** A Gmail message with decoded body. */
export interface GmailMessage {
  readonly id: string;
  readonly threadId: string;
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly date: string;
  readonly snippet: string;
  readonly body: string;
  readonly labelIds: readonly string[];
}

/** Options for searching Gmail messages. */
export interface GmailSearchOptions {
  readonly query: string;
  readonly maxResults?: number;
}

/** Options for sending an email. */
export interface GmailSendOptions {
  readonly to: string;
  readonly subject: string;
  readonly body: string;
  readonly cc?: string;
  readonly bcc?: string;
}

/** Options for labeling a message. */
export interface GmailLabelOptions {
  readonly messageId: string;
  readonly addLabelIds?: readonly string[];
  readonly removeLabelIds?: readonly string[];
}

/** Gmail service interface. */
export interface GmailService {
  readonly search: (
    options: GmailSearchOptions,
  ) => Promise<GoogleApiResult<readonly GmailMessage[]>>;
  readonly read: (messageId: string) => Promise<GoogleApiResult<GmailMessage>>;
  readonly send: (
    options: GmailSendOptions,
  ) => Promise<GoogleApiResult<{ readonly id: string }>>;
  readonly label: (
    options: GmailLabelOptions,
  ) => Promise<GoogleApiResult<{ readonly id: string }>>;
}

// ─── Calendar ────────────────────────────────────────────────────────────────

/** An attendee on a calendar event. */
export interface Attendee {
  readonly email: string;
  readonly displayName?: string;
  readonly responseStatus?: string;
}

/** A Google Calendar event. */
export interface CalendarEvent {
  readonly id: string;
  readonly summary: string;
  readonly description?: string;
  readonly location?: string;
  readonly start: string;
  readonly end: string;
  readonly attendees?: readonly Attendee[];
  readonly htmlLink?: string;
  readonly status?: string;
}

/** Options for listing calendar events. */
export interface CalendarListOptions {
  readonly timeMin?: string;
  readonly timeMax?: string;
  readonly maxResults?: number;
  readonly calendarId?: string;
}

/** Options for creating a calendar event. */
export interface CalendarCreateOptions {
  readonly summary: string;
  readonly description?: string;
  readonly location?: string;
  readonly start: string;
  readonly end: string;
  readonly attendees?: readonly string[];
  readonly calendarId?: string;
}

/** Options for updating a calendar event. */
export interface CalendarUpdateOptions {
  readonly eventId: string;
  readonly summary?: string;
  readonly description?: string;
  readonly location?: string;
  readonly start?: string;
  readonly end?: string;
  readonly attendees?: readonly string[];
  readonly calendarId?: string;
}

/** Calendar service interface. */
export interface CalendarService {
  readonly list: (
    options: CalendarListOptions,
  ) => Promise<GoogleApiResult<readonly CalendarEvent[]>>;
  readonly create: (
    options: CalendarCreateOptions,
  ) => Promise<GoogleApiResult<CalendarEvent>>;
  readonly update: (
    options: CalendarUpdateOptions,
  ) => Promise<GoogleApiResult<CalendarEvent>>;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

/** A Google Tasks item. */
export interface TaskItem {
  readonly id: string;
  readonly title: string;
  readonly notes?: string;
  readonly status: string;
  readonly due?: string;
  readonly completed?: string;
}

/** Options for listing tasks. */
export interface TaskListOptions {
  readonly taskListId?: string;
  readonly showCompleted?: boolean;
  readonly maxResults?: number;
}

/** Options for creating a task. */
export interface TaskCreateOptions {
  readonly title: string;
  readonly notes?: string;
  readonly due?: string;
  readonly taskListId?: string;
}

/** Tasks service interface. */
export interface TasksService {
  readonly list: (
    options: TaskListOptions,
  ) => Promise<GoogleApiResult<readonly TaskItem[]>>;
  readonly create: (
    options: TaskCreateOptions,
  ) => Promise<GoogleApiResult<TaskItem>>;
  readonly complete: (
    taskId: string,
    taskListId?: string,
  ) => Promise<GoogleApiResult<TaskItem>>;
}

// ─── Drive ───────────────────────────────────────────────────────────────────

/** A Google Drive file. */
export interface DriveFile {
  readonly id: string;
  readonly name: string;
  readonly mimeType: string;
  readonly modifiedTime?: string;
  readonly size?: string;
  readonly webViewLink?: string;
}

/** Options for searching Drive files. */
export interface DriveSearchOptions {
  readonly query: string;
  readonly maxResults?: number;
}

/** Drive service interface. */
export interface DriveService {
  readonly search: (
    options: DriveSearchOptions,
  ) => Promise<GoogleApiResult<readonly DriveFile[]>>;
  readonly read: (fileId: string) => Promise<GoogleApiResult<string>>;
}

// ─── Sheets ──────────────────────────────────────────────────────────────────

/** A range of values in a Google Sheet. */
export interface SheetRange {
  readonly range: string;
  readonly values: readonly (readonly string[])[];
}

/** Options for writing to a sheet range. */
export interface SheetWriteOptions {
  readonly spreadsheetId: string;
  readonly range: string;
  readonly values: readonly (readonly string[])[];
}

/** Sheets service interface. */
export interface SheetsService {
  readonly read: (
    spreadsheetId: string,
    range: string,
  ) => Promise<GoogleApiResult<SheetRange>>;
  readonly write: (
    options: SheetWriteOptions,
  ) => Promise<GoogleApiResult<SheetRange>>;
}

// ─── Tool Context ────────────────────────────────────────────────────────────

/** Context required by the Google tool executor. */
export interface GoogleToolContext {
  readonly gmail: GmailService;
  readonly calendar: CalendarService;
  readonly tasks: TasksService;
  readonly drive: DriveService;
  readonly sheets: SheetsService;
  readonly sessionTaint: ClassificationLevel;
  readonly sourceSessionId: SessionId;
  readonly lineageStore?: LineageStore;
  readonly classificationFloors?: Readonly<
    Record<string, ClassificationLevel>
  >;
}
