/**
 * Shared types for the CalDAV integration.
 *
 * All types are readonly and use the `Result<T, E>` pattern.
 * Classification is tracked on events for security gating.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { SessionId } from "../../core/types/session.ts";

/** Authentication method for CalDAV connections. */
export type CalDavAuthMethod = "basic" | "oauth2" | "app-specific";

/** Credentials for basic/app-specific password authentication. */
export interface CalDavBasicCredentials {
  readonly method: "basic";
  readonly username: string;
  readonly password: string;
}

/** Credentials for OAuth2 token authentication. */
export interface CalDavOAuth2Credentials {
  readonly method: "oauth2";
  readonly accessToken: string;
  readonly refreshToken?: string;
}

/** Discriminated union of credential types. */
export type CalDavCredentials = CalDavBasicCredentials | CalDavOAuth2Credentials;

/** A CalDAV calendar resource. */
export interface CalDavCalendar {
  readonly url: string;
  readonly displayName: string;
  readonly ctag: string;
  readonly color?: string;
  readonly description?: string;
}

/** An attendee on a CalDAV event. */
export interface CalDavAttendee {
  readonly email: string;
  readonly name?: string;
  readonly role?: string;
  readonly status?: string;
}

/** Recurrence rule for a CalDAV event. */
export interface CalDavRecurrence {
  readonly frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  readonly interval?: number;
  readonly count?: number;
  readonly until?: string;
  readonly byDay?: readonly string[];
  readonly byMonth?: readonly number[];
  readonly byMonthDay?: readonly number[];
}

/** A CalDAV event (VEVENT). */
export interface CalDavEvent {
  readonly uid: string;
  readonly url: string;
  readonly etag: string;
  readonly summary: string;
  readonly start: string;
  readonly end: string;
  readonly allDay: boolean;
  readonly location?: string;
  readonly description?: string;
  readonly attendees: readonly CalDavAttendee[];
  readonly recurrence?: CalDavRecurrence;
  readonly organizer?: string;
  readonly status?: string;
  readonly created?: string;
  readonly lastModified?: string;
}

/** Input for creating a new CalDAV event. */
export interface CalDavEventInput {
  readonly uid: string;
  readonly summary: string;
  readonly start: string;
  readonly end: string;
  readonly allDay?: boolean;
  readonly location?: string;
  readonly description?: string;
  readonly attendees?: readonly CalDavAttendee[];
  readonly recurrence?: CalDavRecurrence;
  readonly organizer?: string;
  readonly status?: string;
}

/** A free/busy time slot. */
export interface CalDavFreeBusy {
  readonly start: string;
  readonly end: string;
  readonly type: "BUSY" | "FREE" | "TENTATIVE";
}

/** Error from a CalDAV operation. */
export interface CalDavError {
  readonly status: number;
  readonly message: string;
}

/** CalDAV configuration from triggerfish.yaml. */
export interface CalDavConfig {
  readonly enabled?: boolean;
  readonly server_url?: string;
  readonly username?: string;
  readonly credential_ref?: string;
  readonly default_calendar?: string;
  readonly classification?: string;
}

/** Context for CalDAV tool executor. */
export interface CalDavToolContext {
  readonly client: CalDavClientInterface;
  readonly calendarHomeUrl: string;
  readonly defaultCalendar?: string;
  readonly sessionTaint: () => ClassificationLevel;
  readonly sourceSessionId: SessionId;
  readonly classificationFloor?: ClassificationLevel;
}

/** CalDAV client interface for dependency injection. */
export interface CalDavClientInterface {
  readonly propfind: (
    url: string,
    depth: "0" | "1",
    properties: readonly string[],
  ) => Promise<CalDavClientResult<PropfindResponse>>;
  readonly report: (
    url: string,
    body: string,
  ) => Promise<CalDavClientResult<ReportResponse>>;
  readonly put: (
    url: string,
    icalData: string,
    etag?: string,
  ) => Promise<CalDavClientResult<PutResponse>>;
  readonly deleteResource: (
    url: string,
    etag?: string,
  ) => Promise<CalDavClientResult<void>>;
}

/** Result type for CalDAV client operations. */
export type CalDavClientResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: CalDavError };

/** Response from a PROPFIND request. */
export interface PropfindResponse {
  readonly responses: readonly PropfindResource[];
}

/** A single resource in a PROPFIND response. */
export interface PropfindResource {
  readonly href: string;
  readonly properties: Readonly<Record<string, string>>;
  readonly status?: string;
}

/** Response from a REPORT request. */
export interface ReportResponse {
  readonly resources: readonly ReportResource[];
}

/** A single resource in a REPORT response. */
export interface ReportResource {
  readonly href: string;
  readonly etag: string;
  readonly calendarData: string;
}

/** Response from a PUT request. */
export interface PutResponse {
  readonly etag: string;
  readonly href: string;
}

/** Result of CalDAV server discovery. */
export interface DiscoveryResult {
  readonly principalUrl: string;
  readonly calendarHomeUrl: string;
  readonly serverType?: string;
}
