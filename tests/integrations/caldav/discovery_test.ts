/**
 * CalDAV server discovery tests.
 *
 * Tests principal URL extraction, calendar-home-set discovery,
 * calendar enumeration, and provider detection.
 */
import { assertEquals } from "@std/assert";
import { discoverCalDavEndpoint, listCalendars } from "../../../src/integrations/caldav/discovery.ts";
import type {
  CalDavClientInterface,
  CalDavClientResult,
  PropfindResponse,
  ReportResponse,
  PutResponse,
} from "../../../src/integrations/caldav/types.ts";

// ─── Mock Client ──────────────────────────────────────────────────────────────

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

// ─── Endpoint Discovery ───────────────────────────────────────────────────────

Deno.test("discoverCalDavEndpoint: discovers principal and calendar home", async () => {
  const client = createMockClient((url: string) => {
    if (url === "https://caldav.example.com") {
      return {
        ok: true,
        value: {
          responses: [{
            href: "/",
            properties: {
              "current-user-principal": "/principals/users/testuser/",
            },
          }],
        },
      };
    }
    if (url === "/principals/users/testuser/") {
      return {
        ok: true,
        value: {
          responses: [{
            href: "/principals/users/testuser/",
            properties: {
              "calendar-home-set": "/calendars/testuser/",
            },
          }],
        },
      };
    }
    return {
      ok: true,
      value: { responses: [] },
    };
  });

  const result = await discoverCalDavEndpoint({
    serverUrl: "https://caldav.example.com",
    client,
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.principalUrl, "/principals/users/testuser/");
    assertEquals(result.value.calendarHomeUrl, "/calendars/testuser/");
  }
});

Deno.test("discoverCalDavEndpoint: returns error when principal not found", async () => {
  const client = createMockClient(() => ({
    ok: true,
    value: { responses: [{ href: "/", properties: {} }] },
  }));

  const result = await discoverCalDavEndpoint({
    serverUrl: "https://caldav.example.com",
    client,
  });

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("current-user-principal"), true);
  }
});

Deno.test("discoverCalDavEndpoint: returns error when calendar home not found", async () => {
  const client = createMockClient((url: string) => {
    if (url === "https://caldav.example.com") {
      return {
        ok: true,
        value: {
          responses: [{
            href: "/",
            properties: {
              "current-user-principal": "/principals/users/test/",
            },
          }],
        },
      };
    }
    return {
      ok: true,
      value: { responses: [{ href: "/principals/users/test/", properties: {} }] },
    };
  });

  const result = await discoverCalDavEndpoint({
    serverUrl: "https://caldav.example.com",
    client,
  });

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("calendar-home-set"), true);
  }
});

Deno.test("discoverCalDavEndpoint: handles PROPFIND failure", async () => {
  const client = createMockClient(() => ({
    ok: false,
    error: { status: 401, message: "Unauthorized" },
  }));

  const result = await discoverCalDavEndpoint({
    serverUrl: "https://caldav.example.com",
    client,
  });

  assertEquals(result.ok, false);
});

// ─── Provider Detection ───────────────────────────────────────────────────────

Deno.test("discoverCalDavEndpoint: detects iCloud server type", async () => {
  const client = createMockClient((url: string) => {
    if (url === "https://caldav.icloud.com") {
      return {
        ok: true,
        value: {
          responses: [{
            href: "/",
            properties: { "current-user-principal": "/p/" },
          }],
        },
      };
    }
    return {
      ok: true,
      value: {
        responses: [{
          href: "/p/",
          properties: { "calendar-home-set": "/calendars/" },
        }],
      },
    };
  });

  const result = await discoverCalDavEndpoint({
    serverUrl: "https://caldav.icloud.com",
    client,
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.serverType, "iCloud");
  }
});

Deno.test("discoverCalDavEndpoint: detects Fastmail server type", async () => {
  const client = createMockClient((url: string) => {
    if (url === "https://caldav.fastmail.com/dav/") {
      return {
        ok: true,
        value: {
          responses: [{
            href: "/",
            properties: { "current-user-principal": "/p/" },
          }],
        },
      };
    }
    return {
      ok: true,
      value: {
        responses: [{
          href: "/p/",
          properties: { "calendar-home-set": "/calendars/" },
        }],
      },
    };
  });

  const result = await discoverCalDavEndpoint({
    serverUrl: "https://caldav.fastmail.com/dav/",
    client,
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.serverType, "Fastmail");
  }
});

Deno.test("discoverCalDavEndpoint: detects Nextcloud server type", async () => {
  const client = createMockClient((url: string) => {
    if (url === "https://cloud.example.com/remote.php/dav/") {
      return {
        ok: true,
        value: {
          responses: [{
            href: "/",
            properties: { "current-user-principal": "/p/" },
          }],
        },
      };
    }
    return {
      ok: true,
      value: {
        responses: [{
          href: "/p/",
          properties: { "calendar-home-set": "/calendars/" },
        }],
      },
    };
  });

  const result = await discoverCalDavEndpoint({
    serverUrl: "https://cloud.example.com/remote.php/dav/",
    client,
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.serverType, "Nextcloud");
  }
});

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
