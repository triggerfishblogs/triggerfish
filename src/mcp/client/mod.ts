/**
 * MCP Client Core module.
 *
 * Provides JSON-RPC 2.0 message formatting, MCP protocol client,
 * and transport layer abstractions for communicating with MCP servers.
 *
 * @module
 */

export {
  formatRequest,
  formatResponse,
  parseMessage,
  createMcpClient,
  MCP_ERROR_CODES,
} from "./protocol.ts";

export type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  JsonRpcNotification,
  McpClient,
  McpInitializeResult,
  McpServerInfo,
  McpCapabilities,
  McpToolDefinition,
  McpToolContent,
  McpToolResult,
  McpResource,
} from "./protocol.ts";

export { StdioTransport, SSETransport } from "./transport.ts";

export type { Transport, UrlValidator } from "./transport.ts";
