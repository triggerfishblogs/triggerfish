/**
 * Google Calendar service types.
 *
 * Event, attendee, and CRUD option interfaces for the Calendar API.
 *
 * @module
 */

import type { GoogleApiResult } from "../auth/types_auth.ts";

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
