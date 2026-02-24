/**
 * CalDAV tool definitions and executor for the agent.
 *
 * Provides 7 `caldav_*` tools for calendar CRUD, listing, and free/busy queries.
 * Follows the same dispatch pattern as Google and GitHub integrations.
 *
 * @module
 */

import type { ToolDefinition } from "../../core/types/tool.ts";
import type {
  CalDavToolContext,
  CalDavCalendar,
  CalDavEvent,
} from "./types.ts";
import { parseVEvent, parseVEvents, generateVEvent, parseFreeBusy } from "./ical.ts";
import { listCalendars } from "./discovery.ts";
import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("caldav:tools");

// ─── Tool Definitions ─────────────────────────────────────────────────────────

/** Build the caldav_calendars_list tool definition. */
function buildCalendarsListDef(): ToolDefinition {
  return {
    name: "caldav_calendars_list",
    description:
      "List available CalDAV calendars. Returns calendar names, URLs, and colors.",
    parameters: {},
  };
}

/** Build the caldav_events_list tool definition. */
function buildEventsListDef(): ToolDefinition {
  return {
    name: "caldav_events_list",
    description:
      "List events in a date range. Returns events with summary, times, and location.",
    parameters: {
      time_min: {
        type: "string",
        description:
          "Start of date range (ISO 8601, e.g. '2025-03-01T00:00:00Z')",
        required: true,
      },
      time_max: {
        type: "string",
        description:
          "End of date range (ISO 8601, e.g. '2025-03-31T23:59:59Z')",
        required: true,
      },
      calendar_id: {
        type: "string",
        description: "Calendar URL. Uses default calendar if omitted.",
        required: false,
      },
      max_results: {
        type: "number",
        description: "Maximum number of events to return (default: 50)",
        required: false,
      },
    },
  };
}

/** Build the caldav_events_get tool definition. */
function buildEventsGetDef(): ToolDefinition {
  return {
    name: "caldav_events_get",
    description:
      "Get full details for a specific event by UID. Includes attendees, recurrence, and notes.",
    parameters: {
      event_uid: {
        type: "string",
        description: "The UID of the event to retrieve",
        required: true,
      },
      calendar_id: {
        type: "string",
        description: "Calendar URL. Uses default calendar if omitted.",
        required: false,
      },
    },
  };
}

/** Build the caldav_events_create tool definition. */
function buildEventsCreateDef(): ToolDefinition {
  return {
    name: "caldav_events_create",
    description:
      "Create a new calendar event. Returns the created event with its UID and ETag.",
    parameters: {
      summary: {
        type: "string",
        description: "Event title/summary",
        required: true,
      },
      start: {
        type: "string",
        description:
          "Event start time (ISO 8601, e.g. '20250315T100000Z' or '20250315' for all-day)",
        required: true,
      },
      end: {
        type: "string",
        description: "Event end time (ISO 8601, same format as start)",
        required: true,
      },
      calendar_id: {
        type: "string",
        description: "Calendar URL. Uses default calendar if omitted.",
        required: false,
      },
      location: {
        type: "string",
        description: "Event location",
        required: false,
      },
      description: {
        type: "string",
        description: "Event description/notes",
        required: false,
      },
      all_day: {
        type: "boolean",
        description: "Whether this is an all-day event",
        required: false,
      },
      attendees: {
        type: "array",
        description:
          'List of attendee emails (e.g. ["alice@example.com", "bob@example.com"])',
        required: false,
        items: { type: "string" },
      },
      recurrence: {
        type: "object",
        description:
          'Recurrence rule (e.g. {"frequency": "WEEKLY", "count": 10})',
        required: false,
      },
    },
  };
}

/** Build the caldav_events_update tool definition. */
function buildEventsUpdateDef(): ToolDefinition {
  return {
    name: "caldav_events_update",
    description:
      "Update an existing calendar event. Requires the event's ETag for conflict detection.",
    parameters: {
      event_uid: {
        type: "string",
        description: "The UID of the event to update",
        required: true,
      },
      etag: {
        type: "string",
        description:
          "Current ETag of the event (from events.get or events.list). Required for conflict detection.",
        required: true,
      },
      calendar_id: {
        type: "string",
        description: "Calendar URL. Uses default calendar if omitted.",
        required: false,
      },
      summary: {
        type: "string",
        description: "New event title",
        required: false,
      },
      start: {
        type: "string",
        description: "New start time",
        required: false,
      },
      end: {
        type: "string",
        description: "New end time",
        required: false,
      },
      location: {
        type: "string",
        description: "New location",
        required: false,
      },
      description: {
        type: "string",
        description: "New description",
        required: false,
      },
      attendees: {
        type: "array",
        description: "New attendee list (replaces existing)",
        required: false,
        items: { type: "string" },
      },
    },
  };
}

/** Build the caldav_events_delete tool definition. */
function buildEventsDeleteDef(): ToolDefinition {
  return {
    name: "caldav_events_delete",
    description:
      "Delete a calendar event. Requires the event's ETag for safe deletion.",
    parameters: {
      event_uid: {
        type: "string",
        description: "The UID of the event to delete",
        required: true,
      },
      etag: {
        type: "string",
        description: "Current ETag of the event. Required for conflict detection.",
        required: true,
      },
      calendar_id: {
        type: "string",
        description: "Calendar URL. Uses default calendar if omitted.",
        required: false,
      },
    },
  };
}

/** Build the caldav_freebusy tool definition. */
function buildFreebusyDef(): ToolDefinition {
  return {
    name: "caldav_freebusy",
    description:
      "Query free/busy availability for a time range. Returns busy periods.",
    parameters: {
      time_min: {
        type: "string",
        description: "Start of time range (ISO 8601)",
        required: true,
      },
      time_max: {
        type: "string",
        description: "End of time range (ISO 8601)",
        required: true,
      },
      calendar_id: {
        type: "string",
        description: "Calendar URL. Uses default calendar if omitted.",
        required: false,
      },
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Get all 7 CalDAV tool definitions. */
export function getCalDavToolDefinitions(): readonly ToolDefinition[] {
  return [
    buildCalendarsListDef(),
    buildEventsListDef(),
    buildEventsGetDef(),
    buildEventsCreateDef(),
    buildEventsUpdateDef(),
    buildEventsDeleteDef(),
    buildFreebusyDef(),
  ];
}

/** System prompt section explaining CalDAV tools to the LLM. */
export const CALDAV_SYSTEM_PROMPT = `## CalDAV Calendar Access

You have access to CalDAV calendar tools via 7 caldav_* tools.

- Use caldav_calendars_list to see available calendars.
- Use caldav_events_list with time_min/time_max to query events in a date range.
- Use caldav_events_get to fetch full event details (attendees, recurrence, notes).
- Use caldav_events_create to create new events. Provide summary, start, and end at minimum.
- Use caldav_events_update to modify events — always provide the current etag for conflict detection.
- Use caldav_events_delete to remove events — requires etag.
- Use caldav_freebusy to check availability for scheduling.
- Calendar data may contain meeting links, attendee emails, and internal project names — treat it as at least INTERNAL.
- Never narrate your intent to use calendar tools — just call them directly.`;

// ─── Tool Dispatch ────────────────────────────────────────────────────────────

/** Map of tool name to handler function. */
type ToolHandler = (
  ctx: CalDavToolContext,
  input: Record<string, unknown>,
) => Promise<string>;

/** Registry mapping each caldav_* tool name to its handler. */
const TOOL_HANDLERS: Readonly<Record<string, ToolHandler>> = {
  caldav_calendars_list: executeCalendarsList,
  caldav_events_list: executeEventsList,
  caldav_events_get: executeEventsGet,
  caldav_events_create: executeEventsCreate,
  caldav_events_update: executeEventsUpdate,
  caldav_events_delete: executeEventsDelete,
  caldav_freebusy: executeFreeBusy,
};

/**
 * Create a tool executor for CalDAV tools.
 *
 * Returns null for unknown tool names (allowing chaining with other executors).
 * Returns a graceful error message if ctx is undefined (CalDAV not configured).
 */
export function createCalDavToolExecutor(
  ctx: CalDavToolContext | undefined,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  // deno-lint-ignore require-await
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (!name.startsWith("caldav_")) {
      return null;
    }

    if (!ctx) {
      return "CalDAV is not configured. Run 'triggerfish connect caldav' to set up calendar access.";
    }

    const handler = TOOL_HANDLERS[name];
    if (!handler) {
      return null;
    }

    return handler(ctx, input);
  };
}

// ─── Tool Handlers ────────────────────────────────────────────────────────────

/** Resolve the calendar URL from input or default. */
function resolveCalendarUrl(ctx: CalDavToolContext, input: Record<string, unknown>): string {
  const calendarId = input.calendar_id;
  if (typeof calendarId === "string" && calendarId.length > 0) {
    return calendarId;
  }
  return ctx.defaultCalendar ?? ctx.calendarHomeUrl;
}

/** Execute caldav_calendars_list. */
async function executeCalendarsList(
  ctx: CalDavToolContext,
  _input: Record<string, unknown>,
): Promise<string> {
  log.info("Executing caldav_calendars_list", {
    operation: "executeCalendarsList",
  });

  const result = await listCalendars({
    calendarHomeUrl: ctx.calendarHomeUrl,
    client: ctx.client,
  });

  if (!result.ok) {
    return `Error listing calendars: ${result.error}`;
  }

  const calendars = result.value.map((c: CalDavCalendar) => ({
    url: c.url,
    name: c.displayName,
    ...(c.color ? { color: c.color } : {}),
    ...(c.description ? { description: c.description } : {}),
    _classification: ctx.sessionTaint(),
  }));

  return JSON.stringify({ calendars, _origin: "caldav:calendars" });
}

/** Execute caldav_events_list. */
async function executeEventsList(
  ctx: CalDavToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const timeMin = input.time_min;
  const timeMax = input.time_max;

  if (typeof timeMin !== "string" || timeMin.length === 0) {
    return "Error: caldav_events_list requires 'time_min' (ISO 8601 date string).";
  }
  if (typeof timeMax !== "string" || timeMax.length === 0) {
    return "Error: caldav_events_list requires 'time_max' (ISO 8601 date string).";
  }

  const calendarUrl = resolveCalendarUrl(ctx, input);
  const maxResults = typeof input.max_results === "number" ? input.max_results : 50;

  log.info("Executing caldav_events_list", {
    operation: "executeEventsList",
    calendarUrl,
    timeMin,
    timeMax,
  });

  const reportBody = buildCalendarQueryReport(timeMin, timeMax);
  const result = await ctx.client.report(calendarUrl, reportBody);

  if (!result.ok) {
    return `Error listing events: ${result.error.message}`;
  }

  const events: Record<string, unknown>[] = [];
  for (const resource of result.value.resources) {
    const parsed = parseVEvents(resource.calendarData, {
      url: resource.href,
      etag: resource.etag,
    });
    if (parsed.ok) {
      for (const event of parsed.value) {
        events.push(formatEventSummary(event, ctx));
        if (events.length >= maxResults) break;
      }
    }
    if (events.length >= maxResults) break;
  }

  return JSON.stringify({
    events,
    count: events.length,
    _origin: "caldav:events",
  });
}

/** Execute caldav_events_get. */
async function executeEventsGet(
  ctx: CalDavToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const eventUid = input.event_uid;
  if (typeof eventUid !== "string" || eventUid.length === 0) {
    return "Error: caldav_events_get requires 'event_uid'.";
  }

  const calendarUrl = resolveCalendarUrl(ctx, input);

  log.info("Executing caldav_events_get", {
    operation: "executeEventsGet",
    eventUid,
  });

  const reportBody = buildMultigetReport(eventUid);
  const result = await ctx.client.report(calendarUrl, reportBody);

  if (!result.ok) {
    return `Error getting event: ${result.error.message}`;
  }

  for (const resource of result.value.resources) {
    const parsed = parseVEvent(resource.calendarData, {
      url: resource.href,
      etag: resource.etag,
    });
    if (parsed.ok && parsed.value.uid === eventUid) {
      return JSON.stringify({
        ...formatEventDetail(parsed.value, ctx),
        _origin: `caldav:event:${eventUid}`,
      });
    }
  }

  return `Error: Event with UID '${eventUid}' not found.`;
}

/** Execute caldav_events_create. */
async function executeEventsCreate(
  ctx: CalDavToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const summary = input.summary;
  const start = input.start;
  const end = input.end;

  if (typeof summary !== "string" || summary.length === 0) {
    return "Error: caldav_events_create requires 'summary'.";
  }
  if (typeof start !== "string" || start.length === 0) {
    return "Error: caldav_events_create requires 'start'.";
  }
  if (typeof end !== "string" || end.length === 0) {
    return "Error: caldav_events_create requires 'end'.";
  }

  const calendarUrl = resolveCalendarUrl(ctx, input);
  const uid = crypto.randomUUID();
  const allDay = input.all_day === true;
  const attendees = Array.isArray(input.attendees)
    ? input.attendees.map((email: unknown) => ({
      email: String(email),
    }))
    : undefined;

  const recurrence = input.recurrence && typeof input.recurrence === "object"
    ? input.recurrence as CalDavEvent["recurrence"]
    : undefined;

  log.info("Executing caldav_events_create", {
    operation: "executeEventsCreate",
    summary,
  });

  const icalData = generateVEvent({
    uid,
    summary,
    start,
    end,
    allDay,
    ...(typeof input.location === "string" ? { location: input.location } : {}),
    ...(typeof input.description === "string"
      ? { description: input.description }
      : {}),
    ...(attendees ? { attendees } : {}),
    ...(recurrence ? { recurrence } : {}),
  });

  const eventUrl = `${calendarUrl.replace(/\/$/, "")}/${uid}.ics`;
  const result = await ctx.client.put(eventUrl, icalData);

  if (!result.ok) {
    return `Error creating event: ${result.error.message}`;
  }

  return JSON.stringify({
    uid,
    etag: result.value.etag,
    url: result.value.href,
    summary,
    start,
    end,
    _classification: ctx.sessionTaint(),
    _origin: `caldav:event:${uid}`,
  });
}

/** Execute caldav_events_update. */
async function executeEventsUpdate(
  ctx: CalDavToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const eventUid = input.event_uid;
  const etag = input.etag;

  if (typeof eventUid !== "string" || eventUid.length === 0) {
    return "Error: caldav_events_update requires 'event_uid'.";
  }
  if (typeof etag !== "string" || etag.length === 0) {
    return "Error: caldav_events_update requires 'etag' for conflict detection.";
  }

  const calendarUrl = resolveCalendarUrl(ctx, input);

  log.info("Executing caldav_events_update", {
    operation: "executeEventsUpdate",
    eventUid,
  });

  // First, fetch the existing event
  const reportBody = buildMultigetReport(eventUid);
  const getResult = await ctx.client.report(calendarUrl, reportBody);

  if (!getResult.ok) {
    return `Error fetching event for update: ${getResult.error.message}`;
  }

  let existingEvent: CalDavEvent | null = null;
  let eventHref = "";
  for (const resource of getResult.value.resources) {
    const parsed = parseVEvent(resource.calendarData, {
      url: resource.href,
      etag: resource.etag,
    });
    if (parsed.ok && parsed.value.uid === eventUid) {
      existingEvent = parsed.value;
      eventHref = resource.href;
      break;
    }
  }

  if (!existingEvent) {
    return `Error: Event with UID '${eventUid}' not found for update.`;
  }

  // Merge updates
  const updated = generateVEvent({
    uid: eventUid,
    summary: typeof input.summary === "string" ? input.summary : existingEvent.summary,
    start: typeof input.start === "string" ? input.start : existingEvent.start,
    end: typeof input.end === "string" ? input.end : existingEvent.end,
    allDay: existingEvent.allDay,
    location: typeof input.location === "string"
      ? input.location
      : existingEvent.location,
    description: typeof input.description === "string"
      ? input.description
      : existingEvent.description,
    attendees: Array.isArray(input.attendees)
      ? input.attendees.map((email: unknown) => ({ email: String(email) }))
      : existingEvent.attendees.length > 0
      ? [...existingEvent.attendees]
      : undefined,
    organizer: existingEvent.organizer,
    status: existingEvent.status,
    recurrence: existingEvent.recurrence,
  });

  const putResult = await ctx.client.put(eventHref || `${calendarUrl.replace(/\/$/, "")}/${eventUid}.ics`, updated, etag);

  if (!putResult.ok) {
    if (putResult.error.status === 412) {
      return "Error: ETag mismatch — the event was modified by another client. Fetch the latest version and retry.";
    }
    return `Error updating event: ${putResult.error.message}`;
  }

  return JSON.stringify({
    uid: eventUid,
    etag: putResult.value.etag,
    updated: true,
    _classification: ctx.sessionTaint(),
    _origin: `caldav:event:${eventUid}`,
  });
}

/** Execute caldav_events_delete. */
async function executeEventsDelete(
  ctx: CalDavToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const eventUid = input.event_uid;
  const etag = input.etag;

  if (typeof eventUid !== "string" || eventUid.length === 0) {
    return "Error: caldav_events_delete requires 'event_uid'.";
  }
  if (typeof etag !== "string" || etag.length === 0) {
    return "Error: caldav_events_delete requires 'etag' for safe deletion.";
  }

  const calendarUrl = resolveCalendarUrl(ctx, input);
  const eventUrl = `${calendarUrl.replace(/\/$/, "")}/${eventUid}.ics`;

  log.info("Executing caldav_events_delete", {
    operation: "executeEventsDelete",
    eventUid,
  });

  const result = await ctx.client.deleteResource(eventUrl, etag);

  if (!result.ok) {
    if (result.error.status === 412) {
      return "Error: ETag mismatch — the event was modified by another client. Fetch the latest version and retry.";
    }
    return `Error deleting event: ${result.error.message}`;
  }

  return JSON.stringify({
    uid: eventUid,
    deleted: true,
    _origin: `caldav:event:${eventUid}`,
  });
}

/** Execute caldav_freebusy. */
async function executeFreeBusy(
  ctx: CalDavToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const timeMin = input.time_min;
  const timeMax = input.time_max;

  if (typeof timeMin !== "string" || timeMin.length === 0) {
    return "Error: caldav_freebusy requires 'time_min'.";
  }
  if (typeof timeMax !== "string" || timeMax.length === 0) {
    return "Error: caldav_freebusy requires 'time_max'.";
  }

  const calendarUrl = resolveCalendarUrl(ctx, input);

  log.info("Executing caldav_freebusy", {
    operation: "executeFreeBusy",
    timeMin,
    timeMax,
  });

  const reportBody = buildFreeBusyReport(timeMin, timeMax);
  const result = await ctx.client.report(calendarUrl, reportBody);

  if (!result.ok) {
    return `Error querying free/busy: ${result.error.message}`;
  }

  const periods: Record<string, unknown>[] = [];
  for (const resource of result.value.resources) {
    const parsed = parseFreeBusy(resource.calendarData);
    if (parsed.ok) {
      for (const period of parsed.value) {
        periods.push({
          start: period.start,
          end: period.end,
          type: period.type,
        });
      }
    }
  }

  return JSON.stringify({
    periods,
    _classification: ctx.sessionTaint(),
    _origin: "caldav:freebusy",
  });
}

// ─── Report Builders ──────────────────────────────────────────────────────────

/** Build a calendar-query REPORT body for a time range. */
function buildCalendarQueryReport(timeMin: string, timeMax: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag />
    <c:calendar-data />
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${timeMin}" end="${timeMax}" />
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;
}

/** Build a calendar-multiget REPORT body to fetch a specific event by UID. */
function buildMultigetReport(eventUid: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag />
    <c:calendar-data />
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:prop-filter name="UID">
          <c:text-match collation="i;octet">${eventUid}</c:text-match>
        </c:prop-filter>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;
}

/** Build a free-busy-query REPORT body. */
function buildFreeBusyReport(timeMin: string, timeMax: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<c:free-busy-query xmlns:c="urn:ietf:params:xml:ns:caldav">
  <c:time-range start="${timeMin}" end="${timeMax}" />
</c:free-busy-query>`;
}

// ─── Response Formatters ──────────────────────────────────────────────────────

/** Format an event for list view (summary). */
function formatEventSummary(
  event: CalDavEvent,
  ctx: CalDavToolContext,
): Record<string, unknown> {
  return {
    uid: event.uid,
    summary: event.summary,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    etag: event.etag,
    ...(event.location ? { location: event.location } : {}),
    ...(event.recurrence ? { recurring: true } : {}),
    _classification: ctx.sessionTaint(),
  };
}

/** Format an event for detail view (full). */
function formatEventDetail(
  event: CalDavEvent,
  ctx: CalDavToolContext,
): Record<string, unknown> {
  return {
    uid: event.uid,
    summary: event.summary,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    etag: event.etag,
    url: event.url,
    ...(event.location ? { location: event.location } : {}),
    ...(event.description ? { description: event.description } : {}),
    ...(event.organizer ? { organizer: event.organizer } : {}),
    ...(event.status ? { status: event.status } : {}),
    ...(event.attendees.length > 0 ? { attendees: event.attendees } : {}),
    ...(event.recurrence ? { recurrence: event.recurrence } : {}),
    ...(event.created ? { created: event.created } : {}),
    ...(event.lastModified ? { lastModified: event.lastModified } : {}),
    _classification: ctx.sessionTaint(),
  };
}
