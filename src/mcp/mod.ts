/**
 * MCP module — client, gateway, and server management for Model Context Protocol.
 *
 * @module
 */

export {
  formatRequest,
  formatResponse,
  parseMessage,
  createMcpClient,
  MCP_ERROR_CODES,
} from "./client/mod.ts";

export {
  createMcpGateway,
  classifyServer,
} from "./gateway/mod.ts";

export {
  createMcpServerManager,
  resolveEnvVars,
  createMcpServerAdapter,
} from "./manager.ts";

export type {
  McpServerConfig,
  ConnectedMcpServer,
  McpServerManager,
} from "./manager.ts";

export {
  encodeMcpToolName,
  decodeMcpToolName,
  createMcpExecutor,
  getMcpToolDefinitions,
  buildMcpToolClassifications,
  buildMcpSystemPrompt,
} from "./executor.ts";

export type {
  McpToolDef,
  McpExecutorOptions,
} from "./executor.ts";
