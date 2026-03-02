/**
 * @module
 *
 * CalDAV endpoint discovery tests.
 *
 * Tests principal URL extraction, calendar-home-set discovery,
 * error handling, and provider detection (iCloud, Fastmail, Nextcloud).
 */
import { assertEquals } from "@std/assert";
import { discoverCalDavEndpoint } from "../../../src/integrations/caldav/discovery.ts";
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
      value: {
        responses: [{ href: "/principals/users/test/", properties: {} }],
      },
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
