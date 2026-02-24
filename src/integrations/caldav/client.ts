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
  PropfindResponse,
  PutResponse,
  ReportResponse,
} from "./types.ts";
import {
  parsePropfindXml,
  parseReportXml,
  isMultiStatus,
  buildErrorResult,
  errorMessage,
} from "./client_xml.ts";
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
