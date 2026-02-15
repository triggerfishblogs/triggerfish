/**
 * Phase C2: Signal JSON-RPC Client Tests
 *
 * Tests the low-level signal-cli JSON-RPC client using mock connections.
 */
import { assertEquals, assert } from "jsr:@std/assert";
import { createSignalClient } from "../../../src/channels/signal/client.ts";
import type { SignalNotification } from "../../../src/channels/signal/types.ts";

/** Create a mock Deno.Conn backed by readable/writable streams. */
function createMockConn(): {
  conn: Deno.Conn;
  written: () => string;
  feedResponse: (data: string) => void;
} {
  let writtenData = "";
  const encoder = new TextEncoder();

  // Response feed queue
  const responseQueue: string[] = [];
  let responseResolver: ((value: null) => void) | null = null;

  const readable = new ReadableStream<Uint8Array>({
    async pull(controller) {
      // Wait for data to be available
      while (responseQueue.length === 0) {
        await new Promise<null>((resolve) => {
          responseResolver = resolve;
        });
      }
      const data = responseQueue.shift()!;
      controller.enqueue(encoder.encode(data));
    },
  });

  const reader = readable.getReader();
  let closed = false;

  const conn = {
    read(buf: Uint8Array): Promise<number | null> {
      if (closed) return Promise.resolve(null);
      return reader.read().then(({ value, done }) => {
        if (done || !value) return null;
        const len = Math.min(value.length, buf.length);
        buf.set(value.subarray(0, len));
        return len;
      });
    },
    write(data: Uint8Array): Promise<number> {
      writtenData += new TextDecoder().decode(data);
      return Promise.resolve(data.length);
    },
    close(): void {
      closed = true;
      reader.cancel();
    },
    localAddr: { transport: "tcp", hostname: "127.0.0.1", port: 12345 } as Deno.Addr,
    remoteAddr: { transport: "tcp", hostname: "127.0.0.1", port: 7583 } as Deno.Addr,
    rid: 0,
    readable: new ReadableStream(),
    writable: new WritableStream(),
    ref(): void {},
    unref(): void {},
    [Symbol.dispose](): void {},
    closeWrite(): Promise<void> { return Promise.resolve(); },
  } as unknown as Deno.Conn;

  return {
    conn,
    written: () => writtenData,
    feedResponse: (data: string) => {
      responseQueue.push(data);
      if (responseResolver) {
        const r = responseResolver;
        responseResolver = null;
        r(null);
      }
    },
  };
}

Deno.test("SignalClient: createSignalClient returns client with tcp endpoint", () => {
  const client = createSignalClient({ endpoint: "tcp://localhost:7583" });
  // Client exists and has all methods
  assertEquals(typeof client.connect, "function");
  assertEquals(typeof client.disconnect, "function");
  assertEquals(typeof client.sendMessage, "function");
  assertEquals(typeof client.sendGroupMessage, "function");
  assertEquals(typeof client.sendTyping, "function");
  assertEquals(typeof client.sendTypingStop, "function");
  assertEquals(typeof client.onNotification, "function");
  assertEquals(typeof client.ping, "function");
});

Deno.test("SignalClient: createSignalClient returns client with unix endpoint", () => {
  const client = createSignalClient({ endpoint: "unix:///tmp/signal-cli.sock" });
  assertEquals(typeof client.connect, "function");
});

Deno.test("SignalClient: connect succeeds with injected connection", async () => {
  const { conn } = createMockConn();
  const client = createSignalClient({ endpoint: "tcp://localhost:7583", _conn: conn });

  const result = await client.connect();
  assertEquals(result.ok, true);

  await client.disconnect();
});

Deno.test("SignalClient: sendMessage formats correct JSON-RPC request", async () => {
  const { conn, written, feedResponse } = createMockConn();
  const client = createSignalClient({ endpoint: "tcp://localhost:7583", _conn: conn });

  await client.connect();

  // Feed response before sending so the promise resolves
  const sendPromise = client.sendMessage("+15559876543", "Hello");

  // Allow the write to happen
  await new Promise((r) => setTimeout(r, 10));

  // Parse the written request
  const lines = written().trim().split("\n");
  const lastLine = lines[lines.length - 1];
  const parsed = JSON.parse(lastLine);

  assertEquals(parsed.jsonrpc, "2.0");
  assertEquals(parsed.method, "send");
  assertEquals(parsed.params.recipient, ["+15559876543"]);
  assertEquals(parsed.params.message, "Hello");
  assert(typeof parsed.id === "string");

  // Feed matching response
  feedResponse(JSON.stringify({
    jsonrpc: "2.0",
    result: { timestamp: 1234567890 },
    id: parsed.id,
  }) + "\n");

  const result = await sendPromise;
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.timestamp, 1234567890);
  }

  await client.disconnect();
});

Deno.test("SignalClient: response matching dispatches by id", async () => {
  const { conn, feedResponse } = createMockConn();
  const client = createSignalClient({ endpoint: "tcp://localhost:7583", _conn: conn });

  await client.connect();

  // Send two requests
  const promise1 = client.sendMessage("+15551111111", "First");
  await new Promise((r) => setTimeout(r, 10));
  const promise2 = client.sendMessage("+15552222222", "Second");
  await new Promise((r) => setTimeout(r, 10));

  // Respond to second first, then first
  feedResponse(JSON.stringify({
    jsonrpc: "2.0",
    result: { timestamp: 2000 },
    id: "req-2",
  }) + "\n");

  feedResponse(JSON.stringify({
    jsonrpc: "2.0",
    result: { timestamp: 1000 },
    id: "req-1",
  }) + "\n");

  const result1 = await promise1;
  const result2 = await promise2;

  assertEquals(result1.ok, true);
  assertEquals(result2.ok, true);
  if (result1.ok) assertEquals(result1.value.timestamp, 1000);
  if (result2.ok) assertEquals(result2.value.timestamp, 2000);

  await client.disconnect();
});

Deno.test("SignalClient: notification dispatches to handler", async () => {
  const { conn, feedResponse } = createMockConn();
  const client = createSignalClient({ endpoint: "tcp://localhost:7583", _conn: conn });

  await client.connect();

  let received: SignalNotification | null = null;
  client.onNotification((notification) => {
    received = notification;
  });

  // Feed a receive notification (no id field = notification)
  feedResponse(JSON.stringify({
    jsonrpc: "2.0",
    method: "receive",
    params: {
      envelope: {
        source: "+15559876543",
        sourceDevice: 1,
        timestamp: 1234567891,
        dataMessage: {
          message: "Hi there",
          timestamp: 1234567891,
          groupInfo: null,
        },
      },
    },
  }) + "\n");

  // Wait for dispatch
  await new Promise((r) => setTimeout(r, 50));

  assert(received !== null, "Notification handler should have been called");
  assertEquals(received!.envelope.source, "+15559876543");
  assertEquals(received!.envelope.dataMessage?.message, "Hi there");

  await client.disconnect();
});

Deno.test("SignalClient: ping returns ok on success", async () => {
  const { conn, feedResponse } = createMockConn();
  const client = createSignalClient({ endpoint: "tcp://localhost:7583", _conn: conn });

  await client.connect();

  const pingPromise = client.ping();
  await new Promise((r) => setTimeout(r, 10));

  feedResponse(JSON.stringify({
    jsonrpc: "2.0",
    result: [{ number: "+15551234567" }],
    id: "req-1",
  }) + "\n");

  const result = await pingPromise;
  assertEquals(result.ok, true);

  await client.disconnect();
});

Deno.test("SignalClient: disconnect closes connection", async () => {
  const { conn } = createMockConn();
  const client = createSignalClient({ endpoint: "tcp://localhost:7583", _conn: conn });

  await client.connect();
  await client.disconnect();

  // Sending after disconnect should fail
  const result = await client.sendMessage("+15551234567", "test");
  assertEquals(result.ok, false);
});

Deno.test("SignalClient: sendTyping sends correct method", async () => {
  const { conn, written, feedResponse } = createMockConn();
  const client = createSignalClient({ endpoint: "tcp://localhost:7583", _conn: conn });

  await client.connect();

  const typingPromise = client.sendTyping("+15559876543");
  await new Promise((r) => setTimeout(r, 10));

  const lines = written().trim().split("\n");
  const lastLine = lines[lines.length - 1];
  const parsed = JSON.parse(lastLine);

  assertEquals(parsed.method, "sendTyping");
  assertEquals(parsed.params.recipient, "+15559876543");

  feedResponse(JSON.stringify({
    jsonrpc: "2.0",
    result: {},
    id: parsed.id,
  }) + "\n");

  const result = await typingPromise;
  assertEquals(result.ok, true);

  await client.disconnect();
});

Deno.test("SignalClient: sendTypingStop sends stop flag", async () => {
  const { conn, written, feedResponse } = createMockConn();
  const client = createSignalClient({ endpoint: "tcp://localhost:7583", _conn: conn });

  await client.connect();

  const stopPromise = client.sendTypingStop("+15559876543");
  await new Promise((r) => setTimeout(r, 10));

  const lines = written().trim().split("\n");
  const lastLine = lines[lines.length - 1];
  const parsed = JSON.parse(lastLine);

  assertEquals(parsed.method, "sendTyping");
  assertEquals(parsed.params.recipient, "+15559876543");
  assertEquals(parsed.params.stop, true);

  feedResponse(JSON.stringify({
    jsonrpc: "2.0",
    result: {},
    id: parsed.id,
  }) + "\n");

  const result = await stopPromise;
  assertEquals(result.ok, true);

  await client.disconnect();
});
