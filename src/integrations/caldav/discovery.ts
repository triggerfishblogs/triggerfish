/**
 * CalDAV server discovery per RFC 6764.
 *
 * Discovers the CalDAV endpoint via `.well-known/caldav` and PROPFIND-based
 * principal / calendar-home discovery. Handles provider-specific URL patterns
 * for iCloud, Google, Fastmail, and Nextcloud.
 *
 * @module
 */

import type { CalDavClientInterface, CalDavCalendar, DiscoveryResult } from "./types.ts";
import type { Result } from "../../core/types/classification.ts";
import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("caldav:discovery");

/** Options for CalDAV endpoint discovery. */
export interface DiscoverEndpointOptions {
  readonly serverUrl: string;
  readonly client: CalDavClientInterface;
}

/**
 * Discover the CalDAV endpoint for a server.
 *
 * Discovery flow:
 * 1. PROPFIND on server URL for `current-user-principal`
 * 2. PROPFIND on principal URL for `calendar-home-set`
 */
export async function discoverCalDavEndpoint(
  options: DiscoverEndpointOptions,
): Promise<Result<DiscoveryResult, string>> {
  const { serverUrl, client } = options;

  log.info("CalDAV endpoint discovery started", {
    operation: "discoverCalDavEndpoint",
    serverUrl,
  });

  // Step 1: Find the current user principal
  const principalResult = await client.propfind(serverUrl, "0", [
    "current-user-principal",
  ]);

  if (!principalResult.ok) {
    log.error("CalDAV principal discovery failed", {
      operation: "discoverCalDavEndpoint",
      err: principalResult.error,
    });
    return {
      ok: false,
      error: `CalDAV discovery failed: ${principalResult.error.message}`,
    };
  }

  const principalUrl = extractPrincipalUrl(principalResult.value.responses);
  if (!principalUrl) {
    return {
      ok: false,
      error:
        "CalDAV server did not return current-user-principal. " +
        "Verify the server URL and credentials.",
    };
  }

  log.info("CalDAV principal URL discovered", {
    operation: "discoverCalDavEndpoint",
    principalUrl,
  });

  // Step 2: Find the calendar home set
  const homeResult = await client.propfind(principalUrl, "0", [
    "c:calendar-home-set",
  ]);

  if (!homeResult.ok) {
    log.error("CalDAV calendar-home-set discovery failed", {
      operation: "discoverCalDavEndpoint",
      err: homeResult.error,
    });
    return {
      ok: false,
      error: `CalDAV home set discovery failed: ${homeResult.error.message}`,
    };
  }

  const calendarHomeUrl = extractCalendarHomeUrl(homeResult.value.responses);
  if (!calendarHomeUrl) {
    return {
      ok: false,
      error:
        "CalDAV server did not return calendar-home-set for principal.",
    };
  }

  log.info("CalDAV calendar home discovered", {
    operation: "discoverCalDavEndpoint",
    calendarHomeUrl,
  });

  return {
    ok: true,
    value: {
      principalUrl,
      calendarHomeUrl,
      serverType: detectServerType(serverUrl),
    },
  };
}

/** Options for listing calendars. */
export interface ListCalendarsOptions {
  readonly calendarHomeUrl: string;
  readonly client: CalDavClientInterface;
}

/**
 * List all calendars from a calendar home URL.
 *
 * Performs a depth-1 PROPFIND on the calendar home to enumerate
 * available calendars with their display names, colors, and ctags.
 */
export async function listCalendars(
  options: ListCalendarsOptions,
): Promise<Result<readonly CalDavCalendar[], string>> {
  const { calendarHomeUrl, client } = options;

  log.info("CalDAV listing calendars", {
    operation: "listCalendars",
    calendarHomeUrl,
  });

  const result = await client.propfind(calendarHomeUrl, "1", [
    "displayname",
    "resourcetype",
    "cs:getctag",
    "ic:calendar-color",
    "c:calendar-description",
  ]);

  if (!result.ok) {
    log.error("CalDAV calendar listing failed", {
      operation: "listCalendars",
      err: result.error,
    });
    return {
      ok: false,
      error: `Calendar listing failed: ${result.error.message}`,
    };
  }

  const calendars: CalDavCalendar[] = [];
  for (const resource of result.value.responses) {
    // Skip the collection itself (same URL as query)
    if (resource.href === calendarHomeUrl) continue;

    // Only include actual calendar resources
    if (resource.properties["resourcetype"] !== "calendar") continue;

    calendars.push({
      url: resource.href,
      displayName: resource.properties["displayname"] ?? extractCalendarName(resource.href),
      ctag: resource.properties["getctag"] ?? "",
      ...(resource.properties["calendar-color"]
        ? { color: resource.properties["calendar-color"] }
        : {}),
      ...(resource.properties["calendar-description"]
        ? { description: resource.properties["calendar-description"] }
        : {}),
    });
  }

  log.info("CalDAV calendars discovered", {
    operation: "listCalendars",
    count: calendars.length,
  });

  return { ok: true, value: calendars };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Extract principal URL from PROPFIND responses. */
function extractPrincipalUrl(
  responses: readonly { readonly href: string; readonly properties: Readonly<Record<string, string>> }[],
): string | null {
  for (const r of responses) {
    const principal = r.properties["current-user-principal"];
    if (principal) return principal;
  }
  return null;
}

/** Extract calendar home URL from PROPFIND responses. */
function extractCalendarHomeUrl(
  responses: readonly { readonly href: string; readonly properties: Readonly<Record<string, string>> }[],
): string | null {
  for (const r of responses) {
    const homeSet = r.properties["calendar-home-set"];
    if (homeSet) return homeSet;
  }
  return null;
}

/** Extract a calendar name from its URL path. */
function extractCalendarName(url: string): string {
  const parts = url.replace(/\/$/, "").split("/");
  return decodeURIComponent(parts[parts.length - 1] || "Calendar");
}

/** Detect the CalDAV server type from URL patterns. */
function detectServerType(serverUrl: string): string | undefined {
  const lower = serverUrl.toLowerCase();
  if (lower.includes("icloud.com")) return "iCloud";
  if (lower.includes("google") || lower.includes("googleapis")) return "Google";
  if (lower.includes("fastmail.com")) return "Fastmail";
  if (lower.includes("nextcloud") || lower.includes("remote.php/dav")) {
    return "Nextcloud";
  }
  if (lower.includes("radicale")) return "Radicale";
  return undefined;
}
