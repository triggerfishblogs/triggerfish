/**
 * MCP Gateway module — secure proxy between agent and MCP servers.
 *
 * @module
 */

export {
  createMcpGateway,
  type GatewayCallOptions,
  type GatewayOptions,
  type GatewayToolResult,
  type McpGateway,
  type McpServer,
  type McpServerToolResult,
  type ServerClassification,
} from "./gateway.ts";

export {
  classifyServer,
  type ClassifyServerOptions,
  type ServerState,
  type ServerStatus,
} from "./classifier.ts";
