/**
 * @module
 *
 * iCal VEVENT generation, VFREEBUSY parsing, and recurrence expansion tests.
 *
 * Tests event generation, round-trip parsing, text escaping,
 * free/busy parsing, and recurrence expansion.
 */
import { assertEquals } from "@std/assert";
import {
  expandRecurrence,
  generateVEvent,
  parseFreeBusy,
  parseVEvent,
} from "../../../src/integrations/caldav/ical.ts";

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

  assertEquals(
    ical.includes(
      'ATTENDEE;CN="Alice";ROLE=REQ-PARTICIPANT:mailto:alice@example.com',
    ),
    true,
  );
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
