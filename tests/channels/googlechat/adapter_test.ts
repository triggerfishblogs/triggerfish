/**
 * Google Chat channel adapter tests.
 *
 * Uses injectable PubSub pull functions and fetch mocks to test
 * the adapter without real Google API calls.
 */

import { assertEquals } from "@std/assert";
import { createGoogleChatChannel } from "../../../src/channels/googlechat/adapter.ts";
import type { GoogleChatConfig, GoogleChatEvent, PubSubPullResponse } from "../../../src/channels/googlechat/types.ts";
import type { ChannelMessage } from "../../../src/channels/types.ts";

// ─── Test helpers ───────────────────────────────────────────────────────────

/** Encode a GoogleChatEvent as base64 (simulates PubSub message data). */
function encodeEvent(event: GoogleChatEvent): string {
  return btoa(JSON.stringify(event));
}

/** Build a mock PubSub pull function that returns canned responses. */
function createMockPullFn(
  responses: PubSubPullResponse[],
): GoogleChatConfig["_pullFn"] {
  let callIndex = 0;
  return (_subscription: string, _maxMessages: number) => {
    const response = responses[callIndex] ?? { receivedMessages: [] };
    callIndex++;
    return Promise.resolve(response);
  };
}

/** Build a mock fetch function that records calls and returns 200 OK. */
function createMockFetch(): {
  fetchFn: typeof fetch;
  calls: Array<{ url: string; body: string }>;
} {
  const calls: Array<{ url: string; body: string }> = [];
  const fetchFn = (
    input: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = typeof input === "string"
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url;
    calls.push({ url, body: (init?.body as string) ?? "" });
    return Promise.resolve(
      new Response(JSON.stringify({ name: "spaces/AAAA/messages/123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };
  return { fetchFn: fetchFn as typeof fetch, calls };
}

/** Build a standard test config with injectable mocks. */
function createTestConfig(
  overrides: Partial<GoogleChatConfig> = {},
): GoogleChatConfig {
  return {
    credentialsRef: "test-token",
    pubsubSubscription: "projects/test/subscriptions/test-sub",
    ownerEmail: "owner@company.com",
    ...overrides,
  };
}

/** Create a DM message event. */
function createDmEvent(
  senderEmail: string,
  text: string,
): GoogleChatEvent {
  return {
    type: "MESSAGE",
    message: {
      text,
      sender: { name: "users/123", email: senderEmail, type: "HUMAN" },
      space: { name: "spaces/DM_AAAA", type: "DM", singleUserBotDm: true },
    },
  };
}

/** Create a group space message event with optional bot mention. */
function createGroupEvent(
  senderEmail: string,
  text: string,
  options: { mentioned?: boolean } = {},
): GoogleChatEvent {
  const annotations = options.mentioned
    ? [{
      type: "USER_MENTION",
      userMention: {
        user: { name: "users/bot", type: "BOT" },
        type: "MENTION",
      },
    }]
    : [];
  return {
    type: "MESSAGE",
    message: {
      text,
      argumentText: text,
      sender: { name: "users/456", email: senderEmail, type: "HUMAN" },
      space: {
        name: "spaces/SPACE_BBBB",
        type: "ROOM",
        displayName: "Engineering",
      },
      annotations,
    },
  };
}

// ─── Adapter creation tests ─────────────────────────────────────────────────

Deno.test("googlechat adapter: defaults to INTERNAL classification", () => {
  const config = createTestConfig({
    _pullFn: createMockPullFn([]),
  });
  const adapter = createGoogleChatChannel(config);
  assertEquals(adapter.classification, "INTERNAL");
});

Deno.test("googlechat adapter: respects custom classification", () => {
  const config = createTestConfig({
    classification: "CONFIDENTIAL",
    _pullFn: createMockPullFn([]),
  });
  const adapter = createGoogleChatChannel(config);
  assertEquals(adapter.classification, "CONFIDENTIAL");
});

// ─── Connect / disconnect tests ─────────────────────────────────────────────

Deno.test({
  name: "googlechat adapter: connect sets connected state",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const config = createTestConfig({
      _pullFn: createMockPullFn([{ receivedMessages: [] }]),
    });
    const adapter = createGoogleChatChannel(config);

    assertEquals(adapter.status().connected, false);
    await adapter.connect();
    assertEquals(adapter.status().connected, true);
    assertEquals(adapter.status().channelType, "googlechat");
    await adapter.disconnect();
  },
});

Deno.test({
  name: "googlechat adapter: disconnect clears poll timer",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const config = createTestConfig({
      _pullFn: createMockPullFn([{ receivedMessages: [] }]),
    });
    const adapter = createGoogleChatChannel(config);

    await adapter.connect();
    assertEquals(adapter.status().connected, true);

    await adapter.disconnect();
    assertEquals(adapter.status().connected, false);
  },
});

// ─── DM message dispatch tests ──────────────────────────────────────────────

Deno.test({
  name: "googlechat adapter: DM messages produce googlechat-{space} session IDs",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const dmEvent = createDmEvent("owner@company.com", "Hello bot");
    const config = createTestConfig({
      _pullFn: createMockPullFn([{
        receivedMessages: [{
          ackId: "ack-1",
          message: {
            data: encodeEvent(dmEvent),
            messageId: "msg-1",
            publishTime: "2026-01-01T00:00:00Z",
          },
        }],
      }]),
      _fetchFn: createMockFetch().fetchFn,
    });

    const received: ChannelMessage[] = [];
    const adapter = createGoogleChatChannel(config);
    adapter.onMessage((msg) => received.push(msg));

    await adapter.connect();
    await new Promise((r) => setTimeout(r, 100));

    assertEquals(received.length, 1);
    assertEquals(received[0].sessionId, "googlechat-spaces_DM_AAAA");
    assertEquals(received[0].content, "Hello bot");
    assertEquals(received[0].isGroup, false);

    await adapter.disconnect();
  },
});

Deno.test({
  name: "googlechat adapter: isOwner resolved from sender email",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const ownerEvent = createDmEvent("owner@company.com", "owner msg");
    const externalEvent = createDmEvent("external@other.com", "external msg");

    const config = createTestConfig({
      ownerEmail: "owner@company.com",
      _pullFn: createMockPullFn([{
        receivedMessages: [
          {
            ackId: "ack-1",
            message: {
              data: encodeEvent(ownerEvent),
              messageId: "msg-1",
              publishTime: "2026-01-01T00:00:00Z",
            },
          },
          {
            ackId: "ack-2",
            message: {
              data: encodeEvent(externalEvent),
              messageId: "msg-2",
              publishTime: "2026-01-01T00:00:01Z",
            },
          },
        ],
      }]),
      _fetchFn: createMockFetch().fetchFn,
    });

    const received: ChannelMessage[] = [];
    const adapter = createGoogleChatChannel(config);
    adapter.onMessage((msg) => received.push(msg));

    await adapter.connect();
    await new Promise((r) => setTimeout(r, 100));

    assertEquals(received.length, 2);
    assertEquals(received[0].isOwner, true);
    assertEquals(received[1].isOwner, false);
    assertEquals(received[1].sessionTaint, "PUBLIC");

    await adapter.disconnect();
  },
});

// ─── Group space tests ──────────────────────────────────────────────────────

Deno.test({
  name: "googlechat adapter: group messages produce googlechat-group-{space} session IDs",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const groupEvent = createGroupEvent(
      "user@company.com",
      "Hey @bot check this",
      { mentioned: true },
    );

    const config = createTestConfig({
      defaultGroupMode: "mentioned-only",
      _pullFn: createMockPullFn([{
        receivedMessages: [{
          ackId: "ack-1",
          message: {
            data: encodeEvent(groupEvent),
            messageId: "msg-1",
            publishTime: "2026-01-01T00:00:00Z",
          },
        }],
      }]),
      _fetchFn: createMockFetch().fetchFn,
    });

    const received: ChannelMessage[] = [];
    const adapter = createGoogleChatChannel(config);
    adapter.onMessage((msg) => received.push(msg));

    await adapter.connect();
    await new Promise((r) => setTimeout(r, 100));

    assertEquals(received.length, 1);
    assertEquals(received[0].sessionId, "googlechat-group-spaces_SPACE_BBBB");
    assertEquals(received[0].isGroup, true);
    assertEquals(received[0].groupId, "spaces/SPACE_BBBB");

    await adapter.disconnect();
  },
});

Deno.test({
  name: "googlechat adapter: mentioned-only mode filters non-mentioned group messages",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const notMentionedEvent = createGroupEvent(
      "user@company.com",
      "Just chatting",
      { mentioned: false },
    );

    const config = createTestConfig({
      defaultGroupMode: "mentioned-only",
      _pullFn: createMockPullFn([{
        receivedMessages: [{
          ackId: "ack-1",
          message: {
            data: encodeEvent(notMentionedEvent),
            messageId: "msg-1",
            publishTime: "2026-01-01T00:00:00Z",
          },
        }],
      }]),
      _fetchFn: createMockFetch().fetchFn,
    });

    const received: ChannelMessage[] = [];
    const adapter = createGoogleChatChannel(config);
    adapter.onMessage((msg) => received.push(msg));

    await adapter.connect();
    await new Promise((r) => setTimeout(r, 100));

    assertEquals(received.length, 0);

    await adapter.disconnect();
  },
});

Deno.test({
  name: "googlechat adapter: always mode dispatches all group messages",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const notMentionedEvent = createGroupEvent(
      "user@company.com",
      "Just chatting",
      { mentioned: false },
    );

    const config = createTestConfig({
      defaultGroupMode: "always",
      _pullFn: createMockPullFn([{
        receivedMessages: [{
          ackId: "ack-1",
          message: {
            data: encodeEvent(notMentionedEvent),
            messageId: "msg-1",
            publishTime: "2026-01-01T00:00:00Z",
          },
        }],
      }]),
      _fetchFn: createMockFetch().fetchFn,
    });

    const received: ChannelMessage[] = [];
    const adapter = createGoogleChatChannel(config);
    adapter.onMessage((msg) => received.push(msg));

    await adapter.connect();
    await new Promise((r) => setTimeout(r, 100));

    assertEquals(received.length, 1);

    await adapter.disconnect();
  },
});

// ─── Send tests ─────────────────────────────────────────────────────────────

Deno.test({
  name: "googlechat adapter: send calls Chat API with correct space name",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { fetchFn, calls } = createMockFetch();
    const config = createTestConfig({
      _pullFn: createMockPullFn([{ receivedMessages: [] }]),
      _fetchFn: fetchFn,
    });
    const adapter = createGoogleChatChannel(config);

    await adapter.connect();
    await adapter.send({
      content: "Hello from Triggerfish",
      sessionId: "googlechat-spaces_DM_AAAA",
    });

    // Find the Chat API call (not the PubSub pull or ack calls)
    const chatCalls = calls.filter((c) => {
      try {
        return new URL(c.url).hostname === "chat.googleapis.com";
      } catch {
        return false;
      }
    });
    assertEquals(chatCalls.length, 1);
    assertEquals(
      chatCalls[0].url,
      "https://chat.googleapis.com/v1/spaces/DM_AAAA/messages",
    );
    const body = JSON.parse(chatCalls[0].body);
    assertEquals(body.text, "Hello from Triggerfish");

    await adapter.disconnect();
  },
});

Deno.test({
  name: "googlechat adapter: send to group session extracts correct space",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const { fetchFn, calls } = createMockFetch();
    const config = createTestConfig({
      _pullFn: createMockPullFn([{ receivedMessages: [] }]),
      _fetchFn: fetchFn,
    });
    const adapter = createGoogleChatChannel(config);

    await adapter.connect();
    await adapter.send({
      content: "Reply to group",
      sessionId: "googlechat-group-spaces_SPACE_BBBB",
    });

    const chatCalls = calls.filter((c) => {
      try {
        return new URL(c.url).hostname === "chat.googleapis.com";
      } catch {
        return false;
      }
    });
    assertEquals(chatCalls.length, 1);
    assertEquals(
      chatCalls[0].url,
      "https://chat.googleapis.com/v1/spaces/SPACE_BBBB/messages",
    );

    await adapter.disconnect();
  },
});

// ─── Typing indicator test ──────────────────────────────────────────────────

Deno.test({
  name: "googlechat adapter: sendTyping does not throw",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const config = createTestConfig({
      _pullFn: createMockPullFn([{ receivedMessages: [] }]),
    });
    const adapter = createGoogleChatChannel(config);

    await adapter.connect();
    // sendTyping is a no-op for Google Chat but should not throw
    await adapter.sendTyping("googlechat-spaces_DM_AAAA");
    await adapter.disconnect();
  },
});

// ─── Error handling test ────────────────────────────────────────────────────

Deno.test({
  name: "googlechat adapter: poll error is logged but not thrown",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const errorPullFn = (
      _subscription: string,
      _maxMessages: number,
    ): Promise<PubSubPullResponse> => {
      return Promise.reject(new Error("Network error"));
    };

    const config = createTestConfig({
      _pullFn: errorPullFn,
    });
    const adapter = createGoogleChatChannel(config);

    // Should not throw — errors are caught and logged
    await adapter.connect();
    await new Promise((r) => setTimeout(r, 100));
    await adapter.disconnect();
  },
});

// ─── Non-MESSAGE event filtering ────────────────────────────────────────────

Deno.test({
  name: "googlechat adapter: non-MESSAGE events are ignored",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const addedToSpaceEvent: GoogleChatEvent = {
      type: "ADDED_TO_SPACE",
      space: { name: "spaces/NEW", type: "DM" },
      user: { name: "users/789", email: "user@company.com" },
    };

    const config = createTestConfig({
      _pullFn: createMockPullFn([{
        receivedMessages: [{
          ackId: "ack-1",
          message: {
            data: encodeEvent(addedToSpaceEvent),
            messageId: "msg-1",
            publishTime: "2026-01-01T00:00:00Z",
          },
        }],
      }]),
      _fetchFn: createMockFetch().fetchFn,
    });

    const received: ChannelMessage[] = [];
    const adapter = createGoogleChatChannel(config);
    adapter.onMessage((msg) => received.push(msg));

    await adapter.connect();
    await new Promise((r) => setTimeout(r, 100));

    assertEquals(received.length, 0);

    await adapter.disconnect();
  },
});
