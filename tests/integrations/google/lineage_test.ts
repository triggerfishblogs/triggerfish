/**
 * Google integration lineage recording tests.
 *
 * Verifies that recordGoogleLineage creates lineage records with correct
 * metadata, no-ops when lineageStore is absent, and catches errors gracefully.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { recordGoogleLineage } from "../../../src/integrations/google/lineage.ts";
import type { GoogleToolContext } from "../../../src/integrations/google/auth/types_context.ts";
import type { SessionId } from "../../../src/core/types/session.ts";
import type { ClassificationLevel } from "../../../src/core/types/classification.ts";
import type {
  LineageCreateInput,
  LineageRecord,
  LineageStore,
} from "../../../src/core/session/lineage_types.ts";
import type { GmailService } from "../../../src/integrations/google/gmail/types_gmail.ts";
import type { CalendarService } from "../../../src/integrations/google/calendar/types_calendar.ts";
import type { TasksService } from "../../../src/integrations/google/tasks/types_tasks.ts";
import type { DriveService } from "../../../src/integrations/google/drive/types_drive.ts";
import type { SheetsService } from "../../../src/integrations/google/sheets/types_sheets.ts";

// ─── Mock LineageStore ──────────────────────────────────────────────────────

interface LineageCall {
  readonly input: LineageCreateInput;
}

interface MockLineageStore extends LineageStore {
  readonly calls: LineageCall[];
}

function createMockLineageStore(): MockLineageStore {
  const calls: LineageCall[] = [];
  let counter = 0;

  return {
    calls,
    create(input: LineageCreateInput): Promise<LineageRecord> {
      calls.push({ input });
      counter++;
      return Promise.resolve({
        lineage_id: `google-lineage-${counter}`,
        content_hash: `hash-${counter}`,
        origin: input.origin,
        classification: input.classification,
        sessionId: input.sessionId,
      });
    },
    get: () => Promise.resolve(null),
    getBySession: () => Promise.resolve([]),
    trace_forward: () => Promise.resolve([]),
    trace_forward_indexed: () => Promise.resolve([]),
    trace_backward: () => Promise.resolve([]),
    getByHash: () => Promise.resolve(null),
    export: () => Promise.resolve([]),
    applyLineageRetention: () => Promise.resolve({ ok: true, value: 0 }),
  };
}

// ─── Mock Google Services ───────────────────────────────────────────────────

function createStubGmailService(): GmailService {
  return {
    search: () => Promise.resolve({ ok: true, value: [] }),
    read: () =>
      Promise.resolve({
        ok: true,
        value: {
          id: "m1",
          threadId: "t1",
          from: "a@b.com",
          to: "c@d.com",
          subject: "S",
          date: "2025-01-01",
          snippet: "",
          body: "",
          labelIds: [],
        },
      }),
    send: () => Promise.resolve({ ok: true, value: { id: "s1" } }),
    label: () => Promise.resolve({ ok: true, value: { id: "m1" } }),
  };
}

function createStubCalendarService(): CalendarService {
  return {
    list: () => Promise.resolve({ ok: true, value: [] }),
    create: () =>
      Promise.resolve({
        ok: true,
        value: {
          id: "e1",
          summary: "E",
          start: "2025-01-01T00:00:00Z",
          end: "2025-01-01T01:00:00Z",
          htmlLink: "https://calendar.google.com/e1",
        },
      }),
    update: () =>
      Promise.resolve({
        ok: true,
        value: {
          id: "e1",
          summary: "E",
          start: "2025-01-01T00:00:00Z",
          end: "2025-01-01T01:00:00Z",
        },
      }),
  };
}

function createStubTasksService(): TasksService {
  return {
    list: () => Promise.resolve({ ok: true, value: [] }),
    create: () =>
      Promise.resolve({
        ok: true,
        value: { id: "t1", title: "T", status: "needsAction" },
      }),
    complete: () =>
      Promise.resolve({
        ok: true,
        value: { id: "t1", title: "T", status: "completed" },
      }),
  };
}

function createStubDriveService(): DriveService {
  return {
    search: () => Promise.resolve({ ok: true, value: [] }),
    read: () => Promise.resolve({ ok: true, value: "content" }),
  };
}

function createStubSheetsService(): SheetsService {
  return {
    read: () =>
      Promise.resolve({
        ok: true,
        value: { range: "A1", values: [] },
      }),
    write: () =>
      Promise.resolve({
        ok: true,
        value: { range: "A1", values: [] },
      }),
  };
}

// ─── Context Helpers ────────────────────────────────────────────────────────

function createContextWithLineage(
  lineageStore: LineageStore,
  taint: ClassificationLevel = "INTERNAL",
): GoogleToolContext {
  return {
    gmail: createStubGmailService(),
    calendar: createStubCalendarService(),
    tasks: createStubTasksService(),
    drive: createStubDriveService(),
    sheets: createStubSheetsService(),
    sessionTaint: () => taint,
    sourceSessionId: "google-test-session" as SessionId,
    lineageStore,
  };
}

function createContextWithoutLineage(): GoogleToolContext {
  return {
    gmail: createStubGmailService(),
    calendar: createStubCalendarService(),
    tasks: createStubTasksService(),
    drive: createStubDriveService(),
    sheets: createStubSheetsService(),
    sessionTaint: () => "INTERNAL",
    sourceSessionId: "google-test-session" as SessionId,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

Deno.test("google lineage: recordGoogleLineage creates lineage record with google_api source", async () => {
  const lineageStore = createMockLineageStore();
  const ctx = createContextWithLineage(lineageStore);

  await recordGoogleLineage(ctx, "gmail", "search", "search results here");

  assertEquals(lineageStore.calls.length, 1);
  const call = lineageStore.calls[0];
  assertEquals(call.input.origin.source_type, "google_api");
  assertEquals(call.input.origin.source_name, "gmail");
  assertEquals(call.input.origin.access_method, "search");
  assertEquals(call.input.origin.accessed_by, "owner");
  assertEquals(call.input.content, "search results here");
  assertEquals(call.input.sessionId, "google-test-session");
  assertEquals(
    call.input.classification.reason,
    "Google gmail: search",
  );
});

Deno.test("google lineage: recordGoogleLineage no-ops when lineageStore absent", async () => {
  const ctx = createContextWithoutLineage();

  // Should complete without error and without side effects
  await recordGoogleLineage(ctx, "calendar", "list", "calendar events");

  // No assertion beyond "didn't throw" — the function returns void
});

Deno.test("google lineage: recordGoogleLineage catches errors without throwing", async () => {
  const failingStore: LineageStore = {
    create(): Promise<LineageRecord> {
      return Promise.reject(new Error("Lineage storage exploded"));
    },
    get: () => Promise.resolve(null),
    getBySession: () => Promise.resolve([]),
    trace_forward: () => Promise.resolve([]),
    trace_forward_indexed: () => Promise.resolve([]),
    trace_backward: () => Promise.resolve([]),
    getByHash: () => Promise.resolve(null),
    export: () => Promise.resolve([]),
    applyLineageRetention: () => Promise.resolve({ ok: true, value: 0 }),
  };

  const ctx = createContextWithLineage(failingStore);

  // Should not throw — errors are caught internally
  await recordGoogleLineage(ctx, "drive", "read", "file content");
});

Deno.test("google lineage: lineage uses sessionTaint for classification", async () => {
  const lineageStore = createMockLineageStore();
  const ctx = createContextWithLineage(lineageStore, "CONFIDENTIAL");

  await recordGoogleLineage(ctx, "sheets", "write", "spreadsheet data");

  assertEquals(lineageStore.calls.length, 1);
  assertEquals(
    lineageStore.calls[0].input.classification.level,
    "CONFIDENTIAL",
  );
});
