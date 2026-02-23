/**
 * JSON-RPC 2.0 types and message formatting for the MCP protocol.
 *
 * Defines the wire-format types (request, response, error, notification)
 * and provides stateful request formatting with auto-incrementing IDs.
 *
 * @module
 */

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
