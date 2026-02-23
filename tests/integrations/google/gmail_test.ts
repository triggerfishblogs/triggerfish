/**
 * Gmail service unit tests.
 *
 * Tests URL construction, response parsing, and error handling
 * using a mock GoogleApiClient.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createGmailService } from "../../../src/integrations/google/gmail/gmail.ts";
import type { GoogleApiClient, GoogleApiResult } from "../../../src/integrations/google/types.ts";

// ─── Mock Client ────────────────────────────────────────────────────────────

function createMockClient(
  responses: Record<string, GoogleApiResult<unknown>>,
): GoogleApiClient {
  function findResponse(url: string): GoogleApiResult<unknown> {
    for (const [key, value] of Object.entries(responses)) {
      if (url.includes(key)) return value;
    }
    return { ok: false, error: { code: "NOT_FOUND", message: `No mock for: ${url}` } };
  }

  return {
    get<T>(url: string, _params?: Record<string, string>): Promise<GoogleApiResult<T>> {
      return Promise.resolve(findResponse(url) as GoogleApiResult<T>);
    },
    post<T>(url: string, _body: unknown): Promise<GoogleApiResult<T>> {
      return Promise.resolve(findResponse(url) as GoogleApiResult<T>);
    },
    patch<T>(url: string, _body: unknown): Promise<GoogleApiResult<T>> {
      return Promise.resolve(findResponse(url) as GoogleApiResult<T>);
    },
    put<T>(url: string, _body: unknown): Promise<GoogleApiResult<T>> {
      return Promise.resolve(findResponse(url) as GoogleApiResult<T>);
    },
  };
}

// ─── search ─────────────────────────────────────────────────────────────────

Deno.test("GmailService.search: returns empty array when no messages", async () => {
  const client = createMockClient({
    "/messages": { ok: true, value: { messages: [] } },
  });
  const gmail = createGmailService(client);

  const result = await gmail.search({ query: "test" });
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 0);
  }
});

Deno.test("GmailService.search: returns empty when messages field is missing", async () => {
  const client = createMockClient({
    "/messages": { ok: true, value: {} },
  });
  const gmail = createGmailService(client);

  const result = await gmail.search({ query: "test" });
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.length, 0);
  }
});

Deno.test("GmailService.search: propagates API errors", async () => {
  const client = createMockClient({
    "/messages": {
      ok: false,
      error: { code: "HTTP_403", message: "Forbidden", status: 403 },
    },
  });
  const gmail = createGmailService(client);

  const result = await gmail.search({ query: "test" });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.code, "HTTP_403");
  }
});

// ─── read ───────────────────────────────────────────────────────────────────

Deno.test("GmailService.read: parses message with headers", async () => {
  const client = createMockClient({
    "/messages/msg1": {
      ok: true,
      value: {
        id: "msg1",
        threadId: "t1",
        snippet: "Hello there",
        labelIds: ["INBOX"],
        payload: {
          headers: [
            { name: "From", value: "alice@example.com" },
            { name: "To", value: "bob@example.com" },
            { name: "Subject", value: "Test Email" },
            { name: "Date", value: "Mon, 15 Jan 2025 10:00:00 +0000" },
          ],
          body: { data: btoa("Hello World").replace(/\+/g, "-").replace(/\//g, "_") },
        },
      },
    },
  });
  const gmail = createGmailService(client);

  const result = await gmail.read("msg1");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.id, "msg1");
    assertEquals(result.value.from, "alice@example.com");
    assertEquals(result.value.subject, "Test Email");
  }
});

// ─── send ───────────────────────────────────────────────────────────────────

Deno.test("GmailService.send: returns sent message ID", async () => {
  const client = createMockClient({
    "/messages/send": { ok: true, value: { id: "sent_123" } },
  });
  const gmail = createGmailService(client);

  const result = await gmail.send({
    to: "bob@example.com",
    subject: "Hello",
    body: "Hi Bob!",
  });
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.id, "sent_123");
  }
});

// ─── label ──────────────────────────────────────────────────────────────────

Deno.test("GmailService.label: returns success", async () => {
  const client = createMockClient({
    "/messages/msg1/modify": { ok: true, value: { id: "msg1" } },
  });
  const gmail = createGmailService(client);

  const result = await gmail.label({
    messageId: "msg1",
    addLabelIds: ["STARRED"],
    removeLabelIds: ["UNREAD"],
  });
  assertEquals(result.ok, true);
});
