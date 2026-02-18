/**
 * MCP Executor — tool dispatch and definition conversion for MCP servers.
 *
 * Tool naming convention: `mcp_<serverId>_<toolName>` prevents collision
 * with the 15+ existing built-in tool subsystems.
 *
 * @module
 */

import type { ClassificationLevel } from "../core/types/classification.ts";
import type { SessionState } from "../core/types/session.ts";
import type { McpGateway } from "./gateway/gateway.ts";
import type { ConnectedMcpServer } from "./manager.ts";

/** Parameter definition for a tool. */
interface ToolParameterDef {
  readonly type: string;
  readonly description: string;
  readonly required?: boolean;
  readonly items?: Readonly<Record<string, unknown>>;
  readonly enum?: readonly string[];
}

/** Tool definition matching the agent orchestrator's ToolDefinition shape. */
export interface McpToolDef {
  readonly name: string;
  readonly description: string;
  readonly parameters: Readonly<Record<string, ToolParameterDef>>;
}

/**
 * Encode a namespaced MCP tool name.
 *
 * @param serverId - The MCP server identifier
 * @param toolName - The tool's original name on the MCP server
 * @returns Namespaced tool name: `mcp_<serverId>_<toolName>`
 */
export function encodeMcpToolName(serverId: string, toolName: string): string {
  return `mcp_${serverId}_${toolName}`;
}

/**
 * Decode a namespaced MCP tool name back to server ID and tool name.
 *
 * Uses longest-match-first to handle overlapping server ID prefixes.
 *
 * @param fullName - The namespaced tool name
 * @param serverIds - Available server IDs to match against
 * @returns Decoded `{serverId, toolName}` or null if not an MCP tool
 */
export function decodeMcpToolName(
  fullName: string,
  serverIds: readonly string[],
): { serverId: string; toolName: string } | null {
  if (!fullName.startsWith("mcp_")) return null;

  const rest = fullName.slice(4); // strip "mcp_"

  // Sort server IDs by length descending for longest-match-first
  const sorted = [...serverIds].sort((a, b) => b.length - a.length);

  for (const id of sorted) {
    const prefix = `${id}_`;
    if (rest.startsWith(prefix)) {
      return {
        serverId: id,
        toolName: rest.slice(prefix.length),
      };
    }
  }

  return null;
}

/** Options for creating an MCP executor. */
export interface McpExecutorOptions {
  readonly gateway: McpGateway;
  /**
   * Live getter for currently connected servers.
   * Called on every tool invocation so newly connected servers are picked up.
   */
  readonly getServers: () => readonly ConnectedMcpServer[];
  readonly getSession: () => SessionState;
}

/**
 * Create an MCP tool executor function.
 *
 * Returns a standard dispatch function `(name, input) => Promise<string | null>`
 * that returns null for non-MCP tools and the tool result text for MCP tools.
 * Uses a live getter for the server list so tools from newly connected servers
 * are available without restarting the session.
 */
export function createMcpExecutor(
  options: McpExecutorOptions,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  const { gateway, getServers, getSession } = options;

  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    // Resolve the live server list on each invocation
    const servers = getServers();
    const serverIds = servers.map((s) => s.id);
    const serverMap = new Map(servers.map((s) => [s.id, s]));

    const decoded = decodeMcpToolName(name, serverIds);
    if (!decoded) return null;

    const server = serverMap.get(decoded.serverId);
    if (!server) return `Error: MCP server '${decoded.serverId}' not found`;

    const serverUri = `mcp://${decoded.serverId}`;
    const result = await gateway.callTool({
      serverUri,
      toolName: decoded.toolName,
      arguments: input,
      session: getSession(),
      mcpServer: server.server,
    });

    if (!result.ok) return `Error: ${result.error}`;

    // Extract text from the gateway result content
    const parts: string[] = [];
    for (const item of result.value.content) {
      if (item.text) parts.push(item.text);
    }
    return parts.join("\n") || "(no output)";
  };
}

/**
 * Convert MCP server tools to ToolDefinition format.
 *
 * Maps each server's McpToolDefinition[] to the agent's ToolDefinition format
 * with namespaced names (`mcp_<serverId>_<toolName>`).
 */
export function getMcpToolDefinitions(
  servers: readonly ConnectedMcpServer[],
): readonly McpToolDef[] {
  const defs: McpToolDef[] = [];

  for (const server of servers) {
    for (const tool of server.tools) {
      const name = encodeMcpToolName(server.id, tool.name);
      // Convert JSON Schema inputSchema to the parameter format
      const parameters: Record<string, ToolParameterDef> = {};
      const schema = tool.inputSchema;
      const properties = (schema.properties ?? {}) as Record<
        string,
        Record<string, unknown>
      >;
      const required = (schema.required ?? []) as readonly string[];

      for (const [propName, propSchema] of Object.entries(properties)) {
        parameters[propName] = {
          type: (propSchema.type as string) ?? "string",
          description: (propSchema.description as string) ?? "",
          required: required.includes(propName),
          ...(propSchema.items
            ? {
              items: propSchema.items as Readonly<Record<string, unknown>>,
            }
            : {}),
          ...(propSchema.enum
            ? { enum: propSchema.enum as readonly string[] }
            : {}),
        };
      }

      defs.push({
        name,
        description: `[${server.id}] ${tool.description}`,
        parameters,
      });
    }
  }

  return defs;
}

/**
 * Build a classification map for MCP tool prefixes.
 *
 * Maps `mcp_<serverId>_` prefixes to their configured classification levels.
 * Tools from servers without a classification are NOT added (default deny).
 */
export function buildMcpToolClassifications(
  servers: readonly ConnectedMcpServer[],
): Map<string, ClassificationLevel> {
  const m = new Map<string, ClassificationLevel>();
  for (const server of servers) {
    if (server.classification) {
      m.set(`mcp_${server.id}_`, server.classification);
    }
  }
  return m;
}

/**
 * Build a system prompt section describing available MCP servers and tools.
 *
 * Returns empty string when no servers are connected.
 */
export function buildMcpSystemPrompt(
  servers: readonly ConnectedMcpServer[],
): string {
  if (servers.length === 0) return "";

  const lines: string[] = [
    "## MCP Servers",
    "",
    "The following external MCP servers are available. Their tools are prefixed with `mcp_<server>_`.",
    "",
  ];

  for (const server of servers) {
    const classification = server.classification ?? "UNCLASSIFIED";
    lines.push(`### ${server.id} (${classification})`);
    if (server.tools.length === 0) {
      lines.push("No tools available.");
    } else {
      for (const tool of server.tools) {
        const fullName = encodeMcpToolName(server.id, tool.name);
        lines.push(`- **${fullName}**: ${tool.description}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}
