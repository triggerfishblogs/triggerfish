/**
 * MCP Server Manager — lifecycle management for configured MCP servers.
 *
 * Factory for McpServerManager that owns the full lifecycle: env resolution,
 * transport creation, connection, initialization, tool discovery, and
 * disconnection. Implementation details are split across:
 *
 * - `manager_env.ts` — env var resolution and server adapter
 * - `manager_connection.ts` — connection, disconnect, and status notification
 * - `manager_retry.ts` — health polling, retry loops, and server startup
 * - `manager_types.ts` — types and interfaces
 *
 * @module
 */

import { createLogger } from "../core/logger/mod.ts";
import type { McpServerManager } from "./manager_types.ts";
import {
  buildMcpManagerState,
  connectAllMcpServers,
  disconnectAllMcpServers,
} from "./manager_connection.ts";
import { startAllMcpServers } from "./manager_retry.ts";

// ─── Barrel re-exports ───────────────────────────────────────────────────────

export { resolveEnvVars, createMcpServerAdapter } from "./manager_env.ts";
export {
  validateMcpCommand,
  DEFAULT_ALLOWED_MCP_COMMANDS,
} from "./manager_connection.ts";

export type {
  ConnectedMcpServer,
  McpServerConfig,
  McpServerManager,
  McpServerState,
  McpServerStatus,
} from "./manager_types.ts";

// ─── Manager factory ─────────────────────────────────────────────────────────

/**
 * Create an McpServerManager instance.
 *
 * Owns the full lifecycle: env resolution, transport creation, connection,
 * initialization, tool discovery, and disconnection.
 */
export function createMcpServerManager(): McpServerManager {
  const mcpLog = createLogger("mcp");
  const state = buildMcpManagerState();

  return {
    async connectAll(configs, secretStore?) {
      const ctx = { secretStore, mcpLog, state };
      state.connected = await connectAllMcpServers(configs, ctx);
      return state.connected;
    },
    disconnectAll: () => disconnectAllMcpServers(state),
    getConnected: () => state.connected,
    startAll: (configs, secretStore?) =>
      startAllMcpServers(configs, { secretStore, mcpLog, state }),
    getStatus: () => Array.from(state.statusMap.values()),
    getConfiguredCount: () => state.configuredCount,
    onStatusChange(cb) {
      state.statusListeners.add(cb);
      return () => state.statusListeners.delete(cb);
    },
  };
}
