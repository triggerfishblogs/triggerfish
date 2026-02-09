/**
 * MCP module — client and gateway for Model Context Protocol.
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
