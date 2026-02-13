/**
 * Phase 7: MCP Gateway
 * Tests MUST FAIL until gateway.ts and classifier.ts are implemented.
 * Tests server classification, tool permissions, enforcement flow.
 */
import { assertEquals } from "@std/assert";
import {
  createMcpGateway,
} from "../../src/mcp/gateway/gateway.ts";
import {
  classifyServer,
} from "../../src/mcp/gateway/classifier.ts";
import { createPolicyEngine } from "../../src/core/policy/engine.ts";
import { createHookRunner, createDefaultRules } from "../../src/core/policy/hooks.ts";
import { createSession, updateTaint } from "../../src/core/types/session.ts";
import type { UserId, ChannelId } from "../../src/core/types/session.ts";

function makeSession(taint = "PUBLIC" as const) {
  let s = createSession({ userId: "u" as UserId, channelId: "c" as ChannelId });
  if (taint !== "PUBLIC") s = updateTaint(s, taint, "test");
  return s;
}

// --- Server classification ---

Deno.test("classifyServer: default state is UNTRUSTED", () => {
  const state = classifyServer({ uri: "test://server", name: "test" });
  assertEquals(state.status, "UNTRUSTED");
});

Deno.test("classifyServer: can set to CLASSIFIED with classification level", () => {
  const state = classifyServer({
    uri: "test://server",
    name: "test",
    status: "CLASSIFIED",
    classification: "INTERNAL",
  });
  assertEquals(state.status, "CLASSIFIED");
  assertEquals(state.classification, "INTERNAL");
});

// --- Gateway enforcement ---

Deno.test("Gateway: rejects tool call to UNTRUSTED server", async () => {
  const engine = createPolicyEngine();
  for (const r of createDefaultRules()) engine.addRule(r);
  const runner = createHookRunner(engine);
  const gateway = createMcpGateway({ hookRunner: runner });

  gateway.registerServer({
    uri: "test://untrusted",
    name: "bad-server",
    status: "UNTRUSTED",
  });

  const session = makeSession();
  const result = await gateway.callTool({
    serverUri: "test://untrusted",
    toolName: "read_file",
    arguments: {},
    session,
  });
  assertEquals(result.ok, false);
});

Deno.test("Gateway: rejects tool call to BLOCKED server", async () => {
  const engine = createPolicyEngine();
  const runner = createHookRunner(engine);
  const gateway = createMcpGateway({ hookRunner: runner });

  gateway.registerServer({
    uri: "test://blocked",
    name: "blocked-server",
    status: "BLOCKED",
  });

  const session = makeSession();
  const result = await gateway.callTool({
    serverUri: "test://blocked",
    toolName: "anything",
    arguments: {},
    session,
  });
  assertEquals(result.ok, false);
});

Deno.test("Gateway: allows tool call to CLASSIFIED server", async () => {
  const engine = createPolicyEngine();
  const runner = createHookRunner(engine);
  const gateway = createMcpGateway({
    hookRunner: runner,
    mockToolResponse: { content: [{ type: "text", text: "ok" }] },
  });

  gateway.registerServer({
    uri: "test://classified",
    name: "good-server",
    status: "CLASSIFIED",
    classification: "INTERNAL",
  });

  const session = makeSession();
  const result = await gateway.callTool({
    serverUri: "test://classified",
    toolName: "read",
    arguments: {},
    session,
  });
  assertEquals(result.ok, true);
});

Deno.test("Gateway: logs all decisions", async () => {
  const engine = createPolicyEngine();
  const entries: unknown[] = [];
  const runner = createHookRunner(engine, { logger: { log: (e: unknown) => entries.push(e) } });
  const gateway = createMcpGateway({ hookRunner: runner });
  gateway.registerServer({ uri: "test://s", name: "s", status: "UNTRUSTED" });
  const session = makeSession();
  await gateway.callTool({ serverUri: "test://s", toolName: "t", arguments: {}, session });
  // At least one log entry from the hook runner
  assertEquals(entries.length >= 1, true);
});
