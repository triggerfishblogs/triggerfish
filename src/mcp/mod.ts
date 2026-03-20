/**
 * MCP module — client, gateway, and server management for Model Context Protocol.
 *
 * @module
 */

export {
  createMcpClient,
  formatRequest,
  formatResponse,
  MCP_ERROR_CODES,
  parseMessage,
} from "./client/mod.ts";

export { classifyServer, createMcpGateway } from "./gateway/mod.ts";

export {
  createMcpServerAdapter,
  createMcpServerManager,
  resolveEnvVars,
} from "./manager.ts";

export type {
  ConnectedMcpServer,
  McpServerConfig,
  McpServerManager,
  McpServerState,
  McpServerStatus,
} from "./manager.ts";

export {
  buildMcpSystemPrompt,
  buildMcpToolClassifications,
  createMcpExecutor,
  decodeMcpToolName,
  encodeMcpToolName,
  getMcpToolDefinitions,
} from "./executor.ts";

export type { McpExecutorOptions, McpToolDef } from "./executor.ts";
