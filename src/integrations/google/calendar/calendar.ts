/**
 * Google Calendar service — list, create, and update events.
 *
 * @module
 */

import type {
  CalendarCreateOptions,
  CalendarEvent,
  CalendarListOptions,
  CalendarService,
  CalendarUpdateOptions,
  GoogleApiClient,
  GoogleApiResult,
} from "../types.ts";

/** Calendar API base URL. */
const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";

/** Raw Calendar API event shape. */
interface CalendarApiEvent {
  readonly id: string;
  readonly summary?: string;
  readonly description?: string;
  readonly location?: string;
  readonly start?: { readonly dateTime?: string; readonly date?: string };
  readonly end?: { readonly dateTime?: string; readonly date?: string };
  readonly attendees?: readonly {
    readonly email: string;
    readonly displayName?: string;
    readonly responseStatus?: string;
  }[];
  readonly htmlLink?: string;
  readonly status?: string;
}

/** Convert a raw API event to a CalendarEvent. */
function toCalendarEvent(event: CalendarApiEvent): CalendarEvent {
  return {
    id: event.id,
    summary: event.summary ?? "",
    description: event.description,
    location: event.location,
    start: event.start?.dateTime ?? event.start?.date ?? "",
    end: event.end?.dateTime ?? event.end?.date ?? "",
    attendees: event.attendees?.map((a) => ({
      email: a.email,
      displayName: a.displayName,
      responseStatus: a.responseStatus,
    })),
    htmlLink: event.htmlLink,
    status: event.status,
  };
}

/** List calendar events with optional time range filter. */
async function listCalendarEvents(
  client: GoogleApiClient,
  options: CalendarListOptions,
): Promise<GoogleApiResult<readonly CalendarEvent[]>> {
  const calendarId = options.calendarId ?? "primary";
  const params: Record<string, string> = {
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(options.maxResults ?? 10),
  };
  if (options.timeMin) params.timeMin = options.timeMin;
  if (options.timeMax) params.timeMax = options.timeMax;

  const result = await client.get<{
    readonly items?: readonly CalendarApiEvent[];
  }>(`${CALENDAR_BASE}/calendars/${calendarId}/events`, params);

  if (!result.ok) return result;
  return { ok: true, value: (result.value.items ?? []).map(toCalendarEvent) };
}

/** Create a new calendar event. */
async function createCalendarEvent(
  client: GoogleApiClient,
  options: CalendarCreateOptions,
): Promise<GoogleApiResult<CalendarEvent>> {
  const calendarId = options.calendarId ?? "primary";
  const body: Record<string, unknown> = {
    summary: options.summary,
    start: { dateTime: options.start },
    end: { dateTime: options.end },
  };
  if (options.description) body.description = options.description;
  if (options.location) body.location = options.location;
  if (options.attendees) {
    body.attendees = options.attendees.map((email) => ({ email }));
  }

  const result = await client.post<CalendarApiEvent>(
    `${CALENDAR_BASE}/calendars/${calendarId}/events`,
    body,
  );
  if (!result.ok) return result;
  return { ok: true, value: toCalendarEvent(result.value) };
}

/** Update an existing calendar event with partial fields. */
async function updateCalendarEvent(
  client: GoogleApiClient,
  options: CalendarUpdateOptions,
): Promise<GoogleApiResult<CalendarEvent>> {
  const calendarId = options.calendarId ?? "primary";
  const body: Record<string, unknown> = {};
  if (options.summary !== undefined) body.summary = options.summary;
  if (options.description !== undefined) body.description = options.description;
  if (options.location !== undefined) body.location = options.location;
  if (options.start !== undefined) body.start = { dateTime: options.start };
  if (options.end !== undefined) body.end = { dateTime: options.end };
  if (options.attendees !== undefined) {
    body.attendees = options.attendees.map((email) => ({ email }));
  }

  const result = await client.patch<CalendarApiEvent>(
    `${CALENDAR_BASE}/calendars/${calendarId}/events/${options.eventId}`,
    body,
  );
  if (!result.ok) return result;
  return { ok: true, value: toCalendarEvent(result.value) };
}

/**
 * Create a Google Calendar service.
 *
 * @param client - Authenticated Google API client
 */
export function createCalendarService(
  client: GoogleApiClient,
): CalendarService {
  return {
    list: (options) => listCalendarEvents(client, options),
    create: (options) => createCalendarEvent(client, options),
    update: (options) => updateCalendarEvent(client, options),
  };
}
