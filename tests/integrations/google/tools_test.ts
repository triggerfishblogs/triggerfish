/**
 * Google Workspace tool definitions and executor tests.
 *
 * Tests tool definition shapes, executor routing, and parameter validation
 * for the 5 consolidated tools (google_gmail, google_calendar, google_tasks,
 * google_drive, google_sheets) with action-based dispatch.
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

Deno.test("getGoogleToolDefinitions: returns 5 consolidated tools", () => {
  const defs = getGoogleToolDefinitions();
  assertEquals(defs.length, 5);
});

Deno.test("getGoogleToolDefinitions: all tools have unique names", () => {
  const defs = getGoogleToolDefinitions();
  const names = defs.map((d) => d.name);
  const unique = new Set(names);
  assertEquals(unique.size, 5);
});

Deno.test("getGoogleToolDefinitions: contains all expected tool names", () => {
  const defs = getGoogleToolDefinitions();
  const names = new Set(defs.map((d) => d.name));

  const expected = [
    "google_gmail",
    "google_calendar",
    "google_tasks",
    "google_drive",
    "google_sheets",
  ];

  for (const name of expected) {
    assertEquals(names.has(name), true, `Missing tool: ${name}`);
  }
});

Deno.test("getGoogleToolDefinitions: google_gmail has required action param", () => {
  const defs = getGoogleToolDefinitions();
  const tool = defs.find((d) => d.name === "google_gmail")!;
  assertEquals(tool.parameters.action.required, true);
  assertEquals(tool.parameters.action.type, "string");
});

Deno.test("getGoogleToolDefinitions: google_gmail has query param for search", () => {
  const defs = getGoogleToolDefinitions();
  const tool = defs.find((d) => d.name === "google_gmail")!;
  assertEquals(tool.parameters.query.type, "string");
});

Deno.test("getGoogleToolDefinitions: google_gmail has send params (to, subject, body)", () => {
  const defs = getGoogleToolDefinitions();
  const tool = defs.find((d) => d.name === "google_gmail")!;
  assertEquals(tool.parameters.to.type, "string");
  assertEquals(tool.parameters.subject.type, "string");
  assertEquals(tool.parameters.body.type, "string");
});

Deno.test("getGoogleToolDefinitions: google_sheets has values param for write", () => {
  const defs = getGoogleToolDefinitions();
  const tool = defs.find((d) => d.name === "google_sheets")!;
  assertEquals(tool.parameters.spreadsheet_id.type, "string");
  assertEquals(tool.parameters.range.type, "string");
  assertEquals(tool.parameters.values.type, "string");
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

Deno.test("executor: routes google_gmail action:search correctly", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("google_gmail", {
    action: "search",
    query: "test",
  });
  assertEquals(result !== null, true);
  // Empty results from mock
  assertEquals(result!.includes("No emails found"), true);
});

Deno.test("executor: routes google_gmail action:read correctly", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("google_gmail", {
    action: "read",
    message_id: "msg1",
  });
  assertEquals(result !== null, true);
  const parsed = JSON.parse(result!);
  assertEquals(parsed.id, "msg1");
  assertEquals(parsed.subject, "Test");
});

Deno.test("executor: routes google_gmail action:send correctly", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("google_gmail", {
    action: "send",
    to: "test@example.com",
    subject: "Hi",
    body: "Hello",
  });
  const parsed = JSON.parse(result!);
  assertEquals(parsed.sent, true);
});

Deno.test("executor: routes google_calendar action:create correctly", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("google_calendar", {
    action: "create",
    summary: "Meeting",
    start: "2025-01-15T10:00:00Z",
    end: "2025-01-15T11:00:00Z",
  });
  const parsed = JSON.parse(result!);
  assertEquals(parsed.created, true);
  assertEquals(parsed.id, "evt1");
});

Deno.test("executor: routes google_tasks action:create correctly", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("google_tasks", {
    action: "create",
    title: "Buy milk",
  });
  const parsed = JSON.parse(result!);
  assertEquals(parsed.created, true);
});

Deno.test("executor: routes google_drive action:read correctly", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("google_drive", {
    action: "read",
    file_id: "file1",
  });
  assertEquals(result, "File content here");
});

Deno.test("executor: routes google_sheets action:read correctly", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("google_sheets", {
    action: "read",
    spreadsheet_id: "ss1",
    range: "Sheet1!A1:B2",
  });
  const parsed = JSON.parse(result!);
  assertEquals(parsed.range, "Sheet1!A1:B2");
  assertEquals(parsed.values.length, 2);
});

Deno.test("executor: routes google_sheets action:write correctly", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("google_sheets", {
    action: "write",
    spreadsheet_id: "ss1",
    range: "Sheet1!A1",
    values: '[["x","y"]]',
  });
  const parsed = JSON.parse(result!);
  assertEquals(parsed.written, true);
});

// ─── Action Validation ──────────────────────────────────────────────────────

Deno.test("executor: rejects missing action parameter", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("google_gmail", { query: "test" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("action"), true);
});

Deno.test("executor: rejects unknown action", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("google_gmail", { action: "delete" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("unknown action"), true);
});

// ─── Parameter Validation ───────────────────────────────────────────────────

Deno.test("executor: google_gmail search rejects empty query", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("google_gmail", {
    action: "search",
    query: "",
  });
  assertEquals(result!.includes("Error"), true);
});

Deno.test("executor: google_gmail send rejects missing to", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("google_gmail", {
    action: "send",
    subject: "Hi",
    body: "Hello",
  });
  assertEquals(result!.includes("Error"), true);
});

Deno.test("executor: google_calendar create rejects missing summary", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("google_calendar", {
    action: "create",
    start: "2025-01-15T10:00:00Z",
    end: "2025-01-15T11:00:00Z",
  });
  assertEquals(result!.includes("Error"), true);
});

Deno.test("executor: google_sheets write rejects invalid JSON values", async () => {
  const executor = createGoogleToolExecutor(createMockContext());
  const result = await executor("google_sheets", {
    action: "write",
    spreadsheet_id: "ss1",
    range: "A1",
    values: "not json",
  });
  assertEquals(result!.includes("Error"), true);
});
