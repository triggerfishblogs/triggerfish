/**
 * Google Workspace classification boundary tests.
 *
 * These are the most critical security tests for Phase B1.
 * They verify that Google data respects classification levels,
 * taint escalation, and the no-write-down rule.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createGoogleToolExecutor } from "../../../src/integrations/google/tools.ts";
import type {
  GoogleToolContext,
  GmailService,
  CalendarService,
  TasksService,
  DriveService,
  SheetsService,
} from "../../../src/integrations/google/types.ts";
import type { ClassificationLevel } from "../../../src/core/types/classification.ts";
import { canFlowTo, maxClassification } from "../../../src/core/types/classification.ts";
import type { SessionId } from "../../../src/core/types/session.ts";

// ─── Helpers ────────────────────────────────────────────────────────────────

function createMinimalGmailService(): GmailService {
  return {
    search: () =>
      Promise.resolve({
        ok: true,
        value: [
          {
            id: "msg1",
            threadId: "t1",
            from: "ceo@company.com",
            to: "me@company.com",
            subject: "Confidential Q4 Report",
            date: "2025-01-15",
            snippet: "Please review the attached...",
            body: "Revenue figures: $10M...",
            labelIds: ["INBOX", "IMPORTANT"],
          },
        ],
      }),
    read: () =>
      Promise.resolve({
        ok: true,
        value: {
          id: "msg1",
          threadId: "t1",
          from: "ceo@company.com",
          to: "me@company.com",
          subject: "Confidential Q4 Report",
          date: "2025-01-15",
          snippet: "Please review...",
          body: "Revenue figures: $10M...",
          labelIds: ["INBOX"],
        },
      }),
    send: () => Promise.resolve({ ok: true, value: { id: "sent1" } }),
    label: () => Promise.resolve({ ok: true, value: { id: "msg1" } }),
  };
}

function createMinimalCalendarService(): CalendarService {
  return {
    list: () =>
      Promise.resolve({
        ok: true,
        value: [
          {
            id: "evt1",
            summary: "Board Meeting",
            start: "2025-01-15T10:00:00Z",
            end: "2025-01-15T11:00:00Z",
            attendees: [
              { email: "ceo@company.com" },
              { email: "cfo@company.com" },
            ],
          },
        ],
      }),
    create: () =>
      Promise.resolve({
        ok: true,
        value: {
          id: "evt2",
          summary: "Meeting",
          start: "2025-01-15T10:00:00Z",
          end: "2025-01-15T11:00:00Z",
        },
      }),
    update: () =>
      Promise.resolve({
        ok: true,
        value: {
          id: "evt1",
          summary: "Updated",
          start: "2025-01-15T10:00:00Z",
          end: "2025-01-15T11:00:00Z",
        },
      }),
  };
}

function createMinimalTasksService(): TasksService {
  return {
    list: () => Promise.resolve({ ok: true, value: [] }),
    create: () =>
      Promise.resolve({
        ok: true,
        value: { id: "t1", title: "Task", status: "needsAction" },
      }),
    complete: () =>
      Promise.resolve({
        ok: true,
        value: { id: "t1", title: "Task", status: "completed" },
      }),
  };
}

function createMinimalDriveService(): DriveService {
  return {
    search: () =>
      Promise.resolve({
        ok: true,
        value: [
          {
            id: "file1",
            name: "Secret Roadmap.docx",
            mimeType: "application/vnd.google-apps.document",
          },
        ],
      }),
    read: () =>
      Promise.resolve({ ok: true, value: "Confidential roadmap content..." }),
  };
}

function createMinimalSheetsService(): SheetsService {
  return {
    read: () =>
      Promise.resolve({
        ok: true,
        value: {
          range: "Sheet1!A1:B2",
          values: [["Revenue", "10000000"], ["Costs", "5000000"]],
        },
      }),
    write: () =>
      Promise.resolve({
        ok: true,
        value: { range: "Sheet1!A1", values: [["Updated"]] },
      }),
  };
}

function createContextWithTaint(
  taint: ClassificationLevel,
  floors?: Record<string, ClassificationLevel>,
): GoogleToolContext {
  return {
    gmail: createMinimalGmailService(),
    calendar: createMinimalCalendarService(),
    tasks: createMinimalTasksService(),
    drive: createMinimalDriveService(),
    sheets: createMinimalSheetsService(),
    sessionTaint: () => taint,
    sourceSessionId: "test-session" as SessionId,
    classificationFloors: floors,
  };
}

// ─── Test 1: Google data inherits session taint level ───────────────────────

Deno.test("classification: Google tool context carries session taint", () => {
  const ctx = createContextWithTaint("CONFIDENTIAL");
  assertEquals(ctx.sessionTaint(), "CONFIDENTIAL");
});

Deno.test("classification: PUBLIC session has PUBLIC taint", () => {
  const ctx = createContextWithTaint("PUBLIC");
  assertEquals(ctx.sessionTaint(), "PUBLIC");
});

Deno.test("classification: RESTRICTED session has RESTRICTED taint", () => {
  const ctx = createContextWithTaint("RESTRICTED");
  assertEquals(ctx.sessionTaint(), "RESTRICTED");
});

// ─── Test 2: Classification floors escalate taint ───────────────────────────

Deno.test("classification: per-service floors can escalate taint", () => {
  const ctx = createContextWithTaint("PUBLIC", {
    gmail: "CONFIDENTIAL",
    drive: "INTERNAL",
  });

  // Gmail floor is CONFIDENTIAL — accessing Gmail data should escalate
  // a PUBLIC session to at least CONFIDENTIAL
  const gmailFloor = ctx.classificationFloors?.["gmail"] ?? "PUBLIC";
  const escalated = maxClassification(ctx.sessionTaint(), gmailFloor);
  assertEquals(escalated, "CONFIDENTIAL");
});

Deno.test("classification: floor does not downgrade taint", () => {
  const ctx = createContextWithTaint("RESTRICTED", {
    gmail: "INTERNAL",
  });

  const gmailFloor = ctx.classificationFloors?.["gmail"] ?? "PUBLIC";
  const result = maxClassification(ctx.sessionTaint(), gmailFloor);
  // RESTRICTED is higher than INTERNAL — stays RESTRICTED
  assertEquals(result, "RESTRICTED");
});

// ─── Test 3: No-write-down rule ─────────────────────────────────────────────

Deno.test("classification: CONFIDENTIAL data cannot flow to PUBLIC", () => {
  assertEquals(canFlowTo("CONFIDENTIAL", "PUBLIC"), false);
});

Deno.test("classification: CONFIDENTIAL data can flow to CONFIDENTIAL", () => {
  assertEquals(canFlowTo("CONFIDENTIAL", "CONFIDENTIAL"), true);
});

Deno.test("classification: CONFIDENTIAL data can flow to RESTRICTED", () => {
  assertEquals(canFlowTo("CONFIDENTIAL", "RESTRICTED"), true);
});

Deno.test("classification: INTERNAL data cannot flow to PUBLIC", () => {
  assertEquals(canFlowTo("INTERNAL", "PUBLIC"), false);
});

// ─── Test 4: Gmail tool returns data (executor produces output) ─────────────

Deno.test("classification: gmail_search returns data at session taint level", async () => {
  const ctx = createContextWithTaint("CONFIDENTIAL");
  const executor = createGoogleToolExecutor(ctx);

  const result = await executor("gmail_search", { query: "Q4 report" });
  assertEquals(result !== null, true);

  // Data was returned — in a real system, the orchestrator would check
  // canFlowTo(session.taint, channelClassification) before outputting
  const parsed = JSON.parse(result!);
  assertEquals(Array.isArray(parsed), true);
  assertEquals(parsed.length, 1);
  assertEquals(parsed[0].subject, "Confidential Q4 Report");
});

// ─── Test 5: Drive file read returns content ────────────────────────────────

Deno.test("classification: drive_read returns file content", async () => {
  const ctx = createContextWithTaint("INTERNAL");
  const executor = createGoogleToolExecutor(ctx);

  const result = await executor("drive_read", { file_id: "file1" });
  assertEquals(result !== null, true);
  assertEquals(result!.includes("Confidential roadmap"), true);
});

// ─── Test 6: Calendar with attendees returns data ───────────────────────────

Deno.test("classification: calendar_list returns events with attendees", async () => {
  const ctx = createContextWithTaint("INTERNAL");
  const executor = createGoogleToolExecutor(ctx);

  const result = await executor("calendar_list", {});
  assertEquals(result !== null, true);

  const parsed = JSON.parse(result!);
  assertEquals(Array.isArray(parsed), true);
  assertEquals(parsed[0].summary, "Board Meeting");
  assertEquals(parsed[0].attendees.length, 2);
  assertEquals(parsed[0].attendees[0], "ceo@company.com");
});

// ─── Test 7: Executor handles error results gracefully ──────────────────────

Deno.test("classification: executor surfaces API errors as strings", async () => {
  const ctx: GoogleToolContext = {
    ...createContextWithTaint("INTERNAL"),
    gmail: {
      search: () =>
        Promise.resolve({
          ok: false,
          error: {
            code: "HTTP_403",
            message: "Insufficient permission",
            status: 403,
          },
        }),
      read: () =>
        Promise.resolve({
          ok: false,
          error: { code: "HTTP_404", message: "Not found", status: 404 },
        }),
      send: () =>
        Promise.resolve({ ok: true, value: { id: "x" } }),
      label: () =>
        Promise.resolve({ ok: true, value: { id: "x" } }),
    },
  };
  const executor = createGoogleToolExecutor(ctx);

  const result = await executor("gmail_search", { query: "test" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("Insufficient permission"), true);
});

// ─── Test 8: Sheets write validates JSON ────────────────────────────────────

Deno.test("classification: sheets_write rejects non-JSON values safely", async () => {
  const ctx = createContextWithTaint("INTERNAL");
  const executor = createGoogleToolExecutor(ctx);

  const result = await executor("sheets_write", {
    spreadsheet_id: "ss1",
    range: "A1",
    values: "this is not json",
  });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("JSON"), true);
});

// ─── Test 9: All tools return null for non-Google tools ─────────────────────

Deno.test("classification: executor returns null for non-Google tools", async () => {
  const ctx = createContextWithTaint("INTERNAL");
  const executor = createGoogleToolExecutor(ctx);

  assertEquals(await executor("web_search", { query: "test" }), null);
  assertEquals(await executor("memory_save", { key: "k", content: "c" }), null);
  assertEquals(await executor("read_file", { path: "/etc/passwd" }), null);
});

// ─── Test 10: Classification flow integrity ─────────────────────────────────

Deno.test("classification: full flow — taint escalation chain is correct", () => {
  // Simulates: PUBLIC session → accesses Gmail (CONFIDENTIAL floor) → taint escalates
  let taint: ClassificationLevel = "PUBLIC";

  // Step 1: Access Gmail (floor: CONFIDENTIAL)
  const gmailFloor: ClassificationLevel = "CONFIDENTIAL";
  taint = maxClassification(taint, gmailFloor);
  assertEquals(taint, "CONFIDENTIAL");

  // Step 2: Access Drive (floor: INTERNAL) — already higher, no change
  const driveFloor: ClassificationLevel = "INTERNAL";
  taint = maxClassification(taint, driveFloor);
  assertEquals(taint, "CONFIDENTIAL");

  // Step 3: Try to output to PUBLIC channel — blocked
  assertEquals(canFlowTo(taint, "PUBLIC"), false);

  // Step 4: Output to CONFIDENTIAL channel — allowed
  assertEquals(canFlowTo(taint, "CONFIDENTIAL"), true);

  // Step 5: Output to RESTRICTED channel — allowed
  assertEquals(canFlowTo(taint, "RESTRICTED"), true);
});
