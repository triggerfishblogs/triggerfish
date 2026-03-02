/**
 * @module
 *
 * CalDAV calendar listing tests.
 *
 * Tests calendar enumeration from PROPFIND responses,
 * non-calendar resource filtering, and error handling.
 */
import { assertEquals } from "@std/assert";
import { listCalendars } from "../../../src/integrations/caldav/discovery.ts";
import type {
  CalDavClientInterface,
  CalDavClientResult,
  PropfindResponse,
  PutResponse,
  ReportResponse,
} from "../../../src/integrations/caldav/types.ts";

/** Create a mock CalDAV client from a PROPFIND handler. */
function createMockClient(
  propfindHandler: (url: string) => CalDavClientResult<PropfindResponse>,
): CalDavClientInterface {
  return {
    propfind: (url: string) => Promise.resolve(propfindHandler(url)),
    report: () =>
      Promise.resolve({
        ok: true as const,
        value: { resources: [] } as ReportResponse,
      }),
    put: () =>
      Promise.resolve({
        ok: true as const,
        value: { etag: "", href: "" } as PutResponse,
      }),
    deleteResource: () =>
      Promise.resolve({ ok: true as const, value: undefined }),
  };
}

// ─── Calendar Listing ─────────────────────────────────────────────────────────

Deno.test("listCalendars: lists calendars from PROPFIND response", async () => {
  const client = createMockClient((url: string) => {
    if (url === "/calendars/user/") {
      return {
        ok: true,
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
                getctag: "ctag-123",
                "calendar-color": "#FF0000",
              },
            },
            {
              href: "/calendars/user/work/",
              properties: {
                displayname: "Work",
                resourcetype: "calendar",
                getctag: "ctag-456",
                "calendar-description": "Work calendar",
              },
            },
          ],
        },
      };
    }
    return { ok: true, value: { responses: [] } };
  });

  const result = await listCalendars({
    calendarHomeUrl: "/calendars/user/",
    client,
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 2);
    assertEquals(result.value[0].displayName, "Personal");
    assertEquals(result.value[0].url, "/calendars/user/personal/");
    assertEquals(result.value[0].ctag, "ctag-123");
    assertEquals(result.value[0].color, "#FF0000");
    assertEquals(result.value[1].displayName, "Work");
    assertEquals(result.value[1].description, "Work calendar");
  }
});

Deno.test("listCalendars: skips non-calendar resources", async () => {
  const client = createMockClient(() => ({
    ok: true,
    value: {
      responses: [
        {
          href: "/calendars/user/",
          properties: {},
        },
        {
          href: "/calendars/user/contacts/",
          properties: {
            displayname: "Contacts",
            // No resourcetype: "calendar"
          },
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
  }));

  const result = await listCalendars({
    calendarHomeUrl: "/calendars/user/",
    client,
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 1);
    assertEquals(result.value[0].displayName, "Personal");
  }
});

Deno.test("listCalendars: handles PROPFIND error", async () => {
  const client = createMockClient(() => ({
    ok: false,
    error: { status: 403, message: "Forbidden" },
  }));

  const result = await listCalendars({
    calendarHomeUrl: "/calendars/user/",
    client,
  });

  assertEquals(result.ok, false);
});
