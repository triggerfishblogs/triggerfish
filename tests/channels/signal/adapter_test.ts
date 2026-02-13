/**
 * Phase C2: Signal Channel Adapter Tests
 *
 * Tests the Signal adapter factory, message handling, DM policy,
 * group mode filtering, and typing indicators using a mock SignalClient.
 */
import { assertEquals, assert } from "jsr:@std/assert";
import { createSignalChannel } from "../../../src/channels/signal/adapter.ts";
import type { SignalClientInterface, SignalNotification } from "../../../src/channels/signal/types.ts";
import type { Result } from "../../../src/core/types/classification.ts";
import type { ChannelMessage } from "../../../src/channels/types.ts";

/** Create a mock SignalClient that records calls and allows feeding notifications. */
function createMockClient(): {
  client: SignalClientInterface;
  calls: Array<{ method: string; args: unknown[] }>;
  feedNotification: (notification: SignalNotification) => void;
} {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  let notificationHandler: ((notification: SignalNotification) => void) | null = null;

  const client: SignalClientInterface = {
    async connect(): Promise<Result<void, string>> {
      calls.push({ method: "connect", args: [] });
      return { ok: true, value: undefined };
    },
    async disconnect(): Promise<void> {
      calls.push({ method: "disconnect", args: [] });
    },
    async sendMessage(recipient: string, message: string): Promise<Result<{ readonly timestamp: number }, string>> {
      calls.push({ method: "sendMessage", args: [recipient, message] });
      return { ok: true, value: { timestamp: Date.now() } };
    },
    async sendGroupMessage(groupId: string, message: string): Promise<Result<{ readonly timestamp: number }, string>> {
      calls.push({ method: "sendGroupMessage", args: [groupId, message] });
      return { ok: true, value: { timestamp: Date.now() } };
    },
    async sendTyping(recipient: string): Promise<Result<void, string>> {
      calls.push({ method: "sendTyping", args: [recipient] });
      return { ok: true, value: undefined };
    },
    async sendTypingStop(recipient: string): Promise<Result<void, string>> {
      calls.push({ method: "sendTypingStop", args: [recipient] });
      return { ok: true, value: undefined };
    },
    onNotification(handler: (notification: SignalNotification) => void): void {
      notificationHandler = handler;
    },
    async ping(): Promise<Result<void, string>> {
      calls.push({ method: "ping", args: [] });
      return { ok: true, value: undefined };
    },
  };

  return {
    client,
    calls,
    feedNotification: (notification: SignalNotification) => {
      if (notificationHandler) {
        notificationHandler(notification);
      }
    },
  };
}

/** Create a Signal notification envelope for testing. */
function makeNotification(opts: {
  source: string;
  message: string;
  groupId?: string;
  mentions?: ReadonlyArray<{ readonly start: number; readonly length: number; readonly uuid: string }>;
}): SignalNotification {
  return {
    envelope: {
      source: opts.source,
      sourceDevice: 1,
      timestamp: Date.now(),
      dataMessage: {
        message: opts.message,
        timestamp: Date.now(),
        groupInfo: opts.groupId ? { groupId: opts.groupId } : null,
        mentions: opts.mentions,
      },
    },
  };
}

Deno.test("Signal: factory creates adapter with correct channel type", () => {
  const { client } = createMockClient();
  const adapter = createSignalChannel({
    endpoint: "tcp://localhost:7583",
    account: "+15551234567",
    _client: client,
  });
  assertEquals(adapter.status().channelType, "signal");
  assertEquals(adapter.status().connected, false);
});

Deno.test("Signal: defaults to INTERNAL classification", () => {
  const { client } = createMockClient();
  const adapter = createSignalChannel({
    endpoint: "tcp://localhost:7583",
    account: "+15551234567",
    _client: client,
  });
  assertEquals(adapter.classification, "INTERNAL");
});

Deno.test("Signal: respects custom classification", () => {
  const { client } = createMockClient();
  const adapter = createSignalChannel({
    endpoint: "tcp://localhost:7583",
    account: "+15551234567",
    classification: "CONFIDENTIAL",
    _client: client,
  });
  assertEquals(adapter.classification, "CONFIDENTIAL");
});

Deno.test("Signal: isOwner is always false", () => {
  const { client } = createMockClient();
  const adapter = createSignalChannel({
    endpoint: "tcp://localhost:7583",
    account: "+15551234567",
    _client: client,
  });
  assertEquals(adapter.isOwner, false);
});

Deno.test("Signal: registers message handler", () => {
  const { client } = createMockClient();
  const adapter = createSignalChannel({
    endpoint: "tcp://localhost:7583",
    account: "+15551234567",
    _client: client,
  });
  let called = false;
  adapter.onMessage(() => { called = true; });
  // Handler registered but won't fire without notifications
  assertEquals(called, false);
});

Deno.test("Signal: send returns early for missing sessionId", async () => {
  const { client, calls } = createMockClient();
  const adapter = createSignalChannel({
    endpoint: "tcp://localhost:7583",
    account: "+15551234567",
    _client: client,
  });
  await adapter.connect();

  // No sessionId — should return early without sending
  await adapter.send({ content: "hello" });
  const sendCalls = calls.filter((c) => c.method === "sendMessage");
  assertEquals(sendCalls.length, 0);

  await adapter.disconnect();
});

Deno.test("Signal: send auto-chunks at 4000 chars", async () => {
  const { client, calls } = createMockClient();
  const adapter = createSignalChannel({
    endpoint: "tcp://localhost:7583",
    account: "+15551234567",
    _client: client,
  });
  await adapter.connect();

  const longText = "a".repeat(5000);
  await adapter.send({ content: longText, sessionId: "signal-+15559876543" });

  const sendCalls = calls.filter((c) => c.method === "sendMessage");
  assert(sendCalls.length >= 2, `Should chunk into at least 2 messages, got ${sendCalls.length}`);

  await adapter.disconnect();
});

Deno.test("Signal: inbound DM creates correct ChannelMessage", async () => {
  const { client, feedNotification } = createMockClient();
  const adapter = createSignalChannel({
    endpoint: "tcp://localhost:7583",
    account: "+15551234567",
    dmPolicy: "open",
    _client: client,
  });

  let received: ChannelMessage | null = null;
  adapter.onMessage((msg) => { received = msg; });
  await adapter.connect();

  feedNotification(makeNotification({
    source: "+15559876543",
    message: "Hello Triggerfish",
  }));

  assert(received !== null, "Handler should have been called");
  assertEquals(received!.sessionId, "signal-+15559876543");
  assertEquals(received!.senderId, "+15559876543");
  assertEquals(received!.isOwner, false);
  assertEquals(received!.content, "Hello Triggerfish");

  await adapter.disconnect();
});

Deno.test("Signal: inbound group message creates correct sessionId", async () => {
  const { client, feedNotification } = createMockClient();
  const adapter = createSignalChannel({
    endpoint: "tcp://localhost:7583",
    account: "+15551234567",
    defaultGroupMode: "always",
    _client: client,
  });

  let received: ChannelMessage | null = null;
  adapter.onMessage((msg) => { received = msg; });
  await adapter.connect();

  feedNotification(makeNotification({
    source: "+15559876543",
    message: "Group hello",
    groupId: "abc123",
  }));

  assert(received !== null, "Handler should have been called");
  assertEquals(received!.sessionId, "signal-group-abc123");
  assertEquals(received!.isOwner, false);

  await adapter.disconnect();
});

Deno.test("Signal: allowlist dmPolicy allows listed number", async () => {
  const { client, feedNotification } = createMockClient();
  const adapter = createSignalChannel({
    endpoint: "tcp://localhost:7583",
    account: "+15551234567",
    dmPolicy: "allowlist",
    allowFrom: ["+15559876543"],
    _client: client,
  });

  let received: ChannelMessage | null = null;
  adapter.onMessage((msg) => { received = msg; });
  await adapter.connect();

  feedNotification(makeNotification({
    source: "+15559876543",
    message: "Allowed sender",
  }));

  assert(received !== null, "Handler should have been called for allowed number");
  assertEquals(received!.content, "Allowed sender");

  await adapter.disconnect();
});

Deno.test("Signal: allowlist dmPolicy blocks unlisted number", async () => {
  const { client, feedNotification } = createMockClient();
  const adapter = createSignalChannel({
    endpoint: "tcp://localhost:7583",
    account: "+15551234567",
    dmPolicy: "allowlist",
    allowFrom: ["+15559876543"],
    _client: client,
  });

  let received: ChannelMessage | null = null;
  adapter.onMessage((msg) => { received = msg; });
  await adapter.connect();

  feedNotification(makeNotification({
    source: "+15551111111",
    message: "Blocked sender",
  }));

  assertEquals(received, null, "Handler should NOT have been called for unlisted number");

  await adapter.disconnect();
});

Deno.test("Signal: open dmPolicy allows any number", async () => {
  const { client, feedNotification } = createMockClient();
  const adapter = createSignalChannel({
    endpoint: "tcp://localhost:7583",
    account: "+15551234567",
    dmPolicy: "open",
    _client: client,
  });

  const messages: ChannelMessage[] = [];
  adapter.onMessage((msg) => { messages.push(msg); });
  await adapter.connect();

  feedNotification(makeNotification({ source: "+15551111111", message: "One" }));
  feedNotification(makeNotification({ source: "+15552222222", message: "Two" }));

  assertEquals(messages.length, 2);

  await adapter.disconnect();
});

Deno.test("Signal: group mentioned-only filters unmentioned messages", async () => {
  const { client, feedNotification } = createMockClient();
  const adapter = createSignalChannel({
    endpoint: "tcp://localhost:7583",
    account: "+15551234567",
    defaultGroupMode: "mentioned-only",
    _client: client,
  });

  let received: ChannelMessage | null = null;
  adapter.onMessage((msg) => { received = msg; });
  await adapter.connect();

  // Message without mention — should be filtered
  feedNotification(makeNotification({
    source: "+15559876543",
    message: "Hello everyone",
    groupId: "group1",
  }));

  assertEquals(received, null, "Handler should NOT be called for unmentioned group message");

  await adapter.disconnect();
});

Deno.test("Signal: group mentioned-only allows mentioned messages", async () => {
  const { client, feedNotification } = createMockClient();
  const adapter = createSignalChannel({
    endpoint: "tcp://localhost:7583",
    account: "+15551234567",
    defaultGroupMode: "mentioned-only",
    _client: client,
  });

  let received: ChannelMessage | null = null;
  adapter.onMessage((msg) => { received = msg; });
  await adapter.connect();

  // Message with mention data
  feedNotification(makeNotification({
    source: "+15559876543",
    message: "Hey @bot check this",
    groupId: "group1",
    mentions: [{ start: 4, length: 4, uuid: "bot-uuid" }],
  }));

  assert(received !== null, "Handler should be called for mentioned group message");

  await adapter.disconnect();
});

Deno.test("Signal: typing indicator sent before response", async () => {
  const { client, calls } = createMockClient();
  const adapter = createSignalChannel({
    endpoint: "tcp://localhost:7583",
    account: "+15551234567",
    _client: client,
  });
  await adapter.connect();

  await adapter.send({ content: "Hello", sessionId: "signal-+15559876543" });

  // Find typing calls
  const typingCalls = calls.filter((c) => c.method === "sendTyping");
  const typingStopCalls = calls.filter((c) => c.method === "sendTypingStop");
  const sendCalls = calls.filter((c) => c.method === "sendMessage");

  assert(typingCalls.length >= 1, "Should send typing indicator");
  assert(sendCalls.length >= 1, "Should send message");
  assert(typingStopCalls.length >= 1, "Should stop typing after send");

  // Verify typing comes before send in the call order
  const typingIdx = calls.findIndex((c) => c.method === "sendTyping");
  const sendIdx = calls.findIndex((c) => c.method === "sendMessage");
  const stopIdx = calls.findIndex((c) => c.method === "sendTypingStop");

  assert(typingIdx < sendIdx, "Typing should be sent before message");
  assert(sendIdx < stopIdx, "Typing stop should come after message");

  await adapter.disconnect();
});

Deno.test("Signal: send to group uses sendGroupMessage", async () => {
  const { client, calls } = createMockClient();
  const adapter = createSignalChannel({
    endpoint: "tcp://localhost:7583",
    account: "+15551234567",
    _client: client,
  });
  await adapter.connect();

  await adapter.send({ content: "Group msg", sessionId: "signal-group-abc123" });

  const groupCalls = calls.filter((c) => c.method === "sendGroupMessage");
  assert(groupCalls.length >= 1, "Should use sendGroupMessage for group sessions");
  assertEquals(groupCalls[0].args[0], "abc123");

  // No typing for groups (only for DMs)
  const typingCalls = calls.filter((c) => c.method === "sendTyping");
  assertEquals(typingCalls.length, 0, "No typing indicators for group messages");

  await adapter.disconnect();
});
