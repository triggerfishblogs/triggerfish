/**
 * Google Workspace tool definitions and executor tests.
 *
 * Tests tool definition shapes, executor routing, and parameter validation.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import {
  createGoogleToolExecutor,
  getGoogleToolDefinitions,
  GOOGLE_TOOLS_SYSTEM_PROMPT,
} from "../../../src/integrations/google/tools.ts";
import type {
  CalendarService,
  DriveService,
  GmailService,
  GoogleToolContext,
  SheetsService,
  TasksService,
} from "../../../src/integrations/google/types.ts";
import type { SessionId } from "../../../src/core/types/session.ts";

// ─── Tool Definitions ───────────────────────────────────────────────────────

Deno.test("getGoogleToolDefinitions: returns 14 tools", () => {
  const defs = getGoogleToolDefinitions();
  assertEquals(defs.length, 14);
});

Deno.test("getGoogleToolDefinitions: all tools have unique names", () => {
  const defs = getGoogleToolDefinitions();
  const names = defs.map((d) => d.name);
  const unique = new Set(names);
  assertEquals(unique.size, 14);
});

Deno.test("getGoogleToolDefinitions: contains all expected tool names", () => {
  const defs = getGoogleToolDefinitions();
  const names = new Set(defs.map((d) => d.name));

  const expected = [
    "gmail_search",
    "gmail_read",
    "gmail_send",
    "gmail_label",
    "calendar_list",
    "calendar_create",
    "calendar_update",
    "tasks_list",
    "tasks_create",
    "tasks_complete",
    "drive_search",
    "drive_read",
    "sheets_read",
    "sheets_write",
  ];

  for (const name of expected) {
    assertEquals(names.has(name), true, `Missing tool: ${name}`);
  }
});

Deno.test("getGoogleToolDefinitions: gmail_search has required query param", () => {
  const defs = getGoogleToolDefinitions();
  const tool = defs.find((d) => d.name === "gmail_search")!;
  assertEquals(tool.parameters.query.required, true);
  assertEquals(tool.parameters.query.type, "string");
});

Deno.test("getGoogleToolDefinitions: gmail_send has required to, subject, body", () => {
  const defs = getGoogleToolDefinitions();
  const tool = defs.find((d) => d.name === "gmail_send")!;
  assertEquals(tool.parameters.to.required, true);
  assertEquals(tool.parameters.subject.required, true);
  assertEquals(tool.parameters.body.required, true);
});

Deno.test("getGoogleToolDefinitions: sheets_write has required values param", () => {
  const defs = getGoogleToolDefinitions();
  const tool = defs.find((d) => d.name === "sheets_write")!;
  assertEquals(tool.parameters.spreadsheet_id.required, true);
  assertEquals(tool.parameters.range.required, true);
  assertEquals(tool.parameters.values.required, true);
});

Deno.test("GOOGLE_TOOLS_SYSTEM_PROMPT: is a non-empty string", () => {
  assertEquals(typeof GOOGLE_TOOLS_SYSTEM_PROMPT, "string");
  assertEquals(GOOGLE_TOOLS_SYSTEM_PROMPT.length > 100, true);
});

// ─── Mock Services ──────────────────────────────────────────────────────────

function createMockGmailService(): GmailService {
  return {
    search: () => Promise.resolve({ ok: true, value: [] }),
    read: () =>
      Promise.resolve({
        ok: true,
        value: {
          id: "msg1",
          threadId: "t1",
          from: "test@example.com",
          to: "me@example.com",
          subject: "Test",
          date: "2025-01-15",
          snippet: "Hello",
          body: "Hello World",
          labelIds: ["INBOX"],
        },
      }),
    send: () => Promise.resolve({ ok: true, value: { id: "sent1" } }),
    label: () => Promise.resolve({ ok: true, value: { id: "msg1" } }),
  };
}

function createMockCalendarService(): CalendarService {
  return {
    list: () => Promise.resolve({ ok: true, value: [] }),
    create: () =>
      Promise.resolve({
        ok: true,
        value: {
          id: "evt1",
          summary: "Meeting",
          start: "2025-01-15T10:00:00Z",
          end: "2025-01-15T11:00:00Z",
          htmlLink: "https://calendar.google.com/event/evt1",
        },
      }),
    update: () =>
      Promise.resolve({
        ok: true,
        value: {
          id: "evt1",
          summary: "Updated Meeting",
          start: "2025-01-15T10:00:00Z",
          end: "2025-01-15T11:00:00Z",
        },
      }),
  };
}

function createMockTasksService(): TasksService {
  return {
    list: () => Promise.resolve({ ok: true, value: [] }),
    create: () =>
      Promise.resolve({
        ok: true,
        value: { id: "task1", title: "New Task", status: "needsAction" },
      }),
    complete: () =>
      Promise.resolve({
        ok: true,
        value: { id: "task1", title: "Done Task", status: "completed" },
      }),
  };
}

function createMockDriveService(): DriveService {
  return {
    search: () => Promise.resolve({ ok: true, value: [] }),
    read: () => Promise.resolve({ ok: true, value: "File content here" }),
  };
}

function createMockSheetsService(): SheetsService {
  return {
    read: () =>
      Promise.resolve({
        ok: true,
        value: { range: "Sheet1!A1:B2", values: [["a", "b"], ["c", "d"]] },
      }),
    write: () =>
      Promise.resolve({
        ok: true,
        value: { range: "Sheet1!A1:B2", values: [["x", "y"]] },
      }),
  };
}

function createMockContext(): GoogleToolContext {
  return {
    gmail: createMockGmailService(),
    calendar: createMockCalendarService(),
    tasks: createMockTasksService(),
    drive: createMockDriveService(),
    sheets: createMockSheetsService(),
    sessionTaint: () => "INTERNAL",
    sourceSessionId: "test-session" as SessionId,
  };
}

// ─── Executor Routing ───────────────────────────────────────────────────────

Deno.test("executor: returns null for unknown tool", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("unknown_tool", {});
  assertEquals(result, null);
});

Deno.test("executor: routes gmail_search correctly", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("gmail_search", { query: "test" });
  assertEquals(result !== null, true);
  // Empty results from mock
  assertEquals(result!.includes("No emails found"), true);
});

Deno.test("executor: routes gmail_read correctly", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("gmail_read", { message_id: "msg1" });
  assertEquals(result !== null, true);
  const parsed = JSON.parse(result!);
  assertEquals(parsed.id, "msg1");
  assertEquals(parsed.subject, "Test");
});

Deno.test("executor: routes gmail_send correctly", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("gmail_send", {
    to: "test@example.com",
    subject: "Hi",
    body: "Hello",
  });
  const parsed = JSON.parse(result!);
  assertEquals(parsed.sent, true);
});

Deno.test("executor: routes calendar_create correctly", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("calendar_create", {
    summary: "Meeting",
    start: "2025-01-15T10:00:00Z",
    end: "2025-01-15T11:00:00Z",
  });
  const parsed = JSON.parse(result!);
  assertEquals(parsed.created, true);
  assertEquals(parsed.id, "evt1");
});

Deno.test("executor: routes tasks_create correctly", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("tasks_create", { title: "Buy milk" });
  const parsed = JSON.parse(result!);
  assertEquals(parsed.created, true);
});

Deno.test("executor: routes drive_read correctly", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("drive_read", { file_id: "file1" });
  assertEquals(result, "File content here");
});

Deno.test("executor: routes sheets_read correctly", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("sheets_read", {
    spreadsheet_id: "ss1",
    range: "Sheet1!A1:B2",
  });
  const parsed = JSON.parse(result!);
  assertEquals(parsed.range, "Sheet1!A1:B2");
  assertEquals(parsed.values.length, 2);
});

Deno.test("executor: routes sheets_write correctly", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("sheets_write", {
    spreadsheet_id: "ss1",
    range: "Sheet1!A1",
    values: '[["x","y"]]',
  });
  const parsed = JSON.parse(result!);
  assertEquals(parsed.written, true);
});

// ─── Parameter Validation ───────────────────────────────────────────────────

Deno.test("executor: gmail_search rejects empty query", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("gmail_search", { query: "" });
  assertEquals(result!.includes("Error"), true);
});

Deno.test("executor: gmail_send rejects missing to", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("gmail_send", {
    subject: "Hi",
    body: "Hello",
  });
  assertEquals(result!.includes("Error"), true);
});

Deno.test("executor: calendar_create rejects missing summary", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("calendar_create", {
    start: "2025-01-15T10:00:00Z",
    end: "2025-01-15T11:00:00Z",
  });
  assertEquals(result!.includes("Error"), true);
});

Deno.test("executor: sheets_write rejects invalid JSON values", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("sheets_write", {
    spreadsheet_id: "ss1",
    range: "A1",
    values: "not json",
  });
  assertEquals(result!.includes("Error"), true);
});
