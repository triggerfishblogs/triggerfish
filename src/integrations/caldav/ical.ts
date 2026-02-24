/**
 * iCal (RFC 5545) parsing and generation barrel.
 *
 * Re-exports VEVENT parsing, generation, VFREEBUSY parsing, and
 * recurrence expansion from their respective modules.
 *
 * @module
 */

export {
  unfoldLines,
  parsePropertyLine,
  parseRRule,
  unescapeIcalText,
  parseVEvent,
  parseVEvents,
} from "./ical_parse.ts";

export {
  generateVEvent,
  formatRRule,
  formatIcalDateTime,
} from "./ical_generate.ts";

export {
  parseFreeBusy,
  expandRecurrence,
} from "./ical_freebusy.ts";
