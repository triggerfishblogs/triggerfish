/**
 * Google Workspace tool executor.
 *
 * Creates a chain-compatible executor for the 14 Google Workspace tools.
 * Tool definitions live in `tools_defs.ts`; this module contains the
 * runtime dispatch logic.
 *
 * @module
 */

import type { GoogleToolContext } from "./types.ts";

// ─── Barrel re-exports from tools_defs.ts ───────────────────────────────────

export { getGoogleToolDefinitions, GOOGLE_TOOLS_SYSTEM_PROMPT } from "./tools_defs.ts";

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
