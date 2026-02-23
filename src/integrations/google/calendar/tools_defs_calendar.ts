/**
 * Calendar tool definitions.
 *
 * Defines the 3 Calendar tool schemas: list, create, update.
 *
 * @module
 */

import type { ToolDefinition } from "../../../core/types/tool.ts";

function buildCalendarListParams(): ToolDefinition["parameters"] {
  return {
    time_min: {
      type: "string",
      description:
        "Start of time range (ISO 8601, e.g. '2025-01-15T00:00:00Z'). Defaults to now.",
      required: false,
    },
    time_max: {
      type: "string",
      description:
        "End of time range (ISO 8601). Defaults to 7 days from now.",
      required: false,
    },
    max_results: {
      type: "number",
      description: "Maximum number of events to return (default: 10)",
      required: false,
    },
    calendar_id: {
      type: "string",
      description: "Calendar ID (default: 'primary')",
      required: false,
    },
  };
}

/** Build the calendar_list tool definition. */
export function buildCalendarListDef(): ToolDefinition {
  return {
    name: "calendar_list",
    description:
      "List upcoming Google Calendar events. Returns event summary, time, location, and attendees.",
    parameters: buildCalendarListParams(),
  };
}

function buildCalendarCreateRequiredParams(): ToolDefinition["parameters"] {
  return {
    summary: {
      type: "string",
      description: "Event title/summary",
      required: true,
    },
    start: {
      type: "string",
      description:
        "Start time (ISO 8601, e.g. '2025-01-15T14:00:00-05:00')",
      required: true,
    },
    end: {
      type: "string",
      description: "End time (ISO 8601)",
      required: true,
    },
  };
}

function buildCalendarCreateOptionalParams(): ToolDefinition["parameters"] {
  return {
    description: {
      type: "string",
      description: "Event description/notes",
      required: false,
    },
    location: {
      type: "string",
      description: "Event location",
      required: false,
    },
    attendees: {
      type: "string",
      description: "Comma-separated email addresses to invite",
      required: false,
    },
    calendar_id: {
      type: "string",
      description: "Calendar ID (default: 'primary')",
      required: false,
    },
  };
}

/** Build the calendar_create tool definition. */
export function buildCalendarCreateDef(): ToolDefinition {
  return {
    name: "calendar_create",
    description: "Create a new Google Calendar event.",
    parameters: {
      ...buildCalendarCreateRequiredParams(),
      ...buildCalendarCreateOptionalParams(),
    },
  };
}

function buildCalendarUpdateTimeParams(): ToolDefinition["parameters"] {
  return {
    event_id: {
      type: "string",
      description: "The event ID to update",
      required: true,
    },
    summary: {
      type: "string",
      description: "New event title",
      required: false,
    },
    start: {
      type: "string",
      description: "New start time (ISO 8601)",
      required: false,
    },
    end: {
      type: "string",
      description: "New end time (ISO 8601)",
      required: false,
    },
  };
}

function buildCalendarUpdateDetailParams(): ToolDefinition["parameters"] {
  return {
    description: {
      type: "string",
      description: "New event description",
      required: false,
    },
    location: {
      type: "string",
      description: "New event location",
      required: false,
    },
    attendees: {
      type: "string",
      description:
        "New comma-separated attendee emails (replaces existing)",
      required: false,
    },
    calendar_id: {
      type: "string",
      description: "Calendar ID (default: 'primary')",
      required: false,
    },
  };
}

/** Build the calendar_update tool definition. */
export function buildCalendarUpdateDef(): ToolDefinition {
  return {
    name: "calendar_update",
    description:
      "Update an existing Google Calendar event. Only specified fields are changed.",
    parameters: {
      ...buildCalendarUpdateTimeParams(),
      ...buildCalendarUpdateDetailParams(),
    },
  };
}
