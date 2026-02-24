/**
 * Google Chat client function tests.
 *
 * Tests PubSub pull/acknowledge, Chat API send, and message parsing
 * using injectable fetch functions.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import {
  createPubSubAcknowledger,
  createPubSubPuller,
  parseGoogleChatEventData,
  sendGoogleChatMessage,
} from "../../../src/channels/googlechat/client.ts";
import type { GoogleChatConfig, GoogleChatEvent } from "../../../src/channels/googlechat/types.ts";

// ─── Test helpers ───────────────────────────────────────────────────────────

/** Build a mock fetch that returns a canned response body. */
function createMockFetchWithResponse(
  responseBody: unknown,
  status = 200,
): { fetchFn: typeof fetch; calls: Array<{ url: string; init: RequestInit }> } {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchFn = (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    calls.push({ url, init: init ?? {} });
    return Promise.resolve(
      new Response(JSON.stringify(responseBody), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };
  return { fetchFn: fetchFn as typeof fetch, calls };
}

/** Build a mock fetch that returns a text error response. */
function createErrorFetch(
  status: number,
  errorText: string,
): typeof fetch {
  return (
    _input: string | URL | Request,
    _init?: RequestInit,
  ): Promise<Response> => {
    return Promise.resolve(
      new Response(errorText, { status }),
    );
  };
}

function createTestConfig(
  overrides: Partial<GoogleChatConfig> = {},
): GoogleChatConfig {
  return {
    accessToken: "test-access-token",
    pubsubSubscription: "projects/test-proj/subscriptions/test-sub",
    ...overrides,
  };
}

// ─── PubSub pull tests ──────────────────────────────────────────────────────

Deno.test("pubsub puller: sends correct request format", async () => {
  const { fetchFn, calls } = createMockFetchWithResponse({
    receivedMessages: [],
  });
  const config = createTestConfig({ _fetchFn: fetchFn });
  const pull = createPubSubPuller(config);

  await pull("projects/test-proj/subscriptions/test-sub", 10);

  assertEquals(calls.length, 1);
  assertEquals(
    calls[0].url,
    "https://pubsub.googleapis.com/v1/projects/test-proj/subscriptions/test-sub:pull",
  );

  const headers = calls[0].init.headers as Record<string, string>;
  assertEquals(headers["Authorization"], "Bearer test-access-token");
  assertEquals(headers["Content-Type"], "application/json");

  const body = JSON.parse(calls[0].init.body as string);
  assertEquals(body.maxMessages, 10);
});

Deno.test("pubsub puller: returns parsed response", async () => {
  const { fetchFn } = createMockFetchWithResponse({
    receivedMessages: [
      {
        ackId: "ack-123",
        message: {
          data: btoa("test"),
          messageId: "msg-1",
          publishTime: "2026-01-01T00:00:00Z",
        },
      },
    ],
  });
  const config = createTestConfig({ _fetchFn: fetchFn });
  const pull = createPubSubPuller(config);

  const result = await pull("projects/test-proj/subscriptions/test-sub", 5);

  assertEquals(result.receivedMessages?.length, 1);
  assertEquals(result.receivedMessages?.[0].ackId, "ack-123");
});

Deno.test("pubsub puller: throws on non-200 response", async () => {
  const fetchFn = createErrorFetch(403, "Permission denied");
  const config = createTestConfig({ _fetchFn: fetchFn as typeof fetch });
  const pull = createPubSubPuller(config);

  let threw = false;
  try {
    await pull("projects/test-proj/subscriptions/test-sub", 5);
  } catch (err: unknown) {
    threw = true;
    assertEquals(
      (err as Error).message.includes("PubSub pull failed (403)"),
      true,
    );
  }
  assertEquals(threw, true);
});

// ─── PubSub acknowledge tests ───────────────────────────────────────────────

Deno.test("pubsub acknowledger: sends correct ack IDs", async () => {
  const { fetchFn, calls } = createMockFetchWithResponse({});
  const config = createTestConfig({ _fetchFn: fetchFn });
  const ack = createPubSubAcknowledger(config);

  await ack("projects/test-proj/subscriptions/test-sub", [
    "ack-1",
    "ack-2",
  ]);

  assertEquals(calls.length, 1);
  assertEquals(
    calls[0].url,
    "https://pubsub.googleapis.com/v1/projects/test-proj/subscriptions/test-sub:acknowledge",
  );

  const body = JSON.parse(calls[0].init.body as string);
  assertEquals(body.ackIds, ["ack-1", "ack-2"]);
});

Deno.test("pubsub acknowledger: skips call for empty ack IDs", async () => {
  const { fetchFn, calls } = createMockFetchWithResponse({});
  const config = createTestConfig({ _fetchFn: fetchFn });
  const ack = createPubSubAcknowledger(config);

  await ack("projects/test-proj/subscriptions/test-sub", []);

  assertEquals(calls.length, 0);
});

Deno.test("pubsub acknowledger: throws on non-200 response", async () => {
  const fetchFn = createErrorFetch(500, "Internal error");
  const config = createTestConfig({ _fetchFn: fetchFn as typeof fetch });
  const ack = createPubSubAcknowledger(config);

  let threw = false;
  try {
    await ack("projects/test-proj/subscriptions/test-sub", ["ack-1"]);
  } catch (err: unknown) {
    threw = true;
    assertEquals(
      (err as Error).message.includes("PubSub acknowledge failed (500)"),
      true,
    );
  }
  assertEquals(threw, true);
});

// ─── Chat API send tests ────────────────────────────────────────────────────

Deno.test("sendGoogleChatMessage: sends correct request format", async () => {
  const { fetchFn, calls } = createMockFetchWithResponse({
    name: "spaces/AAAA/messages/123",
  });
  const config = createTestConfig({ _fetchFn: fetchFn });

  await sendGoogleChatMessage(config, "spaces/AAAA", "Hello!");

  assertEquals(calls.length, 1);
  assertEquals(
    calls[0].url,
    "https://chat.googleapis.com/v1/spaces/AAAA/messages",
  );

  const headers = calls[0].init.headers as Record<string, string>;
  assertEquals(headers["Authorization"], "Bearer test-access-token");

  const body = JSON.parse(calls[0].init.body as string);
  assertEquals(body.text, "Hello!");
});

Deno.test("sendGoogleChatMessage: throws on non-200 response", async () => {
  const fetchFn = createErrorFetch(404, "Space not found");
  const config = createTestConfig({ _fetchFn: fetchFn as typeof fetch });

  let threw = false;
  try {
    await sendGoogleChatMessage(config, "spaces/INVALID", "test");
  } catch (err: unknown) {
    threw = true;
    assertEquals(
      (err as Error).message.includes("Google Chat send failed (404)"),
      true,
    );
  }
  assertEquals(threw, true);
});

// ─── Message parsing tests ──────────────────────────────────────────────────

Deno.test("parseGoogleChatEventData: parses valid base64 JSON", () => {
  const event: GoogleChatEvent = {
    type: "MESSAGE",
    message: {
      text: "Hello",
      sender: { name: "users/123", email: "user@test.com" },
      space: { name: "spaces/AAAA", type: "DM" },
    },
  };
  const data = btoa(JSON.stringify(event));

  const parsed = parseGoogleChatEventData(data);
  assertEquals(parsed?.type, "MESSAGE");
  assertEquals(parsed?.message?.text, "Hello");
  assertEquals(parsed?.message?.sender?.email, "user@test.com");
});

Deno.test("parseGoogleChatEventData: returns undefined for invalid base64", () => {
  const result = parseGoogleChatEventData("not-valid-base64!!!");
  assertEquals(result, undefined);
});

Deno.test("parseGoogleChatEventData: returns undefined for non-JSON base64", () => {
  const data = btoa("this is not json");
  const result = parseGoogleChatEventData(data);
  assertEquals(result, undefined);
});
