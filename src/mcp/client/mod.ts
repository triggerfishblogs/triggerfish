/**
 * MCP Client Core module.
 *
 * Provides JSON-RPC 2.0 message formatting, MCP protocol client,
 * and transport layer abstractions for communicating with MCP servers.
 *
 * @module
 */

export {
  createMcpClient,
  formatRequest,
  formatResponse,
  MCP_ERROR_CODES,
  parseMessage,
} from "./protocol.ts";

export type {
  JsonRpcError,
  JsonRpcNotification,
  JsonRpcRequest,
  JsonRpcResponse,
  McpCapabilities,
  McpClient,
  McpInitializeResult,
  McpResource,
  McpServerInfo,
  McpToolContent,
  McpToolDefinition,
  McpToolResult,
} from "./protocol.ts";

export { SSETransport, StdioTransport } from "./transport.ts";

export type { Transport, UrlValidator } from "./transport.ts";
