/**
 * iCal VEVENT generation (RFC 5545).
 *
 * Generates iCalendar text from CalDavEventInput objects. Supports
 * all-day events, attendees, organizer, status, and RRULE.
 *
 * @module
 */

import type { CalDavEventInput, CalDavRecurrence } from "./types.ts";

// ─── Text Escaping ────────────────────────────────────────────────────────────

/** Escape text for iCal output. */
function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
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

  appendDateTimeLines(lines, event);
  lines.push(`SUMMARY:${escapeIcalText(event.summary)}`);
  appendOptionalFields(lines, event);
  appendAttendees(lines, event);
  appendRecurrence(lines, event);

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

/** Append DTSTART/DTEND lines with VALUE=DATE for all-day events. */
function appendDateTimeLines(lines: string[], event: CalDavEventInput): void {
  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${event.start}`);
    lines.push(`DTEND;VALUE=DATE:${event.end}`);
  } else {
    lines.push(`DTSTART:${event.start}`);
    lines.push(`DTEND:${event.end}`);
  }
}

/** Append optional LOCATION, DESCRIPTION, ORGANIZER, STATUS. */
function appendOptionalFields(lines: string[], event: CalDavEventInput): void {
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
}

/** Append ATTENDEE lines. */
function appendAttendees(lines: string[], event: CalDavEventInput): void {
  if (!event.attendees) return;
  for (const attendee of event.attendees) {
    const params: string[] = [];
    if (attendee.name) params.push(`CN="${attendee.name}"`);
    if (attendee.role) params.push(`ROLE=${attendee.role}`);
    if (attendee.status) params.push(`PARTSTAT=${attendee.status}`);
    const paramStr = params.length > 0 ? `;${params.join(";")}` : "";
    lines.push(`ATTENDEE${paramStr}:mailto:${attendee.email}`);
  }
}

/** Append RRULE line if present. */
function appendRecurrence(lines: string[], event: CalDavEventInput): void {
  if (event.recurrence) {
    lines.push(`RRULE:${formatRRule(event.recurrence)}`);
  }
}

/** Format a CalDavRecurrence into an RRULE string. */
export function formatRRule(rrule: CalDavRecurrence): string {
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
export function formatIcalDateTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
