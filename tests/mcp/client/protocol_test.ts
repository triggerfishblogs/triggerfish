/**
 * Phase 6: MCP Client Core
 * Tests MUST FAIL until protocol.ts and transport.ts are implemented.
 * Tests JSON-RPC formatting, handshake, tool invocation.
 */
import { assert, assertEquals, assertExists } from "@std/assert";
import {
  createMcpClient,
  formatRequest,
  parseMessage,
} from "../../src/mcp/client/protocol.ts";
import type { Transport } from "../../src/mcp/client/transport.ts";

// --- JSON-RPC 2.0 message formatting ---

Deno.test("formatRequest: creates valid JSON-RPC 2.0 request", () => {
  const req = formatRequest("tools/list", { cursor: null }, 1);
  assertEquals(req.jsonrpc, "2.0");
  assertEquals(req.method, "tools/list");
  assertEquals(req.id, 1);
  assertExists(req.params);
});

Deno.test("formatRequest: auto-increments ID when not provided", () => {
  const r1 = formatRequest("test", {});
  const r2 = formatRequest("test", {});
  assert(r1.id !== r2.id);
});

Deno.test("parseMessage: parses valid JSON-RPC response", () => {
  const raw = JSON.stringify({ jsonrpc: "2.0", id: 1, result: { tools: [] } });
  const msg = parseMessage(raw);
  assertExists(msg);
  assertEquals(msg.id, 1);
  assertExists(msg.result);
});

Deno.test("parseMessage: parses error response", () => {
  const raw = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    error: { code: -32600, message: "Invalid Request" },
  });
  const msg = parseMessage(raw);
  assertExists(msg.error);
  assertEquals(msg.error.code, -32600);
});

// --- Mock transport for client tests ---

function createMockTransport(responses: Record<string, unknown>): Transport {
  const handlers: Array<(msg: string) => void> = [];
  return {
    connect() {},
    disconnect() {},
    // deno-lint-ignore require-await
    async send(msg: string) {
      const parsed = JSON.parse(msg);
      const response = responses[parsed.method] ??
        { error: { code: -32601, message: "Not found" } };
      const reply = JSON.stringify({
        jsonrpc: "2.0",
        id: parsed.id,
        result: response,
      });
      for (const h of handlers) h(reply);
    },
    onMessage(handler: (msg: string) => void) {
      handlers.push(handler);
    },
  };
}

// --- MCP Client ---

Deno.test("McpClient: initialize handshake completes", async () => {
  const transport = createMockTransport({
    initialize: {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "test-server", version: "1.0" },
    },
  });
  const client = createMcpClient(transport);
  const info = await client.initialize();
  assertExists(info.serverInfo);
  assertEquals(info.serverInfo.name, "test-server");
});

Deno.test("McpClient: listTools returns tool definitions", async () => {
  const transport = createMockTransport({
    initialize: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      serverInfo: { name: "test", version: "1" },
    },
    "tools/list": {
      tools: [
        {
          name: "read_file",
          description: "Read a file",
          inputSchema: { type: "object" },
        },
      ],
    },
  });
  const client = createMcpClient(transport);
  await client.initialize();
  const tools = await client.listTools();
  assertEquals(tools.length, 1);
  assertEquals(tools[0].name, "read_file");
});

Deno.test("McpClient: callTool sends correct request and returns result", async () => {
  const transport = createMockTransport({
    initialize: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      serverInfo: { name: "test", version: "1" },
    },
    "tools/call": { content: [{ type: "text", text: "file contents here" }] },
  });
  const client = createMcpClient(transport);
  await client.initialize();
  const result = await client.callTool("read_file", { path: "/tmp/test.txt" });
  assertExists(result.content);
  assertEquals(result.content[0].text, "file contents here");
});
