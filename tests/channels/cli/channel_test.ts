/**
 * Phase 9: First Channel (CLI)
 * Tests MUST FAIL until channel types and CLI adapter are implemented.
 * Tests ChannelAdapter interface, message routing, taint display.
 */
import { assertEquals, assertExists, assert } from "@std/assert";
import type { ChannelMessage } from "../../src/channels/types.ts";
import { createCliChannel } from "../../src/channels/cli/channel.ts";

// --- ChannelAdapter interface ---

Deno.test("ChannelAdapter: createCliChannel returns adapter with required methods", () => {
  const cli = createCliChannel({ interactive: false });
  assertExists(cli.connect);
  assertExists(cli.disconnect);
  assertExists(cli.send);
  assertExists(cli.onMessage);
  assertExists(cli.status);
});

Deno.test("ChannelAdapter: status returns channel state", () => {
  const cli = createCliChannel({ interactive: false });
  const status = cli.status();
  assertExists(status.connected);
  assertExists(status.channelType);
  assertEquals(status.channelType, "cli");
});

// --- CLI-specific behavior ---

Deno.test("CLI channel: defaults to INTERNAL classification", () => {
  const cli = createCliChannel({ interactive: false });
  assertEquals(cli.classification, "INTERNAL");
});

Deno.test("CLI channel: user is always owner", () => {
  const cli = createCliChannel({ interactive: false });
  assertEquals(cli.isOwner, true);
});

// --- Message handling (non-interactive) ---

Deno.test("CLI channel: send formats message to output", async () => {
  const output: string[] = [];
  const cli = createCliChannel({
    interactive: false,
    output: (msg: string) => output.push(msg),
  });
  await cli.send({ content: "Hello from agent", sessionId: "s1" });
  assert(output.length > 0);
  assert(output.some((o) => o.includes("Hello from agent")));
});

Deno.test("CLI channel: onMessage registers handler", () => {
  const cli = createCliChannel({ interactive: false });
  let received: ChannelMessage | null = null;
  cli.onMessage((msg) => { received = msg; });
  // Simulate input
  cli.simulateInput("test message");
  assertExists(received);
  assertEquals(received!.content, "test message");
});

Deno.test("CLI channel: messages include session taint in status", async () => {
  const output: string[] = [];
  const cli = createCliChannel({
    interactive: false,
    output: (msg: string) => output.push(msg),
    showTaint: true,
  });
  await cli.send({
    content: "response",
    sessionId: "s1",
    sessionTaint: "CONFIDENTIAL",
  });
  assert(output.some((o) => o.includes("CONFIDENTIAL")));
});
