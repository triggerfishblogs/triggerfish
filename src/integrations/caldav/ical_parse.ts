/**
 * iCal VEVENT parsing (RFC 5545).
 *
 * Line-based parser supporting VEVENT components with RRULE, ATTENDEE,
 * ORGANIZER properties. Handles line folding and both DATE and DATE-TIME values.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import type {
  CalDavAttendee,
  CalDavEvent,
  CalDavRecurrence,
} from "./types.ts";

/** Unfold continued lines (RFC 5545 §3.1). */
export function unfoldLines(text: string): readonly string[] {
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  return unfolded.split(/\r?\n/).filter((l) => l.length > 0);
}

/** Extract key, params, and value from an iCal property line. */
export function parsePropertyLine(line: string): {
  readonly key: string;
  readonly params: Readonly<Record<string, string>>;
  readonly value: string;
} {
  const colonIdx = findPropertyColon(line);
  const left = line.substring(0, colonIdx);
  const value = line.substring(colonIdx + 1);

  const semiIdx = left.indexOf(";");
  if (semiIdx === -1) {
    return { key: left.toUpperCase(), params: {}, value };
  }

  const key = left.substring(0, semiIdx).toUpperCase();
  const paramStr = left.substring(semiIdx + 1);
  const params: Record<string, string> = {};
  for (const part of paramStr.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx !== -1) {
      params[part.substring(0, eqIdx).toUpperCase()] = part.substring(
        eqIdx + 1,
      );
    }
  }
  return { key, params, value };
}

/**
 * Find the colon that separates the property name/params from the value.
 * Must skip colons inside quoted parameter values.
 */
function findPropertyColon(line: string): number {
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ":" && !inQuote) {
      return i;
    }
  }
  return line.length;
}

/** Check if a DTSTART/DTEND is a DATE (all-day) or DATE-TIME. */
function isAllDay(params: Readonly<Record<string, string>>): boolean {
  return params["VALUE"] === "DATE";
}

/** Parse an RRULE value into a CalDavRecurrence. */
export function parseRRule(value: string): CalDavRecurrence | undefined {
  const parts = value.split(";");
  const map: Record<string, string> = {};
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx !== -1) {
      map[part.substring(0, eqIdx).toUpperCase()] = part.substring(eqIdx + 1);
    }
  }

  const freq = map["FREQ"];
  if (!freq) return undefined;

  const validFreqs = new Set(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]);
  if (!validFreqs.has(freq)) return undefined;

  const result: CalDavRecurrence = {
    frequency: freq as CalDavRecurrence["frequency"],
    ...(map["INTERVAL"]
      ? { interval: parseInt(map["INTERVAL"], 10) }
      : {}),
    ...(map["COUNT"] ? { count: parseInt(map["COUNT"], 10) } : {}),
    ...(map["UNTIL"] ? { until: map["UNTIL"] } : {}),
    ...(map["BYDAY"] ? { byDay: map["BYDAY"].split(",") } : {}),
    ...(map["BYMONTH"]
      ? { byMonth: map["BYMONTH"].split(",").map((m) => parseInt(m, 10)) }
      : {}),
    ...(map["BYMONTHDAY"]
      ? {
        byMonthDay: map["BYMONTHDAY"].split(",").map((d) =>
          parseInt(d, 10)
        ),
      }
      : {}),
  };
  return result;
}

/** Parse an ATTENDEE property line into a CalDavAttendee. */
function parseAttendee(
  params: Readonly<Record<string, string>>,
  value: string,
): CalDavAttendee {
  const email = value.replace(/^mailto:/i, "");
  const cn = params["CN"]?.replace(/^"|"$/g, "");
  return {
    email,
    ...(cn ? { name: cn } : {}),
    ...(params["ROLE"] ? { role: params["ROLE"] } : {}),
    ...(params["PARTSTAT"] ? { status: params["PARTSTAT"] } : {}),
  };
}

/** State accumulated while parsing a single VEVENT. */
interface VEventState {
  uid: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  location?: string;
  description?: string;
  attendees: CalDavAttendee[];
  recurrence?: CalDavRecurrence;
  organizer?: string;
  status?: string;
  created?: string;
  lastModified?: string;
}

/** Apply a single property to VEvent state. */
function applyPropertyToEvent(
  state: VEventState,
  key: string,
  params: Readonly<Record<string, string>>,
  value: string,
): void {
  switch (key) {
    case "UID":
      state.uid = value;
      break;
    case "SUMMARY":
      state.summary = unescapeIcalText(value);
      break;
    case "DTSTART":
      state.start = value;
      state.allDay = isAllDay(params);
      break;
    case "DTEND":
      state.end = value;
      break;
    case "LOCATION":
      state.location = unescapeIcalText(value);
      break;
    case "DESCRIPTION":
      state.description = unescapeIcalText(value);
      break;
    case "ATTENDEE":
      state.attendees.push(parseAttendee(params, value));
      break;
    case "ORGANIZER":
      state.organizer = value.replace(/^mailto:/i, "");
      break;
    case "RRULE":
      state.recurrence = parseRRule(value);
      break;
    case "STATUS":
      state.status = value;
      break;
    case "CREATED":
      state.created = value;
      break;
    case "LAST-MODIFIED":
      state.lastModified = value;
      break;
  }
}

/** Unescape iCal text values (RFC 5545 §3.3.11). */
export function unescapeIcalText(text: string): string {
  return text
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/**
 * Parse a single VEVENT from iCal text.
 *
 * Returns the first VEVENT found. Use `parseVEvents` for multiple events.
 */
export function parseVEvent(
  icalText: string,
  options?: { readonly url?: string; readonly etag?: string },
): Result<CalDavEvent, string> {
  const events = parseVEventsInternal(icalText, options);
  if (events.length === 0) {
    return { ok: false, error: "VEVENT not found in iCal data" };
  }
  return { ok: true, value: events[0] };
}

/**
 * Parse multiple VEVENTs from iCal text.
 *
 * Returns all VEVENT components found in the calendar data.
 */
export function parseVEvents(
  icalText: string,
  options?: { readonly url?: string; readonly etag?: string },
): Result<readonly CalDavEvent[], string> {
  const events = parseVEventsInternal(icalText, options);
  return { ok: true, value: events };
}

/** Internal parser for VEVENT components. */
function parseVEventsInternal(
  icalText: string,
  options?: { readonly url?: string; readonly etag?: string },
): CalDavEvent[] {
  const lines = unfoldLines(icalText);
  const events: CalDavEvent[] = [];
  let state: VEventState | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      state = {
        uid: "",
        summary: "",
        start: "",
        end: "",
        allDay: false,
        attendees: [],
      };
      continue;
    }
    if (line === "END:VEVENT" && state) {
      events.push(buildEventFromState(state, options));
      state = null;
      continue;
    }
    if (state) {
      const { key, params, value } = parsePropertyLine(line);
      applyPropertyToEvent(state, key, params, value);
    }
  }

  return events;
}

/** Convert accumulated state to a CalDavEvent. */
function buildEventFromState(
  state: VEventState,
  options?: { readonly url?: string; readonly etag?: string },
): CalDavEvent {
  return {
    uid: state.uid,
    url: options?.url ?? "",
    etag: options?.etag ?? "",
    summary: state.summary,
    start: state.start,
    end: state.end,
    allDay: state.allDay,
    attendees: state.attendees,
    ...(state.location !== undefined ? { location: state.location } : {}),
    ...(state.description !== undefined
      ? { description: state.description }
      : {}),
    ...(state.recurrence ? { recurrence: state.recurrence } : {}),
    ...(state.organizer !== undefined
      ? { organizer: state.organizer }
      : {}),
    ...(state.status !== undefined ? { status: state.status } : {}),
    ...(state.created !== undefined ? { created: state.created } : {}),
    ...(state.lastModified !== undefined
      ? { lastModified: state.lastModified }
      : {}),
  };
}
