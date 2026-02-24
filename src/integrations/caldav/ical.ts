/**
 * iCal (RFC 5545) parsing and generation for VEVENT components.
 *
 * Line-based parser supporting VEVENT, RRULE, ATTENDEE, ORGANIZER,
 * and VFREEBUSY. Handles line folding and both DATE and DATE-TIME values.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import type {
  CalDavAttendee,
  CalDavEvent,
  CalDavEventInput,
  CalDavFreeBusy,
  CalDavRecurrence,
} from "./types.ts";

// ─── Line Folding ─────────────────────────────────────────────────────────────

/** Unfold continued lines (RFC 5545 §3.1). */
export function unfoldLines(text: string): readonly string[] {
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  return unfolded.split(/\r?\n/).filter((l) => l.length > 0);
}

// ─── Property Parsing ─────────────────────────────────────────────────────────

/** Extract key, params, and value from an iCal property line. */
function parsePropertyLine(line: string): {
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

// ─── RRULE Parsing ────────────────────────────────────────────────────────────

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

// ─── ATTENDEE Parsing ─────────────────────────────────────────────────────────

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

// ─── VEVENT Parsing ───────────────────────────────────────────────────────────

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
function unescapeIcalText(text: string): string {
  return text
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/** Escape text for iCal output. */
function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
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
      events.push({
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
      });
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

// ─── VEVENT Generation ────────────────────────────────────────────────────────

/** Generate iCal VEVENT text from an event input. */
export function generateVEvent(event: CalDavEventInput): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Triggerfish//CalDAV//EN",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${formatIcalDateTime(new Date())}`,
  ];

  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${event.start}`);
    lines.push(`DTEND;VALUE=DATE:${event.end}`);
  } else {
    lines.push(`DTSTART:${event.start}`);
    lines.push(`DTEND:${event.end}`);
  }

  lines.push(`SUMMARY:${escapeIcalText(event.summary)}`);

  if (event.location) {
    lines.push(`LOCATION:${escapeIcalText(event.location)}`);
  }
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeIcalText(event.description)}`);
  }
  if (event.organizer) {
    lines.push(`ORGANIZER:mailto:${event.organizer}`);
  }
  if (event.status) {
    lines.push(`STATUS:${event.status}`);
  }
  if (event.attendees) {
    for (const attendee of event.attendees) {
      const params: string[] = [];
      if (attendee.name) params.push(`CN="${attendee.name}"`);
      if (attendee.role) params.push(`ROLE=${attendee.role}`);
      if (attendee.status) params.push(`PARTSTAT=${attendee.status}`);
      const paramStr = params.length > 0 ? `;${params.join(";")}` : "";
      lines.push(`ATTENDEE${paramStr}:mailto:${attendee.email}`);
    }
  }
  if (event.recurrence) {
    lines.push(`RRULE:${formatRRule(event.recurrence)}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/** Format a CalDavRecurrence into an RRULE string. */
function formatRRule(rrule: CalDavRecurrence): string {
  const parts: string[] = [`FREQ=${rrule.frequency}`];
  if (rrule.interval !== undefined) parts.push(`INTERVAL=${rrule.interval}`);
  if (rrule.count !== undefined) parts.push(`COUNT=${rrule.count}`);
  if (rrule.until) parts.push(`UNTIL=${rrule.until}`);
  if (rrule.byDay && rrule.byDay.length > 0) {
    parts.push(`BYDAY=${rrule.byDay.join(",")}`);
  }
  if (rrule.byMonth && rrule.byMonth.length > 0) {
    parts.push(`BYMONTH=${rrule.byMonth.join(",")}`);
  }
  if (rrule.byMonthDay && rrule.byMonthDay.length > 0) {
    parts.push(`BYMONTHDAY=${rrule.byMonthDay.join(",")}`);
  }
  return parts.join(";");
}

/** Format a Date as an iCal DATE-TIME (UTC). */
function formatIcalDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

// ─── VFREEBUSY Parsing ────────────────────────────────────────────────────────

/**
 * Parse VFREEBUSY response into free/busy periods.
 *
 * Returns BUSY periods from FREEBUSY properties within VFREEBUSY components.
 */
export function parseFreeBusy(
  icalText: string,
): Result<readonly CalDavFreeBusy[], string> {
  const lines = unfoldLines(icalText);
  const periods: CalDavFreeBusy[] = [];
  let inFreeBusy = false;

  for (const line of lines) {
    if (line === "BEGIN:VFREEBUSY") {
      inFreeBusy = true;
      continue;
    }
    if (line === "END:VFREEBUSY") {
      inFreeBusy = false;
      continue;
    }
    if (inFreeBusy) {
      const { key, params, value } = parsePropertyLine(line);
      if (key === "FREEBUSY") {
        const fbType = (params["FBTYPE"] ?? "BUSY").toUpperCase();
        const type = fbType === "FREE"
          ? "FREE"
          : fbType === "BUSY-TENTATIVE"
          ? "TENTATIVE"
          : "BUSY";
        for (const period of value.split(",")) {
          const slashIdx = period.indexOf("/");
          if (slashIdx !== -1) {
            periods.push({
              start: period.substring(0, slashIdx),
              end: period.substring(slashIdx + 1),
              type: type as CalDavFreeBusy["type"],
            });
          }
        }
      }
    }
  }

  return { ok: true, value: periods };
}

// ─── Recurrence Expansion ─────────────────────────────────────────────────────

/**
 * Expand a recurrence rule into individual occurrence dates within a range.
 *
 * Returns ISO date strings for each occurrence within [rangeStart, rangeEnd].
 */
export function expandRecurrence(
  rrule: CalDavRecurrence,
  dtstart: string,
  rangeStart: string,
  rangeEnd: string,
): readonly string[] {
  const start = parseIcalDate(dtstart);
  const rStart = parseIcalDate(rangeStart);
  const rEnd = parseIcalDate(rangeEnd);
  if (!start || !rStart || !rEnd) return [];

  const occurrences: string[] = [];
  const maxOccurrences = rrule.count ?? 1000;
  let count = 0;
  let current = new Date(start.getTime());

  while (count < maxOccurrences && current <= rEnd) {
    if (rrule.until) {
      const untilDate = parseIcalDate(rrule.until);
      if (untilDate && current > untilDate) break;
    }

    if (current >= rStart) {
      occurrences.push(formatIcalDateTime(current));
    }

    current = advanceDate(current, rrule);
    count++;
  }

  return occurrences;
}

/** Parse an iCal date or datetime string into a Date object. */
function parseIcalDate(value: string): Date | null {
  // DATE format: YYYYMMDD
  if (/^\d{8}$/.test(value)) {
    const y = parseInt(value.substring(0, 4), 10);
    const m = parseInt(value.substring(4, 6), 10) - 1;
    const d = parseInt(value.substring(6, 8), 10);
    return new Date(Date.UTC(y, m, d));
  }
  // DATETIME format: YYYYMMDDTHHMMSSZ or YYYYMMDDTHHMMSS
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/.exec(value);
  if (match) {
    return new Date(
      Date.UTC(
        parseInt(match[1], 10),
        parseInt(match[2], 10) - 1,
        parseInt(match[3], 10),
        parseInt(match[4], 10),
        parseInt(match[5], 10),
        parseInt(match[6], 10),
      ),
    );
  }
  // Try ISO string fallback
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Advance a date by one interval of the recurrence rule. */
function advanceDate(date: Date, rrule: CalDavRecurrence): Date {
  const interval = rrule.interval ?? 1;
  const next = new Date(date.getTime());
  switch (rrule.frequency) {
    case "DAILY":
      next.setUTCDate(next.getUTCDate() + interval);
      break;
    case "WEEKLY":
      next.setUTCDate(next.getUTCDate() + 7 * interval);
      break;
    case "MONTHLY":
      next.setUTCMonth(next.getUTCMonth() + interval);
      break;
    case "YEARLY":
      next.setUTCFullYear(next.getUTCFullYear() + interval);
      break;
  }
  return next;
}
