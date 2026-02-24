/**
 * CalDAV integration — universal calendar access via CalDAV (RFC 4791).
 *
 * Supports iCloud Calendar, Google Calendar, Fastmail, Nextcloud,
 * Radicale, Synology, and most self-hosted CalDAV servers.
 *
 * @module
 */

export type {
  CalDavAuthMethod,
  CalDavBasicCredentials,
  CalDavOAuth2Credentials,
  CalDavCredentials,
  CalDavCalendar,
  CalDavAttendee,
  CalDavRecurrence,
  CalDavEvent,
  CalDavEventInput,
  CalDavFreeBusy,
  CalDavError,
  CalDavConfig,
  CalDavToolContext,
  CalDavClientInterface,
  CalDavClientResult,
  PropfindResponse,
  PropfindResource,
  ReportResponse,
  ReportResource,
  PutResponse,
  DiscoveryResult,
} from "./types.ts";

export { resolveCalDavCredentials, buildAuthHeaders } from "./auth.ts";
export type { ResolveCalDavCredentialsOptions } from "./auth.ts";

export { createCalDavClient } from "./client.ts";
export type { CalDavClientOptions } from "./client.ts";

export { discoverCalDavEndpoint, listCalendars } from "./discovery.ts";
export type { DiscoverEndpointOptions, ListCalendarsOptions } from "./discovery.ts";

export {
  parseVEvent,
  parseVEvents,
  generateVEvent,
  parseFreeBusy,
  expandRecurrence,
  parseRRule,
  unfoldLines,
} from "./ical.ts";

export {
  getCalDavToolDefinitions,
  createCalDavToolExecutor,
  CALDAV_SYSTEM_PROMPT,
} from "./tools.ts";
