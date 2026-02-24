/**
 * CalDAV XML response parsing helpers.
 *
 * Extracts values from WebDAV/CalDAV multistatus XML responses
 * using regex-based parsing. Handles namespace prefixes (d:, D:, DAV:).
 *
 * @module
 */

import type { PropfindResource, ReportResource, CalDavClientResult } from "./types.ts";
import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("caldav:client");

// ─── PROPFIND XML ─────────────────────────────────────────────────────────────

/** Parse PROPFIND multistatus XML response. */
export function parsePropfindXml(xml: string): PropfindResource[] {
  const resources: PropfindResource[] = [];
  const responseRegex = /<(?:d:|D:|DAV:)?response>([\s\S]*?)<\/(?:d:|D:|DAV:)?response>/gi;
  let responseMatch: RegExpExecArray | null;

  while ((responseMatch = responseRegex.exec(xml)) !== null) {
    resources.push(parsePropfindResponseBlock(responseMatch[1]));
  }

  return resources;
}

/** Parse a single response block from PROPFIND XML. */
function parsePropfindResponseBlock(responseBlock: string): PropfindResource {
  const href = extractTagValue(responseBlock, "href") ?? "";
  const properties: Record<string, string> = {};

  extractStandardProperties(responseBlock, properties);
  extractCalendarProperties(responseBlock, properties);

  const status = extractTagValue(responseBlock, "status");

  return {
    href,
    properties,
    ...(status ? { status } : {}),
  };
}

/** Extract standard WebDAV properties. */
function extractStandardProperties(
  block: string,
  properties: Record<string, string>,
): void {
  const displayName = extractTagValue(block, "displayname");
  if (displayName) properties["displayname"] = displayName;

  const getetag = extractTagValue(block, "getetag");
  if (getetag) properties["getetag"] = getetag;

  const currentUserPrincipal = extractHrefFromTag(block, "current-user-principal");
  if (currentUserPrincipal) properties["current-user-principal"] = currentUserPrincipal;
}

/** Extract CalDAV-specific properties. */
function extractCalendarProperties(
  block: string,
  properties: Record<string, string>,
): void {
  const calendarColor = extractTagValue(block, "calendar-color");
  if (calendarColor) properties["calendar-color"] = calendarColor;

  const calendarDescription = extractTagValue(block, "calendar-description");
  if (calendarDescription) properties["calendar-description"] = calendarDescription;

  const getctag = extractTagValue(block, "getctag");
  if (getctag) properties["getctag"] = getctag;

  const calendarHomeSet = extractHrefFromTag(block, "calendar-home-set");
  if (calendarHomeSet) properties["calendar-home-set"] = calendarHomeSet;

  const resourcetype = block.includes("calendar")
    ? (block.includes("<c:calendar") || block.includes("<cal:calendar") || block.match(/<[^>]*calendar[^>]*\/>/i))
      ? "calendar"
      : ""
    : "";
  if (resourcetype) properties["resourcetype"] = resourcetype;
}

// ─── REPORT XML ───────────────────────────────────────────────────────────────

/** Parse REPORT multistatus XML response. */
export function parseReportXml(xml: string): ReportResource[] {
  const resources: ReportResource[] = [];
  const responseRegex = /<(?:d:|D:|DAV:)?response>([\s\S]*?)<\/(?:d:|D:|DAV:)?response>/gi;
  let responseMatch: RegExpExecArray | null;

  while ((responseMatch = responseRegex.exec(xml)) !== null) {
    const block = responseMatch[1];
    const href = extractTagValue(block, "href") ?? "";
    const etag = (extractTagValue(block, "getetag") ?? "").replace(/"/g, "");
    const calendarData = extractTagValue(block, "calendar-data") ?? "";

    if (calendarData) {
      resources.push({ href, etag, calendarData });
    }
  }

  return resources;
}

// ─── Tag Extraction ──────────────────────────────────────────────────────────

/**
 * Extract the text content of an XML tag, ignoring namespace prefixes.
 *
 * Handles `<d:tag>value</d:tag>`, `<D:tag>value</D:tag>`, and `<tag>value</tag>`.
 */
export function extractTagValue(xml: string, tagName: string): string | null {
  const regex = new RegExp(
    `<(?:[a-zA-Z][a-zA-Z0-9]*:)?${tagName}[^>]*>([\\s\\S]*?)<\/(?:[a-zA-Z][a-zA-Z0-9]*:)?${tagName}>`,
    "i",
  );
  const match = regex.exec(xml);
  return match ? match[1].trim() : null;
}

/** Extract an href from within a nested tag. */
function extractHrefFromTag(xml: string, tagName: string): string | null {
  const outerRegex = new RegExp(
    `<(?:[a-zA-Z][a-zA-Z0-9]*:)?${tagName}[^>]*>([\\s\\S]*?)<\/(?:[a-zA-Z][a-zA-Z0-9]*:)?${tagName}>`,
    "i",
  );
  const outerMatch = outerRegex.exec(xml);
  if (!outerMatch) return null;
  return extractTagValue(outerMatch[1], "href");
}

// ─── Error Helpers ──────────────────────────────────────────────────────────

/** Check if an HTTP status is 207 Multi-Status. */
export function isMultiStatus(status: number): boolean {
  return status === 207;
}

/** Build an error result from an HTTP response. */
export async function buildErrorResult<T>(
  response: Response,
  method: string,
): Promise<CalDavClientResult<T>> {
  const text = await response.text().catch(() => "");
  const message = `${method} failed with status ${response.status}: ${text.substring(0, 200)}`;
  log.warn(`CalDAV ${method} error`, {
    operation: method.toLowerCase(),
    status: response.status,
    err: { message },
  });
  return {
    ok: false,
    error: { status: response.status, message },
  };
}

/** Extract error message from unknown error. */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
