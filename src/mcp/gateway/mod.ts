/**
 * MCP Gateway module — secure proxy between agent and MCP servers.
 *
 * @module
 */

export {
  createMcpGateway,
  type ServerClassification,
  type GatewayCallOptions,
  type GatewayOptions,
  type GatewayToolResult,
  type McpGateway,
  type McpServer,
  type McpServerToolResult,
} from "./gateway.ts";

export {
  classifyServer,
  type ServerState,
  type ServerStatus,
  type ClassifyServerOptions,
} from "./classifier.ts";
