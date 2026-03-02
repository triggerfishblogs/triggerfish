/**
 * @module
 *
 * iCal VEVENT parsing tests.
 *
 * Tests line folding, simple/all-day/timezone event parsing,
 * attendees, organizer, RRULE on events, and multiple VEVENTs.
 */
import { assertEquals } from "@std/assert";
import {
  parseRRule,
  parseVEvent,
  parseVEvents,
  unfoldLines,
} from "../../../src/integrations/caldav/ical.ts";

// ─── Line Folding ─────────────────────────────────────────────────────────────

Deno.test("unfoldLines: unfolds continuation lines with space", () => {
  const input =
    "DESCRIPTION:This is a \r\n long description \r\n that continues";
  const lines = unfoldLines(input);
  assertEquals(
    lines[0],
    "DESCRIPTION:This is a long description that continues",
  );
});

Deno.test("unfoldLines: unfolds continuation lines with tab", () => {
  const input = "SUMMARY:Test\r\n\tEvent";
  const lines = unfoldLines(input);
  assertEquals(lines[0], "SUMMARY:TestEvent");
});

Deno.test("unfoldLines: handles LF-only line endings", () => {
  const input = "LINE1:value1\nLINE2:value2";
  const lines = unfoldLines(input);
  assertEquals(lines.length, 2);
});

// ─── Simple VEVENT Parsing ────────────────────────────────────────────────────

Deno.test("parseVEvent: parses simple event", () => {
  const ical = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test-uid-123
SUMMARY:Team Meeting
DTSTART:20250315T100000Z
DTEND:20250315T110000Z
LOCATION:Room 42
DESCRIPTION:Weekly sync
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

  const result = parseVEvent(ical, { url: "/events/test.ics", etag: "etag1" });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.uid, "test-uid-123");
    assertEquals(result.value.summary, "Team Meeting");
    assertEquals(result.value.start, "20250315T100000Z");
    assertEquals(result.value.end, "20250315T110000Z");
    assertEquals(result.value.location, "Room 42");
    assertEquals(result.value.description, "Weekly sync");
    assertEquals(result.value.status, "CONFIRMED");
    assertEquals(result.value.allDay, false);
    assertEquals(result.value.url, "/events/test.ics");
    assertEquals(result.value.etag, "etag1");
  }
});

Deno.test("parseVEvent: returns error for missing VEVENT", () => {
  const ical = `BEGIN:VCALENDAR
VERSION:2.0
END:VCALENDAR`;

  const result = parseVEvent(ical);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("VEVENT not found"), true);
  }
});

// ─── All-Day Events ───────────────────────────────────────────────────────────

Deno.test("parseVEvent: parses all-day event with VALUE=DATE", () => {
  const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:allday-1
SUMMARY:Holiday
DTSTART;VALUE=DATE:20250325
DTEND;VALUE=DATE:20250326
END:VEVENT
END:VCALENDAR`;

  const result = parseVEvent(ical);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.allDay, true);
    assertEquals(result.value.start, "20250325");
    assertEquals(result.value.end, "20250326");
  }
});

// ─── Timezone Events ──────────────────────────────────────────────────────────

Deno.test("parseVEvent: parses event with TZID parameter", () => {
  const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:tz-1
SUMMARY:Local Meeting
DTSTART;TZID=America/New_York:20250315T100000
DTEND;TZID=America/New_York:20250315T110000
END:VEVENT
END:VCALENDAR`;

  const result = parseVEvent(ical);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.start, "20250315T100000");
    assertEquals(result.value.allDay, false);
  }
});

// ─── Attendees and Organizer ──────────────────────────────────────────────────

Deno.test("parseVEvent: parses attendees and organizer", () => {
  const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:attendee-1
SUMMARY:Standup
DTSTART:20250315T090000Z
DTEND:20250315T091500Z
ORGANIZER:mailto:boss@example.com
ATTENDEE;CN="Alice Smith";ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED:mailto:alice@example.com
ATTENDEE;CN="Bob Jones";PARTSTAT=TENTATIVE:mailto:bob@example.com
END:VEVENT
END:VCALENDAR`;

  const result = parseVEvent(ical);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.organizer, "boss@example.com");
    assertEquals(result.value.attendees.length, 2);
    assertEquals(result.value.attendees[0].email, "alice@example.com");
    assertEquals(result.value.attendees[0].name, "Alice Smith");
    assertEquals(result.value.attendees[0].role, "REQ-PARTICIPANT");
    assertEquals(result.value.attendees[0].status, "ACCEPTED");
    assertEquals(result.value.attendees[1].email, "bob@example.com");
    assertEquals(result.value.attendees[1].status, "TENTATIVE");
  }
});

// ─── RRULE Parsing ────────────────────────────────────────────────────────────

Deno.test("parseRRule: parses daily recurrence with count", () => {
  const rrule = parseRRule("FREQ=DAILY;COUNT=5");
  assertEquals(rrule?.frequency, "DAILY");
  assertEquals(rrule?.count, 5);
});

Deno.test("parseRRule: parses weekly with BYDAY", () => {
  const rrule = parseRRule("FREQ=WEEKLY;BYDAY=MO,WE,FR;INTERVAL=2");
  assertEquals(rrule?.frequency, "WEEKLY");
  assertEquals(rrule?.interval, 2);
  assertEquals(rrule?.byDay?.length, 3);
  assertEquals(rrule?.byDay?.[0], "MO");
});

Deno.test("parseRRule: parses monthly with BYMONTHDAY", () => {
  const rrule = parseRRule("FREQ=MONTHLY;BYMONTHDAY=15;UNTIL=20251231T235959Z");
  assertEquals(rrule?.frequency, "MONTHLY");
  assertEquals(rrule?.byMonthDay?.[0], 15);
  assertEquals(rrule?.until, "20251231T235959Z");
});

Deno.test("parseRRule: parses yearly", () => {
  const rrule = parseRRule("FREQ=YEARLY;BYMONTH=3;COUNT=10");
  assertEquals(rrule?.frequency, "YEARLY");
  assertEquals(rrule?.byMonth?.[0], 3);
  assertEquals(rrule?.count, 10);
});

Deno.test("parseRRule: returns undefined for invalid frequency", () => {
  assertEquals(parseRRule("FREQ=INVALID"), undefined);
});

Deno.test("parseVEvent: parses RRULE on event", () => {
  const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:recurring-1
SUMMARY:Weekly Meeting
DTSTART:20250315T100000Z
DTEND:20250315T110000Z
RRULE:FREQ=WEEKLY;COUNT=10;BYDAY=SA
END:VEVENT
END:VCALENDAR`;

  const result = parseVEvent(ical);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.recurrence?.frequency, "WEEKLY");
    assertEquals(result.value.recurrence?.count, 10);
    assertEquals(result.value.recurrence?.byDay?.[0], "SA");
  }
});

// ─── Multiple VEVENTs ─────────────────────────────────────────────────────────

Deno.test("parseVEvents: parses multiple events", () => {
  const ical = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:event-1
SUMMARY:Event One
DTSTART:20250315T100000Z
DTEND:20250315T110000Z
END:VEVENT
BEGIN:VEVENT
UID:event-2
SUMMARY:Event Two
DTSTART:20250316T140000Z
DTEND:20250316T150000Z
END:VEVENT
END:VCALENDAR`;

  const result = parseVEvents(ical);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 2);
    assertEquals(result.value[0].uid, "event-1");
    assertEquals(result.value[1].uid, "event-2");
  }
});

Deno.test("parseVEvents: returns empty array for no events", () => {
  const ical = `BEGIN:VCALENDAR
VERSION:2.0
END:VCALENDAR`;

  const result = parseVEvents(ical);
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 0);
  }
});
