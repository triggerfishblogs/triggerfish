/**
 * Phase 15: WebChat adapter Origin validation and fingerprinting suppression tests.
 *
 * Verifies that the WebChat adapter enforces the allowedOrigins config on
 * WebSocket upgrade requests, and that non-WebSocket requests return 404
 * with no identifying information.
 */
import { assertEquals } from "@std/assert";
import { createWebChatChannel } from "../../src/channels/webchat/adapter.ts";

/** Start a WebChat channel on a random port and return the port + cleanup function. */
async function startWebChat(
  allowedOrigins?: readonly string[],
): Promise<{ port: number; stop: () => Promise<void> }> {
  const channel = createWebChatChannel({ port: 0, allowedOrigins });
  // createWebChatChannel uses Deno.serve which doesn't surface the port through
  // the ChannelAdapter interface. Use a fixed ephemeral port instead.
  // We use a fixed high port per test to avoid conflicts.
  // Since port 0 is not surfaced, we pick distinct ports manually.
  return { port: 0, stop: async () => await channel.disconnect() };
}

Deno.test("WebChatChannel: WebSocket rejected 403 — Origin not in allowedOrigins", async () => {
  // Use a specific port so we can connect
  const channel = createWebChatChannel({
    port: 0,
    allowedOrigins: ["https://example.com"],
  });
  // We test via an internal HTTP fetch to the adapter.
  // The adapter uses Deno.serve internally; we need to get the port.
  // Since the connect() API doesn't expose the port, we rely on a fixed port.
  // Instead, we test the routing logic directly via the exported function from adapter.
  // Validate through a real server on a chosen port.
  const port = 28765;
  const channelWithPort = createWebChatChannel({
    port,
    allowedOrigins: ["https://example.com"],
  });
  try {
    await channelWithPort.connect();
    const response = await fetch(`http://127.0.0.1:${port}/`, {
      headers: {
        upgrade: "websocket",
        connection: "upgrade",
        origin: "https://evil.com",
      },
    });
    assertEquals(response.status, 403);
    await response.body?.cancel();
  } finally {
    await channelWithPort.disconnect();
  }
});

Deno.test("WebChatChannel: WebSocket accepted — Origin matches allowedOrigins", async () => {
  const port = 28766;
  const channel = createWebChatChannel({
    port,
    allowedOrigins: ["https://example.com"],
  });
  try {
    await channel.connect();
    const response = await fetch(`http://127.0.0.1:${port}/`, {
      headers: {
        upgrade: "websocket",
        connection: "upgrade",
        origin: "https://example.com",
      },
    });
    // Auth passed — should get 101 or similar, not 401/403
    const status = response.status;
    assertEquals(status !== 403, true);
    await response.body?.cancel();
  } finally {
    await channel.disconnect();
  }
});

Deno.test("WebChatChannel: WebSocket accepted — allowedOrigins not configured (default * behavior)", async () => {
  const port = 28767;
  const channel = createWebChatChannel({ port });
  try {
    await channel.connect();
    const response = await fetch(`http://127.0.0.1:${port}/`, {
      headers: {
        upgrade: "websocket",
        connection: "upgrade",
        origin: "https://any-origin.com",
      },
    });
    const status = response.status;
    assertEquals(status !== 403, true);
    await response.body?.cancel();
  } finally {
    await channel.disconnect();
  }
});

Deno.test("WebChatChannel: non-WebSocket request returns 404", async () => {
  const port = 28768;
  const channel = createWebChatChannel({ port });
  try {
    await channel.connect();
    const response = await fetch(`http://127.0.0.1:${port}/`);
    assertEquals(response.status, 404);
    const text = await response.text();
    assertEquals(text, "");
  } finally {
    await channel.disconnect();
  }
});
