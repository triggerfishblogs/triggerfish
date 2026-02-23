/**
 * Google Calendar module.
 *
 * Calendar service, tool definitions, and tool executors.
 *
 * @module
 */

export type {
  Attendee,
  CalendarEvent,
  CalendarListOptions,
  CalendarCreateOptions,
  CalendarUpdateOptions,
  CalendarService,
} from "./types_calendar.ts";

export { createCalendarService } from "./calendar.ts";

export {
  buildCalendarListDef,
  buildCalendarCreateDef,
  buildCalendarUpdateDef,
} from "./tools_defs_calendar.ts";

export {
  executeCalendarList,
  executeCalendarCreate,
  executeCalendarUpdate,
} from "./tools_exec_calendar.ts";
