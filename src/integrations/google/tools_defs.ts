/**
 * Google Workspace tool definitions and system prompt.
 *
 * Defines the 14 tool schemas across Gmail, Calendar, Tasks, Drive,
 * and Sheets. Separated from the executor to keep definition-only
 * consumers lightweight.
 *
 * @module
 */

import type { ToolDefinition } from "../../core/types/tool.ts";

/** Get all 14 Google Workspace tool definitions. */
export function getGoogleToolDefinitions(): readonly ToolDefinition[] {
  return [
    // ── Gmail (4 tools) ──
    {
      name: "gmail_search",
      description:
        "Search Gmail messages. Returns matching emails with subject, sender, date, and snippet.",
      parameters: {
        query: {
          type: "string",
          description:
            "Gmail search query (same syntax as Gmail search box, e.g. 'from:alice subject:meeting')",
          required: true,
        },
        max_results: {
          type: "number",
          description: "Maximum number of messages to return (default: 10)",
          required: false,
        },
      },
    },
    {
      name: "gmail_read",
      description:
        "Read a specific Gmail message by its ID. Returns the full message body, headers, and labels.",
      parameters: {
        message_id: {
          type: "string",
          description: "The Gmail message ID (from gmail_search results)",
          required: true,
        },
      },
    },
    {
      name: "gmail_send",
      description:
        "Send an email via Gmail. Composes and sends a new message.",
      parameters: {
        to: {
          type: "string",
          description: "Recipient email address",
          required: true,
        },
        subject: {
          type: "string",
          description: "Email subject line",
          required: true,
        },
        body: {
          type: "string",
          description: "Email body text (plain text)",
          required: true,
        },
        cc: {
          type: "string",
          description: "CC recipients (comma-separated)",
          required: false,
        },
        bcc: {
          type: "string",
          description: "BCC recipients (comma-separated)",
          required: false,
        },
      },
    },
    {
      name: "gmail_label",
      description:
        "Add or remove labels from a Gmail message (e.g. mark as read, archive, star).",
      parameters: {
        message_id: {
          type: "string",
          description: "The Gmail message ID",
          required: true,
        },
        add_labels: {
          type: "string",
          description:
            "Comma-separated label IDs to add (e.g. 'STARRED,IMPORTANT')",
          required: false,
        },
        remove_labels: {
          type: "string",
          description:
            "Comma-separated label IDs to remove (e.g. 'UNREAD,INBOX')",
          required: false,
        },
      },
    },

    // ── Calendar (3 tools) ──
    {
      name: "calendar_list",
      description:
        "List upcoming Google Calendar events. Returns event summary, time, location, and attendees.",
      parameters: {
        time_min: {
          type: "string",
          description:
            "Start of time range (ISO 8601, e.g. '2025-01-15T00:00:00Z'). Defaults to now.",
          required: false,
        },
        time_max: {
          type: "string",
          description: "End of time range (ISO 8601). Defaults to 7 days from now.",
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
      },
    },
    {
      name: "calendar_create",
      description:
        "Create a new Google Calendar event.",
      parameters: {
        summary: {
          type: "string",
          description: "Event title/summary",
          required: true,
        },
        start: {
          type: "string",
          description: "Start time (ISO 8601, e.g. '2025-01-15T14:00:00-05:00')",
          required: true,
        },
        end: {
          type: "string",
          description: "End time (ISO 8601)",
          required: true,
        },
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
      },
    },
    {
      name: "calendar_update",
      description:
        "Update an existing Google Calendar event. Only specified fields are changed.",
      parameters: {
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
          description: "New comma-separated attendee emails (replaces existing)",
          required: false,
        },
        calendar_id: {
          type: "string",
          description: "Calendar ID (default: 'primary')",
          required: false,
        },
      },
    },

    // ── Tasks (3 tools) ──
    {
      name: "tasks_list",
      description:
        "List Google Tasks from a task list.",
      parameters: {
        task_list_id: {
          type: "string",
          description: "Task list ID (default: '@default')",
          required: false,
        },
        show_completed: {
          type: "boolean",
          description: "Include completed tasks (default: true)",
          required: false,
        },
        max_results: {
          type: "number",
          description: "Maximum tasks to return (default: 20)",
          required: false,
        },
      },
    },
    {
      name: "tasks_create",
      description:
        "Create a new Google Task.",
      parameters: {
        title: {
          type: "string",
          description: "Task title",
          required: true,
        },
        notes: {
          type: "string",
          description: "Task notes/description",
          required: false,
        },
        due: {
          type: "string",
          description: "Due date (ISO 8601, e.g. '2025-01-20T00:00:00Z')",
          required: false,
        },
        task_list_id: {
          type: "string",
          description: "Task list ID (default: '@default')",
          required: false,
        },
      },
    },
    {
      name: "tasks_complete",
      description:
        "Mark a Google Task as completed.",
      parameters: {
        task_id: {
          type: "string",
          description: "The task ID to complete",
          required: true,
        },
        task_list_id: {
          type: "string",
          description: "Task list ID (default: '@default')",
          required: false,
        },
      },
    },

    // ── Drive (2 tools) ──
    {
      name: "drive_search",
      description:
        "Search Google Drive for files and documents. Returns file names, types, and IDs.",
      parameters: {
        query: {
          type: "string",
          description:
            "Drive search query (e.g. \"name contains 'report'\" or \"mimeType='application/vnd.google-apps.spreadsheet'\")",
          required: true,
        },
        max_results: {
          type: "number",
          description: "Maximum files to return (default: 10)",
          required: false,
        },
      },
    },
    {
      name: "drive_read",
      description:
        "Read the content of a Google Drive file. For Docs/Sheets, exports as plain text/CSV. For other text files, downloads the content.",
      parameters: {
        file_id: {
          type: "string",
          description: "The Drive file ID (from drive_search results)",
          required: true,
        },
      },
    },

    // ── Sheets (2 tools) ──
    {
      name: "sheets_read",
      description:
        "Read a range of cells from a Google Sheet. Returns values as a 2D array.",
      parameters: {
        spreadsheet_id: {
          type: "string",
          description: "The spreadsheet ID (from the Google Sheets URL or drive_search)",
          required: true,
        },
        range: {
          type: "string",
          description: "Cell range in A1 notation (e.g. 'Sheet1!A1:D10')",
          required: true,
        },
      },
    },
    {
      name: "sheets_write",
      description:
        "Write values to a range of cells in a Google Sheet.",
      parameters: {
        spreadsheet_id: {
          type: "string",
          description: "The spreadsheet ID",
          required: true,
        },
        range: {
          type: "string",
          description: "Cell range in A1 notation (e.g. 'Sheet1!A1:B2')",
          required: true,
        },
        values: {
          type: "string",
          description:
            "JSON-encoded 2D array of values (e.g. '[[\"Name\",\"Age\"],[\"Alice\",\"30\"]]')",
          required: true,
        },
      },
    },
  ];
}

/** System prompt section explaining Google Workspace tools to the LLM. */
export const GOOGLE_TOOLS_SYSTEM_PROMPT = `## Google Workspace

You have access to Google Workspace tools for Gmail, Calendar, Tasks, Drive, and Sheets.

- Use gmail_search to find emails, then gmail_read for full content. Use gmail_send to compose and send.
- Use calendar_list to see upcoming events. Use calendar_create and calendar_update to manage the schedule.
- Use tasks_list, tasks_create, and tasks_complete for task management.
- Use drive_search to find files, then drive_read for content. For spreadsheets, prefer sheets_read/sheets_write.
- When the user asks about their schedule, emails, or documents, use these tools directly — never narrate intent.
- All Google data is classified at least INTERNAL. Do not share Google data on PUBLIC channels.`;
