/**
 * Google Workspace tool definitions and executor.
 *
 * Follows the same pattern as `src/web/tools.ts` — provides tool
 * definitions, a system prompt section, and an executor factory.
 *
 * 14 tools across Gmail, Calendar, Tasks, Drive, and Sheets.
 *
 * @module
 */

import type { ToolDefinition } from "../../agent/orchestrator.ts";
import type { GoogleToolContext } from "./types.ts";

// ─── Tool Definitions ───────────────────────────────────────────────────────

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

// ─── System Prompt ──────────────────────────────────────────────────────────

/** System prompt section explaining Google Workspace tools to the LLM. */
export const GOOGLE_TOOLS_SYSTEM_PROMPT = `## Google Workspace

You have access to Google Workspace tools for Gmail, Calendar, Tasks, Drive, and Sheets.

- Use gmail_search to find emails, then gmail_read for full content. Use gmail_send to compose and send.
- Use calendar_list to see upcoming events. Use calendar_create and calendar_update to manage the schedule.
- Use tasks_list, tasks_create, and tasks_complete for task management.
- Use drive_search to find files, then drive_read for content. For spreadsheets, prefer sheets_read/sheets_write.
- When the user asks about their schedule, emails, or documents, use these tools directly — never narrate intent.
- All Google data is classified at least INTERNAL. Do not share Google data on PUBLIC channels.`;

// ─── Executor ───────────────────────────────────────────────────────────────

/**
 * Create a tool executor for Google Workspace tools.
 *
 * Returns null for unknown tool names (allowing chaining with other executors).
 *
 * @param ctx - Google tool context with services and session state
 * @returns An executor function: (name, input) => Promise<string | null>
 */
export function createGoogleToolExecutor(
  ctx: GoogleToolContext,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    switch (name) {
      // ── Gmail ──────────────────────────────────────────────────────────
      case "gmail_search": {
        const query = input.query;
        if (typeof query !== "string" || query.trim().length === 0) {
          return "Error: gmail_search requires a non-empty 'query' argument.";
        }
        const maxResults = typeof input.max_results === "number"
          ? input.max_results
          : 10;

        const result = await ctx.gmail.search({ query, maxResults });
        if (!result.ok) return `Error: ${result.error.message}`;

        if (result.value.length === 0) {
          return `No emails found for query: "${query}"`;
        }

        return JSON.stringify(
          result.value.map((m) => ({
            id: m.id,
            from: m.from,
            subject: m.subject,
            date: m.date,
            snippet: m.snippet,
            labels: m.labelIds,
          })),
        );
      }

      case "gmail_read": {
        const messageId = input.message_id;
        if (typeof messageId !== "string" || messageId.length === 0) {
          return "Error: gmail_read requires a 'message_id' argument.";
        }

        const result = await ctx.gmail.read(messageId);
        if (!result.ok) return `Error: ${result.error.message}`;

        return JSON.stringify({
          id: result.value.id,
          from: result.value.from,
          to: result.value.to,
          subject: result.value.subject,
          date: result.value.date,
          body: result.value.body,
          labels: result.value.labelIds,
        });
      }

      case "gmail_send": {
        const to = input.to;
        const subject = input.subject;
        const body = input.body;
        if (typeof to !== "string" || to.length === 0) {
          return "Error: gmail_send requires a 'to' argument.";
        }
        if (typeof subject !== "string" || subject.length === 0) {
          return "Error: gmail_send requires a 'subject' argument.";
        }
        if (typeof body !== "string" || body.length === 0) {
          return "Error: gmail_send requires a 'body' argument.";
        }

        const result = await ctx.gmail.send({
          to,
          subject,
          body,
          cc: typeof input.cc === "string" ? input.cc : undefined,
          bcc: typeof input.bcc === "string" ? input.bcc : undefined,
        });
        if (!result.ok) return `Error: ${result.error.message}`;

        return JSON.stringify({ sent: true, id: result.value.id });
      }

      case "gmail_label": {
        const messageId = input.message_id;
        if (typeof messageId !== "string" || messageId.length === 0) {
          return "Error: gmail_label requires a 'message_id' argument.";
        }

        const addLabels = typeof input.add_labels === "string"
          ? input.add_labels.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined;
        const removeLabels = typeof input.remove_labels === "string"
          ? input.remove_labels.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined;

        const result = await ctx.gmail.label({
          messageId,
          addLabelIds: addLabels,
          removeLabelIds: removeLabels,
        });
        if (!result.ok) return `Error: ${result.error.message}`;

        return JSON.stringify({ labeled: true, id: result.value.id });
      }

      // ── Calendar ───────────────────────────────────────────────────────
      case "calendar_list": {
        const result = await ctx.calendar.list({
          timeMin: typeof input.time_min === "string" ? input.time_min : undefined,
          timeMax: typeof input.time_max === "string" ? input.time_max : undefined,
          maxResults: typeof input.max_results === "number" ? input.max_results : 10,
          calendarId: typeof input.calendar_id === "string" ? input.calendar_id : undefined,
        });
        if (!result.ok) return `Error: ${result.error.message}`;

        if (result.value.length === 0) {
          return "No upcoming events found.";
        }

        return JSON.stringify(
          result.value.map((e) => ({
            id: e.id,
            summary: e.summary,
            start: e.start,
            end: e.end,
            location: e.location,
            attendees: e.attendees?.map((a) => a.email),
          })),
        );
      }

      case "calendar_create": {
        const summary = input.summary;
        const start = input.start;
        const end = input.end;
        if (typeof summary !== "string" || summary.length === 0) {
          return "Error: calendar_create requires a 'summary' argument.";
        }
        if (typeof start !== "string" || start.length === 0) {
          return "Error: calendar_create requires a 'start' argument (ISO 8601).";
        }
        if (typeof end !== "string" || end.length === 0) {
          return "Error: calendar_create requires an 'end' argument (ISO 8601).";
        }

        const attendees = typeof input.attendees === "string"
          ? input.attendees.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined;

        const result = await ctx.calendar.create({
          summary,
          start,
          end,
          description: typeof input.description === "string" ? input.description : undefined,
          location: typeof input.location === "string" ? input.location : undefined,
          attendees,
          calendarId: typeof input.calendar_id === "string" ? input.calendar_id : undefined,
        });
        if (!result.ok) return `Error: ${result.error.message}`;

        return JSON.stringify({
          created: true,
          id: result.value.id,
          summary: result.value.summary,
          start: result.value.start,
          end: result.value.end,
          link: result.value.htmlLink,
        });
      }

      case "calendar_update": {
        const eventId = input.event_id;
        if (typeof eventId !== "string" || eventId.length === 0) {
          return "Error: calendar_update requires an 'event_id' argument.";
        }

        const attendees = typeof input.attendees === "string"
          ? input.attendees.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined;

        const result = await ctx.calendar.update({
          eventId,
          summary: typeof input.summary === "string" ? input.summary : undefined,
          start: typeof input.start === "string" ? input.start : undefined,
          end: typeof input.end === "string" ? input.end : undefined,
          description: typeof input.description === "string" ? input.description : undefined,
          location: typeof input.location === "string" ? input.location : undefined,
          attendees,
          calendarId: typeof input.calendar_id === "string" ? input.calendar_id : undefined,
        });
        if (!result.ok) return `Error: ${result.error.message}`;

        return JSON.stringify({
          updated: true,
          id: result.value.id,
          summary: result.value.summary,
        });
      }

      // ── Tasks ──────────────────────────────────────────────────────────
      case "tasks_list": {
        const result = await ctx.tasks.list({
          taskListId: typeof input.task_list_id === "string" ? input.task_list_id : undefined,
          showCompleted: typeof input.show_completed === "boolean" ? input.show_completed : undefined,
          maxResults: typeof input.max_results === "number" ? input.max_results : 20,
        });
        if (!result.ok) return `Error: ${result.error.message}`;

        if (result.value.length === 0) {
          return "No tasks found.";
        }

        return JSON.stringify(
          result.value.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            due: t.due,
            notes: t.notes,
          })),
        );
      }

      case "tasks_create": {
        const title = input.title;
        if (typeof title !== "string" || title.length === 0) {
          return "Error: tasks_create requires a 'title' argument.";
        }

        const result = await ctx.tasks.create({
          title,
          notes: typeof input.notes === "string" ? input.notes : undefined,
          due: typeof input.due === "string" ? input.due : undefined,
          taskListId: typeof input.task_list_id === "string" ? input.task_list_id : undefined,
        });
        if (!result.ok) return `Error: ${result.error.message}`;

        return JSON.stringify({
          created: true,
          id: result.value.id,
          title: result.value.title,
        });
      }

      case "tasks_complete": {
        const taskId = input.task_id;
        if (typeof taskId !== "string" || taskId.length === 0) {
          return "Error: tasks_complete requires a 'task_id' argument.";
        }

        const result = await ctx.tasks.complete(
          taskId,
          typeof input.task_list_id === "string" ? input.task_list_id : undefined,
        );
        if (!result.ok) return `Error: ${result.error.message}`;

        return JSON.stringify({
          completed: true,
          id: result.value.id,
          title: result.value.title,
        });
      }

      // ── Drive ──────────────────────────────────────────────────────────
      case "drive_search": {
        const query = input.query;
        if (typeof query !== "string" || query.trim().length === 0) {
          return "Error: drive_search requires a non-empty 'query' argument.";
        }
        const maxResults = typeof input.max_results === "number"
          ? input.max_results
          : 10;

        const result = await ctx.drive.search({ query, maxResults });
        if (!result.ok) return `Error: ${result.error.message}`;

        if (result.value.length === 0) {
          return `No files found for query: "${query}"`;
        }

        return JSON.stringify(
          result.value.map((f) => ({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            modifiedTime: f.modifiedTime,
            webViewLink: f.webViewLink,
          })),
        );
      }

      case "drive_read": {
        const fileId = input.file_id;
        if (typeof fileId !== "string" || fileId.length === 0) {
          return "Error: drive_read requires a 'file_id' argument.";
        }

        const result = await ctx.drive.read(fileId);
        if (!result.ok) return `Error: ${result.error.message}`;

        return result.value;
      }

      // ── Sheets ─────────────────────────────────────────────────────────
      case "sheets_read": {
        const spreadsheetId = input.spreadsheet_id;
        const range = input.range;
        if (typeof spreadsheetId !== "string" || spreadsheetId.length === 0) {
          return "Error: sheets_read requires a 'spreadsheet_id' argument.";
        }
        if (typeof range !== "string" || range.length === 0) {
          return "Error: sheets_read requires a 'range' argument.";
        }

        const result = await ctx.sheets.read(spreadsheetId, range);
        if (!result.ok) return `Error: ${result.error.message}`;

        return JSON.stringify({
          range: result.value.range,
          values: result.value.values,
        });
      }

      case "sheets_write": {
        const spreadsheetId = input.spreadsheet_id;
        const range = input.range;
        const valuesStr = input.values;
        if (typeof spreadsheetId !== "string" || spreadsheetId.length === 0) {
          return "Error: sheets_write requires a 'spreadsheet_id' argument.";
        }
        if (typeof range !== "string" || range.length === 0) {
          return "Error: sheets_write requires a 'range' argument.";
        }
        if (typeof valuesStr !== "string" || valuesStr.length === 0) {
          return "Error: sheets_write requires a 'values' argument (JSON 2D array).";
        }

        let values: string[][];
        try {
          values = JSON.parse(valuesStr);
          if (!Array.isArray(values)) throw new Error("not an array");
        } catch {
          return "Error: 'values' must be a valid JSON 2D array (e.g. [[\"a\",\"b\"],[\"c\",\"d\"]])";
        }

        const result = await ctx.sheets.write({
          spreadsheetId,
          range,
          values,
        });
        if (!result.ok) return `Error: ${result.error.message}`;

        return JSON.stringify({
          written: true,
          range: result.value.range,
        });
      }

      default:
        return null;
    }
  };
}
