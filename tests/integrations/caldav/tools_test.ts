/**
 * CalDAV tools tests.
 *
 * Tests all 7 tool definitions, parameter validation,
 * null fallthrough, and graceful error handling.
 */
import { assertEquals } from "@std/assert";
import {
  getCalDavToolDefinitions,
  createCalDavToolExecutor,
  CALDAV_SYSTEM_PROMPT,
} from "../../../src/integrations/caldav/tools.ts";
import type { CalDavToolContext } from "../../../src/integrations/caldav/types.ts";
import type { SessionId } from "../../../src/core/types/session.ts";
import type { ClassificationLevel } from "../../../src/core/types/classification.ts";

// ─── Tool Definitions ─────────────────────────────────────────────────────────

Deno.test("getCalDavToolDefinitions: returns 7 tool definitions", () => {
  const defs = getCalDavToolDefinitions();
  assertEquals(defs.length, 7);
});

Deno.test("getCalDavToolDefinitions: all tools have caldav_ prefix", () => {
  const defs = getCalDavToolDefinitions();
  for (const def of defs) {
    assertEquals(def.name.startsWith("caldav_"), true, `${def.name} missing caldav_ prefix`);
  }
});

Deno.test("getCalDavToolDefinitions: all tools have descriptions", () => {
  const defs = getCalDavToolDefinitions();
  for (const def of defs) {
    assertEquals(typeof def.description, "string");
    assertEquals(def.description.length > 0, true, `${def.name} has empty description`);
  }
});

Deno.test("getCalDavToolDefinitions: expected tool names present", () => {
  const defs = getCalDavToolDefinitions();
  const names = new Set(defs.map((d) => d.name));
  const expected = [
    "caldav_calendars_list",
    "caldav_events_list",
    "caldav_events_get",
    "caldav_events_create",
    "caldav_events_update",
    "caldav_events_delete",
    "caldav_freebusy",
  ];
  for (const name of expected) {
    assertEquals(names.has(name), true, `Missing tool: ${name}`);
  }
});

Deno.test("getCalDavToolDefinitions: all names are unique", () => {
  const defs = getCalDavToolDefinitions();
  const names = defs.map((d) => d.name);
  const unique = new Set(names);
  assertEquals(unique.size, 7);
});

// ─── System Prompt ────────────────────────────────────────────────────────────

Deno.test("CALDAV_SYSTEM_PROMPT: is a non-empty string", () => {
  assertEquals(typeof CALDAV_SYSTEM_PROMPT, "string");
  assertEquals(CALDAV_SYSTEM_PROMPT.length > 0, true);
});

Deno.test("CALDAV_SYSTEM_PROMPT: mentions caldav_ tools", () => {
  assertEquals(CALDAV_SYSTEM_PROMPT.includes("caldav_"), true);
});

// ─── Fallthrough ──────────────────────────────────────────────────────────────

Deno.test("createCalDavToolExecutor: returns null for non-caldav tools", async () => {
  const executor = createCalDavToolExecutor(undefined);
  const result = await executor("web_search", { query: "test" });
  assertEquals(result, null);
});

Deno.test("createCalDavToolExecutor: returns null for unknown caldav_ tool", async () => {
  const ctx = createMockContext();
  const executor = createCalDavToolExecutor(ctx);
  const result = await executor("caldav_unknown_tool", {});
  assertEquals(result, null);
});

// ─── Not Configured ──────────────────────────────────────────────────────────

Deno.test("createCalDavToolExecutor: returns error when not configured", async () => {
  const executor = createCalDavToolExecutor(undefined);
  const result = await executor("caldav_calendars_list", {});
  assertEquals(typeof result, "string");
  assertEquals(result!.includes("not configured"), true);
});

// ─── Parameter Validation ────────────────────────────────────────────────────

Deno.test("executor: caldav_events_list requires time_min", async () => {
  const ctx = createMockContext();
  const executor = createCalDavToolExecutor(ctx);
  const result = await executor("caldav_events_list", { time_max: "2025-03-31" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("time_min"), true);
});

Deno.test("executor: caldav_events_list requires time_max", async () => {
  const ctx = createMockContext();
  const executor = createCalDavToolExecutor(ctx);
  const result = await executor("caldav_events_list", { time_min: "2025-03-01" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("time_max"), true);
});

Deno.test("executor: caldav_events_get requires event_uid", async () => {
  const ctx = createMockContext();
  const executor = createCalDavToolExecutor(ctx);
  const result = await executor("caldav_events_get", {});
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("event_uid"), true);
});

Deno.test("executor: caldav_events_create requires summary", async () => {
  const ctx = createMockContext();
  const executor = createCalDavToolExecutor(ctx);
  const result = await executor("caldav_events_create", {
    start: "20250315T100000Z",
    end: "20250315T110000Z",
  });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("summary"), true);
});

Deno.test("executor: caldav_events_create requires start", async () => {
  const ctx = createMockContext();
  const executor = createCalDavToolExecutor(ctx);
  const result = await executor("caldav_events_create", {
    summary: "Test",
    end: "20250315T110000Z",
  });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("start"), true);
});

Deno.test("executor: caldav_events_create requires end", async () => {
  const ctx = createMockContext();
  const executor = createCalDavToolExecutor(ctx);
  const result = await executor("caldav_events_create", {
    summary: "Test",
    start: "20250315T100000Z",
  });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("end"), true);
});

Deno.test("executor: caldav_events_update requires event_uid", async () => {
  const ctx = createMockContext();
  const executor = createCalDavToolExecutor(ctx);
  const result = await executor("caldav_events_update", { etag: "etag1" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("event_uid"), true);
});

Deno.test("executor: caldav_events_update requires etag", async () => {
  const ctx = createMockContext();
  const executor = createCalDavToolExecutor(ctx);
  const result = await executor("caldav_events_update", { event_uid: "uid1" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("etag"), true);
});

Deno.test("executor: caldav_events_delete requires event_uid", async () => {
  const ctx = createMockContext();
  const executor = createCalDavToolExecutor(ctx);
  const result = await executor("caldav_events_delete", { etag: "etag1" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("event_uid"), true);
});

Deno.test("executor: caldav_events_delete requires etag", async () => {
  const ctx = createMockContext();
  const executor = createCalDavToolExecutor(ctx);
  const result = await executor("caldav_events_delete", { event_uid: "uid1" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("etag"), true);
});

Deno.test("executor: caldav_freebusy requires time_min", async () => {
  const ctx = createMockContext();
  const executor = createCalDavToolExecutor(ctx);
  const result = await executor("caldav_freebusy", { time_max: "2025-03-31" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("time_min"), true);
});

Deno.test("executor: caldav_freebusy requires time_max", async () => {
  const ctx = createMockContext();
  const executor = createCalDavToolExecutor(ctx);
  const result = await executor("caldav_freebusy", { time_min: "2025-03-01" });
  assertEquals(result!.includes("Error"), true);
  assertEquals(result!.includes("time_max"), true);
});

// ─── Response Formatting ──────────────────────────────────────────────────────

Deno.test("executor: caldav_events_create returns JSON with uid and etag", async () => {
  const ctx = createMockContext({
    putResponse: { etag: "new-etag", href: "/calendars/test/event.ics" },
  });
  const executor = createCalDavToolExecutor(ctx);
  const result = await executor("caldav_events_create", {
    summary: "New Event",
    start: "20250315T100000Z",
    end: "20250315T110000Z",
  });

  const parsed = JSON.parse(result!);
  assertEquals(typeof parsed.uid, "string");
  assertEquals(parsed.uid.length > 0, true);
  assertEquals(parsed.etag, "new-etag");
  assertEquals(parsed.summary, "New Event");
  assertEquals(parsed._classification, "PUBLIC");
});

Deno.test("executor: caldav_events_delete returns JSON with deleted flag", async () => {
  const ctx = createMockContext();
  const executor = createCalDavToolExecutor(ctx);
  const result = await executor("caldav_events_delete", {
    event_uid: "uid-to-delete",
    etag: "etag-123",
  });

  const parsed = JSON.parse(result!);
  assertEquals(parsed.uid, "uid-to-delete");
  assertEquals(parsed.deleted, true);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create a mock CalDavToolContext with optional overrides. */
function createMockContext(
  options?: {
    putResponse?: { etag: string; href: string };
    taint?: ClassificationLevel;
  },
): CalDavToolContext {
  return {
    client: {
      propfind: () =>
        Promise.resolve({
          ok: true as const,
          value: { responses: [] },
        }),
      report: () =>
        Promise.resolve({
          ok: true as const,
          value: { resources: [] },
        }),
      put: () =>
        Promise.resolve({
          ok: true as const,
          value: options?.putResponse ?? { etag: "mock-etag", href: "/mock" },
        }),
      deleteResource: () =>
        Promise.resolve({ ok: true as const, value: undefined }),
    },
    calendarHomeUrl: "/calendars/test/",
    sessionTaint: () => options?.taint ?? "PUBLIC",
    sourceSessionId: "test-session" as SessionId,
  };
}
