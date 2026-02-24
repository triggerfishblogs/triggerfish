/**
 * CalDAV tool executor and dispatch.
 *
 * Re-exports definitions from tool_definitions.ts and wires the
 * dispatch map that routes `caldav_*` tool names to their handlers.
 *
 * @module
 */

import type { CalDavToolContext } from "./types.ts";
import {
  executeCalendarsList,
  executeEventsList,
  executeEventsGet,
  executeEventsCreate,
  executeEventsUpdate,
  executeEventsDelete,
  executeFreeBusy,
} from "./tool_handlers.ts";

export { getCalDavToolDefinitions, CALDAV_SYSTEM_PROMPT } from "./tool_definitions.ts";

// ─── Tool Dispatch ────────────────────────────────────────────────────────────

/** Handler function signature for a caldav_* tool. */
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
