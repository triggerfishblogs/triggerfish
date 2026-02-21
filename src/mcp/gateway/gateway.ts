/**
 * MCP Gateway — secure proxy between agent and MCP servers.
 *
 * Intercepts all tool calls and responses, enforcing policy checks via hooks.
 * Servers must be in CLASSIFIED state before tool calls are permitted.
 * UNTRUSTED and BLOCKED servers are always rejected.
 *
 * When a lineageStore is provided, tool responses create lineage records and
 * the result includes session taint and lineage tracking metadata.
 *
 * @module
 */

import type { Result, ClassificationLevel } from "../../core/types/classification.ts";
import { maxClassification } from "../../core/types/classification.ts";
import type { SessionState } from "../../core/types/session.ts";
import type { HookRunner } from "../../core/policy/hooks.ts";
import type { McpToolResult } from "../client/protocol.ts";
import type { ServerStatus } from "./classifier.ts";
import type { LineageStore } from "../../core/session/lineage.ts";

/** Interface for an MCP server that can execute tool calls. */
export interface McpServer {
  /** Call a tool by name with arguments. */
  callTool(
    name: string,
    args: Record<string, unknown>,
  ): Promise<Result<McpServerToolResult, string>>;
}

/** Result from an MCP server tool call. */
export interface McpServerToolResult {
  readonly content: string;
  readonly classification: ClassificationLevel;
  readonly entries?: readonly {
    readonly name: string;
    readonly size: number;
    readonly isDirectory: boolean;
  }[];
}

/** Server classification entry registered with the gateway. */
export interface ServerClassification {
  readonly uri: string;
  readonly name: string;
  readonly status: ServerStatus;
  readonly classification?: ClassificationLevel;
}

/** Options for calling a tool through the gateway. */
export interface GatewayCallOptions {
  readonly serverUri: string;
  readonly toolName: string;
  readonly arguments: Record<string, unknown>;
  readonly session: SessionState;
  /** Optional MCP server to call directly (bypasses transport layer). */
  readonly mcpServer?: McpServer;
}

/** Options for creating an MCP gateway. */
export interface GatewayOptions {
  readonly hookRunner: HookRunner;
  /** Mock tool response for testing without a real MCP server. */
  readonly mockToolResponse?: McpToolResult;
  /** Lineage store for recording data provenance on tool responses. */
  readonly lineageStore?: LineageStore;
}

/** Enhanced tool result with taint and lineage tracking. */
export interface GatewayToolResult extends McpToolResult {
  /** Session taint level after this tool call. */
  readonly sessionTaint?: ClassificationLevel;
  /** Lineage record ID created for this tool response. */
  readonly lineageId?: string;
}

/** MCP Gateway interface for secure tool invocation. */
export interface McpGateway {
  /** Register an MCP server with its classification state. */
  registerServer(server: ServerClassification): void;
  /** Call a tool on a registered MCP server, subject to policy enforcement. */
  callTool(options: GatewayCallOptions): Promise<Result<GatewayToolResult, string>>;
}

/**
 * Create an MCP Gateway that enforces policy on all tool calls.
 *
 * The gateway sits between the agent and MCP servers, intercepting all
 * tool calls and responses. It fires MCP_TOOL_CALL hooks for classification
 * checks and rejects calls to UNTRUSTED or BLOCKED servers.
 *
 * When a lineageStore is provided and a tool call succeeds, the gateway
 * creates a lineage record and returns the session taint and lineage ID.
 *
 * @param options - Hook runner, optional mock response, and optional lineage store
 * @returns An McpGateway instance
 */
export function createMcpGateway(options: GatewayOptions): McpGateway {
  const { hookRunner, mockToolResponse, lineageStore } = options;
  const servers = new Map<string, ServerClassification>();

  return {
    registerServer(server: ServerClassification): void {
      servers.set(server.uri, server);
    },

    async callTool(
      callOptions: GatewayCallOptions,
    ): Promise<Result<GatewayToolResult, string>> {
      const { serverUri, toolName, session, mcpServer } = callOptions;
      const server = servers.get(serverUri);

      // Unknown server
      if (!server) {
        await hookRunner.evaluateHook("MCP_TOOL_CALL", {
          session,
          input: {
            server_uri: serverUri,
            tool_name: toolName,
            server_status: "UNKNOWN",
          },
        });
        return { ok: false, error: `Server not registered: ${serverUri}` };
      }

      // Fire MCP_TOOL_CALL hook for logging/policy
      await hookRunner.evaluateHook("MCP_TOOL_CALL", {
        session,
        input: {
          server_uri: serverUri,
          tool_name: toolName,
          server_status: server.status,
          server_classification: server.classification,
        },
      });

      // Pre-flight: reject UNTRUSTED servers
      if (server.status === "UNTRUSTED") {
        return { ok: false, error: `Server is UNTRUSTED: ${server.name}` };
      }

      // Pre-flight: reject BLOCKED servers
      if (server.status === "BLOCKED") {
        return { ok: false, error: `Server is BLOCKED: ${server.name}` };
      }

      // Server is CLASSIFIED — proceed with tool call

      // If an mcpServer is provided, call through it
      if (mcpServer) {
        const toolResult = await mcpServer.callTool(
          toolName,
          callOptions.arguments,
        );
        if (!toolResult.ok) {
          return { ok: false, error: toolResult.error };
        }

        const responseClassification = toolResult.value.classification;
        const sessionTaint = maxClassification(
          session.taint,
          responseClassification,
        );

        // Build base gateway tool result
        const baseResult: GatewayToolResult = {
          content: [{ type: "text", text: toolResult.value.content }],
          sessionTaint,
        };

        // Create lineage record if store is available
        if (lineageStore) {
          const lineageRecord = await lineageStore.create({
            content: toolResult.value.content,
            origin: {
              source_type: "mcp_server",
              source_name: server.name,
              accessed_at: new Date().toISOString(),
              accessed_by: session.userId as string,
              access_method: toolName,
            },
            classification: {
              level: responseClassification,
              reason: `Data from ${server.name} (${server.classification})`,
            },
            sessionId: session.id,
          });

          return {
            ok: true,
            value: { ...baseResult, lineageId: lineageRecord.lineage_id },
          };
        }

        return { ok: true, value: baseResult };
      }

      // Fall back to mock response
      if (mockToolResponse) {
        return { ok: true, value: mockToolResponse };
      }

      // No real MCP client connected — cannot execute
      return {
        ok: false,
        error: `No MCP client available for server: ${server.name}`,
      };
    },
  };
}
