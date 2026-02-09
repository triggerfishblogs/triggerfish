/**
 * MCP Gateway — secure proxy between agent and MCP servers.
 *
 * Intercepts all tool calls and responses, enforcing policy checks via hooks.
 * Servers must be in CLASSIFIED state before tool calls are permitted.
 * UNTRUSTED and BLOCKED servers are always rejected.
 *
 * @module
 */

import type { Result, ClassificationLevel } from "../../core/types/classification.ts";
import type { SessionState } from "../../core/types/session.ts";
import type { HookRunner } from "../../core/policy/hooks.ts";
import type { McpToolResult } from "../client/protocol.ts";
import type { ServerStatus } from "./classifier.ts";

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
}

/** Options for creating an MCP gateway. */
export interface GatewayOptions {
  readonly hookRunner: HookRunner;
  /** Mock tool response for testing without a real MCP server. */
  readonly mockToolResponse?: McpToolResult;
}

/** MCP Gateway interface for secure tool invocation. */
export interface McpGateway {
  /** Register an MCP server with its classification state. */
  registerServer(server: ServerClassification): void;
  /** Call a tool on a registered MCP server, subject to policy enforcement. */
  callTool(options: GatewayCallOptions): Promise<Result<McpToolResult, string>>;
}

/**
 * Create an MCP Gateway that enforces policy on all tool calls.
 *
 * The gateway sits between the agent and MCP servers, intercepting all
 * tool calls and responses. It fires MCP_TOOL_CALL hooks for classification
 * checks and rejects calls to UNTRUSTED or BLOCKED servers.
 *
 * @param options - Hook runner and optional mock response for testing
 * @returns An McpGateway instance
 */
export function createMcpGateway(options: GatewayOptions): McpGateway {
  const { hookRunner, mockToolResponse } = options;
  const servers = new Map<string, ServerClassification>();

  return {
    registerServer(server: ServerClassification): void {
      servers.set(server.uri, server);
    },

    async callTool(callOptions: GatewayCallOptions): Promise<Result<McpToolResult, string>> {
      const { serverUri, toolName, session } = callOptions;
      const server = servers.get(serverUri);

      // Unknown server
      if (!server) {
        await hookRunner.run("MCP_TOOL_CALL", {
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
      await hookRunner.run("MCP_TOOL_CALL", {
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
      if (mockToolResponse) {
        return { ok: true, value: mockToolResponse };
      }

      // No real MCP client connected — cannot execute
      return { ok: false, error: `No MCP client available for server: ${server.name}` };
    },
  };
}
