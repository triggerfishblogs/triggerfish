/**
 * @module
 *
 * CalDAV security boundary tests.
 *
 * Tests classification gating, taint tracking, and lineage origin
 * for calendar data flowing through the CalDAV integration.
 */
import { assertEquals } from "@std/assert";
import {
  createCalDavToolExecutor,
} from "../../../src/integrations/caldav/tools.ts";
import type { CalDavToolContext } from "../../../src/integrations/caldav/types.ts";
import type { SessionId } from "../../../src/core/types/session.ts";
import type { ClassificationLevel } from "../../../src/core/types/classification.ts";

// ─── Classification on Responses ──────────────────────────────────────────────

Deno.test("classification: calendar data classified at session taint level", async () => {
  const ctx = createMockContextWithTaint("INTERNAL");
  const executor = createCalDavToolExecutor(ctx);

  const result = await executor("caldav_events_create", {
    summary: "Meeting",
    start: "20250315T100000Z",
    end: "20250315T110000Z",
  });

  const parsed = JSON.parse(result!);
  assertEquals(parsed._classification, "INTERNAL");
});

Deno.test("classification: PUBLIC taint returns PUBLIC classification", async () => {
  const ctx = createMockContextWithTaint("PUBLIC");
  const executor = createCalDavToolExecutor(ctx);

  const result = await executor("caldav_events_create", {
    summary: "Public Event",
    start: "20250315T100000Z",
    end: "20250315T110000Z",
  });

  const parsed = JSON.parse(result!);
  assertEquals(parsed._classification, "PUBLIC");
});

Deno.test("classification: CONFIDENTIAL taint returns CONFIDENTIAL classification", async () => {
  const ctx = createMockContextWithTaint("CONFIDENTIAL");
  const executor = createCalDavToolExecutor(ctx);

  const result = await executor("caldav_events_create", {
    summary: "Confidential Meeting",
    start: "20250315T100000Z",
    end: "20250315T110000Z",
  });

  const parsed = JSON.parse(result!);
  assertEquals(parsed._classification, "CONFIDENTIAL");
});

Deno.test("classification: RESTRICTED taint returns RESTRICTED classification", async () => {
  const ctx = createMockContextWithTaint("RESTRICTED");
  const executor = createCalDavToolExecutor(ctx);

  const result = await executor("caldav_events_create", {
    summary: "Board Meeting",
    start: "20250315T100000Z",
    end: "20250315T110000Z",
  });

  const parsed = JSON.parse(result!);
  assertEquals(parsed._classification, "RESTRICTED");
});

// ─── Lineage Origin ──────────────────────────────────────────────────────────

Deno.test("lineage: events carry caldav:event:{uid} origin", async () => {
  const ctx = createMockContextWithTaint("PUBLIC");
  const executor = createCalDavToolExecutor(ctx);

  const result = await executor("caldav_events_create", {
    summary: "Tracked Event",
    start: "20250315T100000Z",
    end: "20250315T110000Z",
  });

  const parsed = JSON.parse(result!);
  assertEquals(parsed._origin.startsWith("caldav:event:"), true);
  assertEquals(parsed._origin.includes(parsed.uid), true);
});

Deno.test("lineage: delete responses carry caldav:event:{uid} origin", async () => {
  const ctx = createMockContextWithTaint("PUBLIC");
  const executor = createCalDavToolExecutor(ctx);

  const result = await executor("caldav_events_delete", {
    event_uid: "delete-uid-123",
    etag: "etag-1",
  });

  const parsed = JSON.parse(result!);
  assertEquals(parsed._origin, "caldav:event:delete-uid-123");
});

Deno.test("lineage: calendar list carries caldav:calendars origin", async () => {
  const ctx = createMockContextWithTaint("INTERNAL");

  // Override client to return calendars
  ctx.client.propfind = () =>
    Promise.resolve({
      ok: true as const,
      value: {
        responses: [
          {
            href: "/calendars/user/",
            properties: {},
          },
          {
            href: "/calendars/user/personal/",
            properties: {
              displayname: "Personal",
              resourcetype: "calendar",
              getctag: "ctag-1",
            },
          },
        ],
      },
    });

  const executor = createCalDavToolExecutor(ctx);
  const result = await executor("caldav_calendars_list", {});

  const parsed = JSON.parse(result!);
  assertEquals(parsed._origin, "caldav:calendars");
});

Deno.test("lineage: freebusy carries caldav:freebusy origin", async () => {
  const ctx = createMockContextWithTaint("INTERNAL");
  const executor = createCalDavToolExecutor(ctx);

  const result = await executor("caldav_freebusy", {
    time_min: "20250315T000000Z",
    time_max: "20250316T000000Z",
  });

  const parsed = JSON.parse(result!);
  assertEquals(parsed._origin, "caldav:freebusy");
});

// ─── Taint Escalation Tracking ────────────────────────────────────────────────

Deno.test("classification: taint getter called on each tool response", async () => {
  let taintCallCount = 0;
  const ctx: CalDavToolContext = {
    client: createMockClient(),
    calendarHomeUrl: "/calendars/test/",
    sessionTaint: () => {
      taintCallCount++;
      return "INTERNAL";
    },
    sourceSessionId: "test-session" as SessionId,
  };

  const executor = createCalDavToolExecutor(ctx);

  await executor("caldav_events_create", {
    summary: "Test",
    start: "20250315T100000Z",
    end: "20250315T110000Z",
  });

  assertEquals(taintCallCount > 0, true, "Session taint getter should be called");
});

Deno.test("classification: dynamic taint reflected in output", async () => {
  let currentTaint: ClassificationLevel = "PUBLIC";
  const ctx: CalDavToolContext = {
    client: createMockClient(),
    calendarHomeUrl: "/calendars/test/",
    sessionTaint: () => currentTaint,
    sourceSessionId: "test-session" as SessionId,
  };

  const executor = createCalDavToolExecutor(ctx);

  // First call: PUBLIC
  const result1 = await executor("caldav_events_create", {
    summary: "First",
    start: "20250315T100000Z",
    end: "20250315T110000Z",
  });
  assertEquals(JSON.parse(result1!)._classification, "PUBLIC");

  // Simulate taint escalation
  currentTaint = "CONFIDENTIAL";

  // Second call: CONFIDENTIAL
  const result2 = await executor("caldav_events_create", {
    summary: "Second",
    start: "20250316T100000Z",
    end: "20250316T110000Z",
  });
  assertEquals(JSON.parse(result2!)._classification, "CONFIDENTIAL");
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createMockClient() {
  return {
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
        value: { etag: "mock-etag", href: "/mock" },
      }),
    deleteResource: () =>
      Promise.resolve({ ok: true as const, value: undefined }),
  };
}

function createMockContextWithTaint(
  taint: ClassificationLevel,
): CalDavToolContext & { client: ReturnType<typeof createMockClient> } {
  return {
    client: createMockClient(),
    calendarHomeUrl: "/calendars/test/",
    sessionTaint: () => taint,
    sourceSessionId: "test-session" as SessionId,
  };
}
