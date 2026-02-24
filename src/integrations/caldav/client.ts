/**
 * CalDAV HTTP client — PROPFIND, REPORT, PUT, DELETE.
 *
 * Low-level CalDAV/WebDAV client implementing the XML-based HTTP methods
 * required by RFC 4791. Supports `fetchFn` injection for testability.
 *
 * @module
 */

import type {
  CalDavClientInterface,
  CalDavClientResult,
  CalDavError,
  PropfindResource,
  PropfindResponse,
  PutResponse,
  ReportResource,
  ReportResponse,
} from "./types.ts";
import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("caldav:client");

/** Options for creating a CalDAV client. */
export interface CalDavClientOptions {
  readonly baseUrl: string;
  readonly authHeaders: Readonly<Record<string, string>>;
  readonly fetchFn?: typeof fetch;
}

/**
 * Create a CalDAV HTTP client.
 *
 * All methods return `CalDavClientResult<T>` — never throw.
 */
export function createCalDavClient(
  options: CalDavClientOptions,
): CalDavClientInterface {
  const doFetch = options.fetchFn ?? fetch;
  const baseHeaders: Readonly<Record<string, string>> = {
    ...options.authHeaders,
  };

  return {
    propfind: (url, depth, properties) =>
      executePropfind(doFetch, baseHeaders, resolveUrl(options.baseUrl, url), depth, properties),
    report: (url, body) =>
      executeReport(doFetch, baseHeaders, resolveUrl(options.baseUrl, url), body),
    put: (url, icalData, etag) =>
      executePut(doFetch, baseHeaders, resolveUrl(options.baseUrl, url), icalData, etag),
    deleteResource: (url, etag) =>
      executeDelete(doFetch, baseHeaders, resolveUrl(options.baseUrl, url), etag),
  };
}

/** Resolve a potentially relative URL against the base URL. */
function resolveUrl(baseUrl: string, url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}

// ─── PROPFIND ─────────────────────────────────────────────────────────────────

/** Build the XML body for a PROPFIND request. */
function buildPropfindBody(properties: readonly string[]): string {
  const props = properties.map((p) => {
    if (p.startsWith("c:") || p.startsWith("C:")) {
      return `<c:${p.substring(2)} />`;
    }
    return `<d:${p} />`;
  }).join("\n      ");

  return `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav" xmlns:cs="http://calendarserver.org/ns/" xmlns:ic="http://apple.com/ns/ical/">
  <d:prop>
      ${props}
  </d:prop>
</d:propfind>`;
}

/** Execute a PROPFIND request. */
async function executePropfind(
  doFetch: typeof fetch,
  baseHeaders: Readonly<Record<string, string>>,
  url: string,
  depth: "0" | "1",
  properties: readonly string[],
): Promise<CalDavClientResult<PropfindResponse>> {
  const body = buildPropfindBody(properties);
  log.info("CalDAV PROPFIND request", { operation: "propfind", url, depth });

  try {
    const response = await doFetch(url, {
      method: "PROPFIND",
      headers: {
        ...baseHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        Depth: depth,
      },
      body,
    });

    if (!isMultiStatus(response.status) && !response.ok) {
      return buildErrorResult(response, "PROPFIND");
    }

    const xml = await response.text();
    const resources = parsePropfindXml(xml);
    return { ok: true, value: { responses: resources } };
  } catch (err) {
    log.error("CalDAV PROPFIND failed", { operation: "propfind", url, err });
    return {
      ok: false,
      error: { status: 0, message: `PROPFIND network error: ${errorMessage(err)}` },
    };
  }
}

/** Parse PROPFIND multistatus XML response. */
function parsePropfindXml(xml: string): PropfindResource[] {
  const resources: PropfindResource[] = [];
  const responseRegex = /<(?:d:|D:|DAV:)?response>([\s\S]*?)<\/(?:d:|D:|DAV:)?response>/gi;
  let responseMatch: RegExpExecArray | null;

  while ((responseMatch = responseRegex.exec(xml)) !== null) {
    const responseBlock = responseMatch[1];
    const href = extractTagValue(responseBlock, "href") ?? "";
    const properties: Record<string, string> = {};

    // Extract common properties
    const displayName = extractTagValue(responseBlock, "displayname");
    if (displayName) properties["displayname"] = displayName;

    const calendarColor = extractTagValue(responseBlock, "calendar-color");
    if (calendarColor) properties["calendar-color"] = calendarColor;

    const calendarDescription = extractTagValue(responseBlock, "calendar-description");
    if (calendarDescription) properties["calendar-description"] = calendarDescription;

    const getctag = extractTagValue(responseBlock, "getctag");
    if (getctag) properties["getctag"] = getctag;

    const getetag = extractTagValue(responseBlock, "getetag");
    if (getetag) properties["getetag"] = getetag;

    const currentUserPrincipal = extractHrefFromTag(responseBlock, "current-user-principal");
    if (currentUserPrincipal) properties["current-user-principal"] = currentUserPrincipal;

    const calendarHomeSet = extractHrefFromTag(responseBlock, "calendar-home-set");
    if (calendarHomeSet) properties["calendar-home-set"] = calendarHomeSet;

    const resourcetype = responseBlock.includes("calendar")
      ? (responseBlock.includes("<c:calendar") || responseBlock.includes("<cal:calendar") || responseBlock.match(/<[^>]*calendar[^>]*\/>/i))
        ? "calendar"
        : ""
      : "";
    if (resourcetype) properties["resourcetype"] = resourcetype;

    const status = extractTagValue(responseBlock, "status");

    resources.push({
      href,
      properties,
      ...(status ? { status } : {}),
    });
  }

  return resources;
}

// ─── REPORT ───────────────────────────────────────────────────────────────────

/** Execute a REPORT request. */
async function executeReport(
  doFetch: typeof fetch,
  baseHeaders: Readonly<Record<string, string>>,
  url: string,
  body: string,
): Promise<CalDavClientResult<ReportResponse>> {
  log.info("CalDAV REPORT request", { operation: "report", url });

  try {
    const response = await doFetch(url, {
      method: "REPORT",
      headers: {
        ...baseHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        Depth: "1",
      },
      body,
    });

    if (!isMultiStatus(response.status) && !response.ok) {
      return buildErrorResult(response, "REPORT");
    }

    const xml = await response.text();
    const resources = parseReportXml(xml);
    return { ok: true, value: { resources } };
  } catch (err) {
    log.error("CalDAV REPORT failed", { operation: "report", url, err });
    return {
      ok: false,
      error: { status: 0, message: `REPORT network error: ${errorMessage(err)}` },
    };
  }
}

/** Parse REPORT multistatus XML response. */
function parseReportXml(xml: string): ReportResource[] {
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

// ─── PUT ──────────────────────────────────────────────────────────────────────

/** Execute a PUT request to create or update a calendar resource. */
async function executePut(
  doFetch: typeof fetch,
  baseHeaders: Readonly<Record<string, string>>,
  url: string,
  icalData: string,
  etag?: string,
): Promise<CalDavClientResult<PutResponse>> {
  const headers: Record<string, string> = {
    ...baseHeaders,
    "Content-Type": "text/calendar; charset=utf-8",
  };
  if (etag) {
    headers["If-Match"] = `"${etag.replace(/"/g, "")}"`;
  } else {
    headers["If-None-Match"] = "*";
  }

  log.info("CalDAV PUT request", { operation: "put", url, hasEtag: !!etag });

  try {
    const response = await doFetch(url, {
      method: "PUT",
      headers,
      body: icalData,
    });

    if (!response.ok && response.status !== 201 && response.status !== 204) {
      return buildErrorResult(response, "PUT");
    }

    const newEtag = (response.headers.get("ETag") ?? "").replace(/"/g, "");
    return {
      ok: true,
      value: { etag: newEtag, href: url },
    };
  } catch (err) {
    log.error("CalDAV PUT failed", { operation: "put", url, err });
    return {
      ok: false,
      error: { status: 0, message: `PUT network error: ${errorMessage(err)}` },
    };
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

/** Execute a DELETE request to remove a calendar resource. */
async function executeDelete(
  doFetch: typeof fetch,
  baseHeaders: Readonly<Record<string, string>>,
  url: string,
  etag?: string,
): Promise<CalDavClientResult<void>> {
  const headers: Record<string, string> = { ...baseHeaders };
  if (etag) {
    headers["If-Match"] = `"${etag.replace(/"/g, "")}"`;
  }

  log.info("CalDAV DELETE request", {
    operation: "deleteResource",
    url,
    hasEtag: !!etag,
  });

  try {
    const response = await doFetch(url, {
      method: "DELETE",
      headers,
    });

    if (!response.ok && response.status !== 204) {
      return buildErrorResult(response, "DELETE");
    }

    return { ok: true, value: undefined };
  } catch (err) {
    log.error("CalDAV DELETE failed", { operation: "deleteResource", url, err });
    return {
      ok: false,
      error: { status: 0, message: `DELETE network error: ${errorMessage(err)}` },
    };
  }
}

// ─── XML Helpers ──────────────────────────────────────────────────────────────

/**
 * Extract the text content of an XML tag, ignoring namespace prefixes.
 *
 * Handles `<d:tag>value</d:tag>`, `<D:tag>value</D:tag>`, and `<tag>value</tag>`.
 */
function extractTagValue(xml: string, tagName: string): string | null {
  const regex = new RegExp(
    `<(?:[a-zA-Z][a-zA-Z0-9]*:)?${tagName}[^>]*>([\\s\\S]*?)<\/(?:[a-zA-Z][a-zA-Z0-9]*:)?${tagName}>`,
    "i",
  );
  const match = regex.exec(xml);
  return match ? match[1].trim() : null;
}

/** Extract an href from within a nested tag (e.g., `<d:current-user-principal><d:href>...</d:href></d:current-user-principal>`). */
function extractHrefFromTag(xml: string, tagName: string): string | null {
  const outerRegex = new RegExp(
    `<(?:[a-zA-Z][a-zA-Z0-9]*:)?${tagName}[^>]*>([\\s\\S]*?)<\/(?:[a-zA-Z][a-zA-Z0-9]*:)?${tagName}>`,
    "i",
  );
  const outerMatch = outerRegex.exec(xml);
  if (!outerMatch) return null;
  return extractTagValue(outerMatch[1], "href");
}

// ─── Shared Utilities ─────────────────────────────────────────────────────────

/** Check if an HTTP status is 207 Multi-Status. */
function isMultiStatus(status: number): boolean {
  return status === 207;
}

/** Build an error result from an HTTP response. */
async function buildErrorResult<T>(
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
function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
