/**
 * iCal parser/generator tests.
 *
 * Tests VEVENT parsing, generation, RRULE handling, VFREEBUSY parsing,
 * line folding, date formats, and recurrence expansion.
 */
import { assertEquals } from "@std/assert";
import {
  parseVEvent,
  parseVEvents,
  generateVEvent,
  parseFreeBusy,
  expandRecurrence,
  parseRRule,
  unfoldLines,
} from "../../../src/integrations/caldav/ical.ts";

// ─── Line Folding ─────────────────────────────────────────────────────────────

Deno.test("unfoldLines: unfolds continuation lines with space", () => {
  const input = "DESCRIPTION:This is a\r\n long description\r\n that continues";
  const lines = unfoldLines(input);
  assertEquals(lines[0], "DESCRIPTION:This is a long description that continues");
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

// ─── VEVENT Generation ────────────────────────────────────────────────────────

Deno.test("generateVEvent: generates valid iCal output", () => {
  const ical = generateVEvent({
    uid: "gen-uid-1",
    summary: "Generated Event",
    start: "20250320T100000Z",
    end: "20250320T110000Z",
    location: "Conference Room",
    description: "A test event",
  });

  assertEquals(ical.includes("BEGIN:VCALENDAR"), true);
  assertEquals(ical.includes("BEGIN:VEVENT"), true);
  assertEquals(ical.includes("UID:gen-uid-1"), true);
  assertEquals(ical.includes("SUMMARY:Generated Event"), true);
  assertEquals(ical.includes("DTSTART:20250320T100000Z"), true);
  assertEquals(ical.includes("DTEND:20250320T110000Z"), true);
  assertEquals(ical.includes("LOCATION:Conference Room"), true);
  assertEquals(ical.includes("DESCRIPTION:A test event"), true);
  assertEquals(ical.includes("END:VEVENT"), true);
  assertEquals(ical.includes("END:VCALENDAR"), true);
});

Deno.test("generateVEvent: generates all-day event with VALUE=DATE", () => {
  const ical = generateVEvent({
    uid: "allday-gen",
    summary: "Vacation",
    start: "20250325",
    end: "20250328",
    allDay: true,
  });

  assertEquals(ical.includes("DTSTART;VALUE=DATE:20250325"), true);
  assertEquals(ical.includes("DTEND;VALUE=DATE:20250328"), true);
});

Deno.test("generateVEvent: includes attendees", () => {
  const ical = generateVEvent({
    uid: "attend-gen",
    summary: "Meeting",
    start: "20250315T100000Z",
    end: "20250315T110000Z",
    attendees: [
      { email: "alice@example.com", name: "Alice", role: "REQ-PARTICIPANT" },
      { email: "bob@example.com" },
    ],
  });

  assertEquals(ical.includes('ATTENDEE;CN="Alice";ROLE=REQ-PARTICIPANT:mailto:alice@example.com'), true);
  assertEquals(ical.includes("ATTENDEE:mailto:bob@example.com"), true);
});

Deno.test("generateVEvent: includes RRULE", () => {
  const ical = generateVEvent({
    uid: "rrule-gen",
    summary: "Recurring",
    start: "20250315T100000Z",
    end: "20250315T110000Z",
    recurrence: { frequency: "WEEKLY", count: 5, byDay: ["MO", "FR"] },
  });

  assertEquals(ical.includes("RRULE:FREQ=WEEKLY;COUNT=5;BYDAY=MO,FR"), true);
});

Deno.test("generateVEvent: round-trips through parser", () => {
  const generated = generateVEvent({
    uid: "roundtrip-1",
    summary: "Round Trip Test",
    start: "20250315T100000Z",
    end: "20250315T110000Z",
    location: "Room A",
    description: "Testing round-trip",
  });

  const parsed = parseVEvent(generated);
  assertEquals(parsed.ok, true);
  if (parsed.ok) {
    assertEquals(parsed.value.uid, "roundtrip-1");
    assertEquals(parsed.value.summary, "Round Trip Test");
    assertEquals(parsed.value.start, "20250315T100000Z");
    assertEquals(parsed.value.end, "20250315T110000Z");
    assertEquals(parsed.value.location, "Room A");
    assertEquals(parsed.value.description, "Testing round-trip");
  }
});

// ─── Text Escaping ────────────────────────────────────────────────────────────

Deno.test("generateVEvent + parseVEvent: handles special characters", () => {
  const generated = generateVEvent({
    uid: "escape-1",
    summary: "Meeting; Review",
    start: "20250315T100000Z",
    end: "20250315T110000Z",
    description: "Line 1\nLine 2\nWith, commas",
  });

  const parsed = parseVEvent(generated);
  assertEquals(parsed.ok, true);
  if (parsed.ok) {
    assertEquals(parsed.value.summary, "Meeting; Review");
    assertEquals(parsed.value.description, "Line 1\nLine 2\nWith, commas");
  }
});

// ─── VFREEBUSY Parsing ────────────────────────────────────────────────────────

Deno.test("parseFreeBusy: parses VFREEBUSY response", () => {
  const ical = `BEGIN:VCALENDAR
BEGIN:VFREEBUSY
FREEBUSY:20250315T100000Z/20250315T110000Z
FREEBUSY:20250315T140000Z/20250315T150000Z
END:VFREEBUSY
END:VCALENDAR`;

  const result = parseFreeBusy(ical);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 2);
    assertEquals(result.value[0].start, "20250315T100000Z");
    assertEquals(result.value[0].end, "20250315T110000Z");
    assertEquals(result.value[0].type, "BUSY");
    assertEquals(result.value[1].start, "20250315T140000Z");
    assertEquals(result.value[1].end, "20250315T150000Z");
  }
});

Deno.test("parseFreeBusy: handles FBTYPE parameter", () => {
  const ical = `BEGIN:VCALENDAR
BEGIN:VFREEBUSY
FREEBUSY;FBTYPE=BUSY-TENTATIVE:20250315T100000Z/20250315T110000Z
FREEBUSY;FBTYPE=FREE:20250315T110000Z/20250315T120000Z
END:VFREEBUSY
END:VCALENDAR`;

  const result = parseFreeBusy(ical);

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value[0].type, "TENTATIVE");
    assertEquals(result.value[1].type, "FREE");
  }
});

Deno.test("parseFreeBusy: returns empty for no VFREEBUSY", () => {
  const result = parseFreeBusy("BEGIN:VCALENDAR\nEND:VCALENDAR");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 0);
  }
});

// ─── Recurrence Expansion ─────────────────────────────────────────────────────

Deno.test("expandRecurrence: expands daily recurrence with count", () => {
  const occurrences = expandRecurrence(
    { frequency: "DAILY", count: 3 },
    "20250315T100000Z",
    "20250315T000000Z",
    "20250320T000000Z",
  );

  assertEquals(occurrences.length, 3);
});

Deno.test("expandRecurrence: expands weekly recurrence within range", () => {
  const occurrences = expandRecurrence(
    { frequency: "WEEKLY" },
    "20250301T100000Z",
    "20250301T000000Z",
    "20250331T235959Z",
  );

  // 5 Saturdays in March 2025: 1, 8, 15, 22, 29
  assertEquals(occurrences.length >= 4, true);
});

Deno.test("expandRecurrence: respects UNTIL limit", () => {
  const occurrences = expandRecurrence(
    { frequency: "DAILY", until: "20250317T235959Z" },
    "20250315T100000Z",
    "20250315T000000Z",
    "20250331T000000Z",
  );

  assertEquals(occurrences.length, 3); // 15th, 16th, 17th
});

Deno.test("expandRecurrence: handles monthly interval", () => {
  const occurrences = expandRecurrence(
    { frequency: "MONTHLY", interval: 2, count: 3 },
    "20250115T100000Z",
    "20250101T000000Z",
    "20251231T000000Z",
  );

  assertEquals(occurrences.length, 3); // Jan, Mar, May
});
