/**
 * VFREEBUSY parsing and recurrence expansion (RFC 5545).
 *
 * Parses FREEBUSY properties from VFREEBUSY components and expands
 * recurrence rules into individual occurrence dates within a range.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import type { CalDavFreeBusy, CalDavRecurrence } from "./types.ts";
import { parsePropertyLine, unfoldLines } from "./ical_parse.ts";
import { formatIcalDateTime } from "./ical_generate.ts";

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
      collectFreeBusyPeriods(line, periods);
    }
  }

  return { ok: true, value: periods };
}

/** Parse a single FREEBUSY line and append periods. */
function collectFreeBusyPeriods(
  line: string,
  periods: CalDavFreeBusy[],
): void {
  const { key, params, value } = parsePropertyLine(line);
  if (key !== "FREEBUSY") return;

  const fbType = (params["FBTYPE"] ?? "BUSY").toUpperCase();
  const type = classifyFreeBusyType(fbType);

  for (const period of value.split(",")) {
    const slashIdx = period.indexOf("/");
    if (slashIdx !== -1) {
      periods.push({
        start: period.substring(0, slashIdx),
        end: period.substring(slashIdx + 1),
        type,
      });
    }
  }
}

/** Map FBTYPE string to our FreeBusy type. */
function classifyFreeBusyType(
  fbType: string,
): CalDavFreeBusy["type"] {
  if (fbType === "FREE") return "FREE";
  if (fbType === "BUSY-TENTATIVE") return "TENTATIVE";
  return "BUSY";
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
