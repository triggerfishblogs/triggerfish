/**
 * MCP Protocol — JSON-RPC 2.0 message formatting and MCP client.
 *
 * Implements the Model Context Protocol client with initialization handshake,
 * tool listing, tool invocation, and resource listing.
 */

import type { Transport } from "./transport.ts";

// --- JSON-RPC 2.0 Types ---

/** JSON-RPC 2.0 request object. */
export interface JsonRpcRequest {
  readonly jsonrpc: "2.0";
  readonly method: string;
  readonly id: number;
  readonly params?: Record<string, unknown>;
}

/** JSON-RPC 2.0 error detail. */
export interface JsonRpcError {
  readonly code: number;
  readonly message: string;
  readonly data?: unknown;
}

/** JSON-RPC 2.0 response object. */
export interface JsonRpcResponse {
  readonly jsonrpc: "2.0";
  readonly id: number;
  readonly result?: unknown;
  readonly error?: JsonRpcError;
}

/** JSON-RPC 2.0 notification (no id). */
export interface JsonRpcNotification {
  readonly jsonrpc: "2.0";
  readonly method: string;
  readonly params?: Record<string, unknown>;
}

// --- MCP Types ---

/** Server information returned from MCP initialization. */
export interface McpServerInfo {
  readonly name: string;
  readonly version: string;
}

/** MCP server capabilities. */
export interface McpCapabilities {
  readonly tools?: Record<string, unknown>;
  readonly resources?: Record<string, unknown>;
  readonly prompts?: Record<string, unknown>;
}

/** Result of MCP initialization handshake. */
export interface McpInitializeResult {
  readonly protocolVersion: string;
  readonly capabilities: McpCapabilities;
  readonly serverInfo: McpServerInfo;
}

/** MCP tool definition. */
export interface McpToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, unknown>;
}

/** MCP tool content item. */
export interface McpToolContent {
  readonly type: string;
  readonly text?: string;
  readonly data?: string;
  readonly mimeType?: string;
}

/** MCP tool call result. */
export interface McpToolResult {
  readonly content: readonly McpToolContent[];
  readonly isError?: boolean;
}

/** MCP resource definition. */
export interface McpResource {
  readonly uri: string;
  readonly name: string;
  readonly description?: string;
  readonly mimeType?: string;
}

/** Standard MCP error codes. */
export const MCP_ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
} as const;

// --- JSON-RPC Message Formatting ---

let _nextId = 1;

/**
 * Format a JSON-RPC 2.0 request.
 *
 * @param method - The RPC method name
 * @param params - Optional parameters
 * @param id - Optional request ID; auto-increments if not provided
 */
export function formatRequest(
  method: string,
  params?: Record<string, unknown>,
  id?: number,
): JsonRpcRequest {
  const requestId = id ?? _nextId++;
  // If caller provided an explicit id, make sure auto-increment stays ahead
  if (id !== undefined && id >= _nextId) {
    _nextId = id + 1;
  }
  return {
    jsonrpc: "2.0",
    method,
    id: requestId,
    ...(params !== undefined ? { params } : {}),
  };
}

/**
 * Format a JSON-RPC 2.0 response.
 *
 * @param id - The request ID being responded to
 * @param result - The result value (mutually exclusive with error)
 * @param error - The error object (mutually exclusive with result)
 */
export function formatResponse(
  id: number,
  result?: unknown,
  error?: JsonRpcError,
): JsonRpcResponse {
  if (error !== undefined) {
    return { jsonrpc: "2.0", id, error };
  }
  return { jsonrpc: "2.0", id, result };
}

/**
 * Parse a raw JSON string into a JSON-RPC 2.0 message.
 *
 * @param raw - The raw JSON string to parse
 * @returns Parsed JSON-RPC response
 */
export function parseMessage(raw: string): JsonRpcResponse {
  const parsed = JSON.parse(raw) as JsonRpcResponse;
  return parsed;
}

// --- MCP Client ---

/** MCP Client interface for interacting with MCP servers. */
export interface McpClient {
  /** Perform the MCP initialization handshake. */
  initialize(): Promise<McpInitializeResult>;
  /** List available tools from the MCP server. */
  listTools(): Promise<readonly McpToolDefinition[]>;
  /** Call a tool on the MCP server. */
  callTool(name: string, args: Record<string, unknown>): Promise<McpToolResult>;
  /** List available resources from the MCP server. */
  listResources(): Promise<readonly McpResource[]>;
}

/**
 * Create an MCP client that communicates via the given transport.
 *
 * @param transport - The transport layer to use for communication
 * @param timeoutMs - Timeout for requests in milliseconds (default 30000)
 */
export function createMcpClient(
  transport: Transport,
  timeoutMs = 30000,
): McpClient {
  const pendingRequests = new Map<
    number,
    {
      resolve: (value: JsonRpcResponse) => void;
      reject: (reason: Error) => void;
    }
  >();

  // Register message handler to dispatch responses to pending requests
  transport.onMessage((msg: string) => {
    const response = parseMessage(msg);
    if (response.id !== undefined) {
      const pending = pendingRequests.get(response.id);
      if (pending) {
        pendingRequests.delete(response.id);
        pending.resolve(response);
      }
    }
  });

  /**
   * Send a JSON-RPC request and wait for the matching response.
   */
  async function sendRequest(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<JsonRpcResponse> {
    const request = formatRequest(method, params);
    const promise = new Promise<JsonRpcResponse>((resolve, reject) => {
      pendingRequests.set(request.id, { resolve, reject });

      // Set up timeout
      const timer = setTimeout(() => {
        pendingRequests.delete(request.id);
        reject(new Error(`MCP request timed out after ${timeoutMs}ms: ${method}`));
      }, timeoutMs);

      // Clear timeout when resolved
      const originalResolve = resolve;
      pendingRequests.set(request.id, {
        resolve: (value) => {
          clearTimeout(timer);
          originalResolve(value);
        },
        reject: (reason) => {
          clearTimeout(timer);
          reject(reason);
        },
      });
    });

    await transport.send(JSON.stringify(request));
    return promise;
  }

  return {
    async initialize(): Promise<McpInitializeResult> {
      await transport.connect();

      const response = await sendRequest("initialize", {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "triggerfish", version: "0.1.0" },
      });

      if (response.error) {
        throw new Error(
          `MCP initialization failed: ${response.error.message}`,
        );
      }

      return response.result as McpInitializeResult;
    },

    async listTools(): Promise<readonly McpToolDefinition[]> {
      const response = await sendRequest("tools/list", {});

      if (response.error) {
        throw new Error(`tools/list failed: ${response.error.message}`);
      }

      const result = response.result as { tools: McpToolDefinition[] };
      return result.tools;
    },

    async callTool(
      name: string,
      args: Record<string, unknown>,
    ): Promise<McpToolResult> {
      const response = await sendRequest("tools/call", { name, arguments: args });

      if (response.error) {
        throw new Error(`tools/call failed: ${response.error.message}`);
      }

      return response.result as McpToolResult;
    },

    async listResources(): Promise<readonly McpResource[]> {
      const response = await sendRequest("resources/list", {});

      if (response.error) {
        throw new Error(`resources/list failed: ${response.error.message}`);
      }

      const result = response.result as { resources: McpResource[] };
      return result.resources;
    },
  };
}
