/**
 * MCP Executor tests.
 *
 * Tests tool name encoding/decoding, tool definitions, system prompt,
 * and classification mapping.
 */
import { assertEquals } from "@std/assert";
import {
  encodeMcpToolName,
  decodeMcpToolName,
  getMcpToolDefinitions,
  buildMcpToolClassifications,
  buildMcpSystemPrompt,
} from "../../src/mcp/executor.ts";
import type { ConnectedMcpServer } from "../../src/mcp/manager.ts";
import type { McpToolDefinition } from "../../src/mcp/client/protocol.ts";

// --- encodeMcpToolName ---

Deno.test("encodeMcpToolName: produces correct namespaced name", () => {
  assertEquals(encodeMcpToolName("github", "list_repos"), "mcp_github_list_repos");
  assertEquals(encodeMcpToolName("fs", "read"), "mcp_fs_read");
});

Deno.test("encodeMcpToolName: handles single-char server id", () => {
  assertEquals(encodeMcpToolName("x", "tool"), "mcp_x_tool");
});

// --- decodeMcpToolName ---

Deno.test("decodeMcpToolName: decodes valid MCP tool names", () => {
  const result = decodeMcpToolName("mcp_github_list_repos", ["github", "fs"]);
  assertEquals(result, { serverId: "github", toolName: "list_repos" });
});

Deno.test("decodeMcpToolName: returns null for non-MCP names", () => {
  assertEquals(decodeMcpToolName("read_file", ["github"]), null);
  assertEquals(decodeMcpToolName("todo_list", ["github"]), null);
  assertEquals(decodeMcpToolName("mcp", ["github"]), null);
});

Deno.test("decodeMcpToolName: returns null when no server matches", () => {
  assertEquals(decodeMcpToolName("mcp_unknown_tool", ["github", "fs"]), null);
});

Deno.test("decodeMcpToolName: handles overlapping server ID prefixes (longest match first)", () => {
  // "github" and "github_enterprise" — should match longest first
  const result = decodeMcpToolName(
    "mcp_github_enterprise_list_repos",
    ["github", "github_enterprise"],
  );
  assertEquals(result, { serverId: "github_enterprise", toolName: "list_repos" });
});

Deno.test("decodeMcpToolName: falls back to shorter match when longer doesn't apply", () => {
  const result = decodeMcpToolName(
    "mcp_github_list_repos",
    ["github", "github_enterprise"],
  );
  assertEquals(result, { serverId: "github", toolName: "list_repos" });
});

Deno.test("decodeMcpToolName: roundtrips with encodeMcpToolName", () => {
  const encoded = encodeMcpToolName("myserver", "my_tool");
  const decoded = decodeMcpToolName(encoded, ["myserver"]);
  assertEquals(decoded, { serverId: "myserver", toolName: "my_tool" });
});

// --- getMcpToolDefinitions ---

function makeServer(
  id: string,
  tools: readonly McpToolDefinition[],
  classification?: string,
): ConnectedMcpServer {
  return {
    id,
    classification: classification as ConnectedMcpServer["classification"],
    tools,
    server: { callTool: () => Promise.resolve({ ok: true, value: { content: "", classification: "PUBLIC" as const } }) },
    client: {} as ConnectedMcpServer["client"],
    transport: {} as ConnectedMcpServer["transport"],
  };
}

Deno.test("getMcpToolDefinitions: generates definitions with correct names", () => {
  const tools: McpToolDefinition[] = [
    {
      name: "list_repos",
      description: "List repositories",
      inputSchema: {
        type: "object",
        properties: {
          org: { type: "string", description: "Organization name" },
        },
        required: ["org"],
      },
    },
  ];

  const server = makeServer("github", tools, "CONFIDENTIAL");
  const defs = getMcpToolDefinitions([server]);

  assertEquals(defs.length, 1);
  assertEquals(defs[0].name, "mcp_github_list_repos");
  assertEquals(defs[0].description, "[github] List repositories");
  assertEquals(defs[0].parameters.org.type, "string");
  assertEquals(defs[0].parameters.org.required, true);
});

Deno.test("getMcpToolDefinitions: handles multiple servers", () => {
  const server1 = makeServer("github", [
    { name: "list", description: "List repos", inputSchema: { type: "object" } },
  ]);
  const server2 = makeServer("fs", [
    { name: "read", description: "Read file", inputSchema: { type: "object" } },
    { name: "write", description: "Write file", inputSchema: { type: "object" } },
  ]);

  const defs = getMcpToolDefinitions([server1, server2]);
  assertEquals(defs.length, 3);
  assertEquals(defs[0].name, "mcp_github_list");
  assertEquals(defs[1].name, "mcp_fs_read");
  assertEquals(defs[2].name, "mcp_fs_write");
});

Deno.test("getMcpToolDefinitions: empty when no servers", () => {
  assertEquals(getMcpToolDefinitions([]).length, 0);
});

// --- buildMcpToolClassifications ---

Deno.test("buildMcpToolClassifications: maps prefixes correctly", () => {
  const server1 = makeServer("github", [], "CONFIDENTIAL");
  const server2 = makeServer("fs", [], "INTERNAL");

  const map = buildMcpToolClassifications([server1, server2]);
  assertEquals(map.get("mcp_github_"), "CONFIDENTIAL");
  assertEquals(map.get("mcp_fs_"), "INTERNAL");
  assertEquals(map.size, 2);
});

Deno.test("buildMcpToolClassifications: skips servers without classification", () => {
  const server = makeServer("unclassified", []);
  const map = buildMcpToolClassifications([server]);
  assertEquals(map.size, 0);
});

// --- buildMcpSystemPrompt ---

Deno.test("buildMcpSystemPrompt: returns empty string when no servers", () => {
  assertEquals(buildMcpSystemPrompt([]), "");
});

Deno.test("buildMcpSystemPrompt: includes server and tool info", () => {
  const tools: McpToolDefinition[] = [
    {
      name: "list_repos",
      description: "List repos",
      inputSchema: { type: "object" },
    },
  ];
  const server = makeServer("github", tools, "CONFIDENTIAL");
  const prompt = buildMcpSystemPrompt([server]);

  // Should contain the server name and classification
  assertEquals(prompt.includes("github"), true);
  assertEquals(prompt.includes("CONFIDENTIAL"), true);
  // Should contain the namespaced tool name
  assertEquals(prompt.includes("mcp_github_list_repos"), true);
});

Deno.test("buildMcpSystemPrompt: shows 'No tools' for server with empty tool list", () => {
  const server = makeServer("empty", [], "PUBLIC");
  const prompt = buildMcpSystemPrompt([server]);
  assertEquals(prompt.includes("No tools available"), true);
});
