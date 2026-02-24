/**
 * CalDAV XML report builders and event response formatters.
 *
 * Builds REPORT request bodies (calendar-query, multiget, free-busy-query)
 * and formats CalDavEvent objects for list vs. detail views.
 *
 * @module
 */

import type { CalDavEvent, CalDavToolContext } from "./types.ts";

// ─── Report Builders ──────────────────────────────────────────────────────────

/** Build a calendar-query REPORT body for a time range. */
export function buildCalendarQueryReport(timeMin: string, timeMax: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag />
    <c:calendar-data />
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:time-range start="${timeMin}" end="${timeMax}" />
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;
}

/** Build a calendar-query REPORT body to fetch a specific event by UID. */
export function buildMultigetReport(eventUid: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<c:calendar-query xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:prop>
    <d:getetag />
    <c:calendar-data />
  </d:prop>
  <c:filter>
    <c:comp-filter name="VCALENDAR">
      <c:comp-filter name="VEVENT">
        <c:prop-filter name="UID">
          <c:text-match collation="i;octet">${eventUid}</c:text-match>
        </c:prop-filter>
      </c:comp-filter>
    </c:comp-filter>
  </c:filter>
</c:calendar-query>`;
}

/** Build a free-busy-query REPORT body. */
export function buildFreeBusyReport(timeMin: string, timeMax: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<c:free-busy-query xmlns:c="urn:ietf:params:xml:ns:caldav">
  <c:time-range start="${timeMin}" end="${timeMax}" />
</c:free-busy-query>`;
}

// ─── Response Formatters ──────────────────────────────────────────────────────

/** Format an event for list view (summary). */
export function formatEventSummary(
  event: CalDavEvent,
  ctx: CalDavToolContext,
): Record<string, unknown> {
  return {
    uid: event.uid,
    summary: event.summary,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    etag: event.etag,
    ...(event.location ? { location: event.location } : {}),
    ...(event.recurrence ? { recurring: true } : {}),
    _classification: ctx.sessionTaint(),
  };
}

/** Format an event for detail view (full). */
export function formatEventDetail(
  event: CalDavEvent,
  ctx: CalDavToolContext,
): Record<string, unknown> {
  return {
    uid: event.uid,
    summary: event.summary,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    etag: event.etag,
    url: event.url,
    ...(event.location ? { location: event.location } : {}),
    ...(event.description ? { description: event.description } : {}),
    ...(event.organizer ? { organizer: event.organizer } : {}),
    ...(event.status ? { status: event.status } : {}),
    ...(event.attendees.length > 0 ? { attendees: event.attendees } : {}),
    ...(event.recurrence ? { recurrence: event.recurrence } : {}),
    ...(event.created ? { created: event.created } : {}),
    ...(event.lastModified ? { lastModified: event.lastModified } : {}),
    _classification: ctx.sessionTaint(),
  };
}
