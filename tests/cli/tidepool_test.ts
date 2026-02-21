/**
 * Tests for the `triggerfish tidepool` CLI command and related constants.
 */
import { assertEquals } from "@std/assert";

// ─── Constants ────────────────────────────────────────────────────────────────

Deno.test("tidepool: TIDEPOOL_PORT is 18790", async () => {
  const { TIDEPOOL_PORT } = await import("../../src/cli/constants.ts");
  assertEquals(TIDEPOOL_PORT, 18790);
});

Deno.test("tidepool: GATEWAY_PORT is 18789", async () => {
  const { GATEWAY_PORT } = await import("../../src/cli/constants.ts");
  assertEquals(GATEWAY_PORT, 18789);
});

// ─── getTidepoolUrl ───────────────────────────────────────────────────────────

Deno.test("tidepool: getTidepoolUrl returns expected URL", async () => {
  const { getTidepoolUrl } = await import("../../src/cli/commands/tidepool.ts");
  assertEquals(getTidepoolUrl(), "http://127.0.0.1:18790");
});

// ─── parseCommand for tidepool ────────────────────────────────────────────────

Deno.test({
  name: "CLI: parses 'tidepool' command (no subcommand)",
  sanitizeResources: false,
  fn: async () => {
    const { parseCommand } = await import("../../src/cli/main.ts");
    const cmd = parseCommand(["tidepool"]);
    assertEquals(cmd.command, "tidepool");
    assertEquals(cmd.subcommand, undefined);
  },
});

Deno.test({
  name: "CLI: parses 'tidepool url' subcommand",
  sanitizeResources: false,
  fn: async () => {
    const { parseCommand } = await import("../../src/cli/main.ts");
    const cmd = parseCommand(["tidepool", "url"]);
    assertEquals(cmd.command, "tidepool");
    assertEquals(cmd.subcommand, "url");
  },
});

Deno.test({
  name: "CLI: parses 'tidepool unknown' subcommand (rejected at runtime)",
  sanitizeResources: false,
  fn: async () => {
    const { parseCommand } = await import("../../src/cli/main.ts");
    const cmd = parseCommand(["tidepool", "unknown"]);
    assertEquals(cmd.command, "tidepool");
    assertEquals(cmd.subcommand, "unknown");
  },
});
