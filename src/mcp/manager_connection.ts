/**
 * MCP Manager — connection lifecycle and disconnect logic.
 *
 * Handles single-server connection, bulk connect/disconnect,
 * status change notification, and manager state.
 *
 * @module
 */

import { createLogger } from "../core/logger/mod.ts";
import type { SecretStore } from "../core/secrets/keychain/keychain.ts";
import type { Transport } from "./client/transport.ts";
import { SSETransport, StdioTransport } from "./client/transport.ts";
import { createMcpClient } from "./client/protocol.ts";
import type { McpClient } from "./client/protocol.ts";
import { resolveEnvVars, createMcpServerAdapter } from "./manager_env.ts";
import type {
  ConnectedMcpServer,
  McpServerConfig,
  McpServerStatus,
} from "./manager_types.ts";

// ─── Types ───────────────────────────────────────────────────────────────────

/** Mutable state container for the MCP server manager. */
export interface McpManagerState {
  connected: ConnectedMcpServer[];
  configuredCount: number;
  readonly statusMap: Map<string, McpServerStatus>;
  readonly statusListeners: Set<(status: readonly McpServerStatus[]) => void>;
}

/** Shared context threaded through connection operations. */
export interface McpConnectionContext {
  readonly secretStore: SecretStore | undefined;
  readonly mcpLog: ReturnType<typeof createLogger>;
  readonly state: McpManagerState;
}

// ─── State factory ───────────────────────────────────────────────────────────

/** Build the initial mutable state for an MCP server manager. */
export function buildMcpManagerState(): McpManagerState {
  return {
    connected: [],
    configuredCount: 0,
    statusMap: new Map(),
    statusListeners: new Set(),
  };
}

// ─── Single-server connection ────────────────────────────────────────────────

/** Create the appropriate transport for an MCP server config. */
function createTransportForConfig(
  cfg: McpServerConfig,
  resolvedEnv: Record<string, string> | undefined,
): Transport {
  if (cfg.command) {
    return new StdioTransport(cfg.command, cfg.args ?? [], resolvedEnv);
  }
  return new SSETransport(cfg.url!);
}

/** Assemble a ConnectedMcpServer from a live client and transport. */
function assembleConnectedServer(
  cfg: McpServerConfig,
  client: McpClient,
  transport: Transport,
): ConnectedMcpServer {
  return {
    id: cfg.id,
    classification: cfg.classification,
    tools: [],
    server: createMcpServerAdapter(client, cfg.classification),
    client,
    transport,
  };
}

/** Connect to a single configured MCP server. Returns ConnectedMcpServer or throws. */
export async function connectOneMcpServer(
  cfg: McpServerConfig,
  ctx: McpConnectionContext,
): Promise<ConnectedMcpServer> {
  const resolvedEnv = cfg.env
    ? await resolveEnvVars(cfg.env, ctx.secretStore)
    : undefined;

  const transport = createTransportForConfig(cfg, resolvedEnv);
  const client = createMcpClient(transport);
  await client.initialize();
  const tools = await client.listTools();

  ctx.mcpLog.info(
    `MCP server '${cfg.id}' connected (${tools.length} tools)`,
  );
  const entry = assembleConnectedServer(cfg, client, transport);
  return { ...entry, tools };
}

// ─── Bulk connect ────────────────────────────────────────────────────────────

/** Attempt to connect to all enabled MCP servers sequentially. */
export async function connectAllMcpServers(
  configs: readonly McpServerConfig[],
  ctx: McpConnectionContext,
): Promise<ConnectedMcpServer[]> {
  const results: ConnectedMcpServer[] = [];
  for (const cfg of configs) {
    if (cfg.enabled === false) continue;
    if (!cfg.command && !cfg.url) {
      ctx.mcpLog.warn(
        `MCP server '${cfg.id}': no command or url — skipping`,
      );
      continue;
    }
    try {
      results.push(await connectOneMcpServer(cfg, ctx));
    } catch (err: unknown) {
      ctx.mcpLog.warn(
        `MCP server '${cfg.id}' failed to connect: ${formatMcpConnectionError(err)}`,
      );
    }
  }
  return results;
}

// ─── Status notification ─────────────────────────────────────────────────────

/** Notify all status listeners and sync the connected array. */
export function notifyMcpStatusListeners(state: McpManagerState): void {
  const statuses = Array.from(state.statusMap.values());
  for (const cb of state.statusListeners) {
    try {
      cb(statuses);
    } catch { /* Listeners must not throw */ }
  }
  state.connected = statuses
    .filter((s) => s.state === "connected" && s.server !== undefined)
    .map((s) => s.server!);
}

// ─── Error formatting ────────────────────────────────────────────────────────

/** Format an MCP connection error with optional stack trace. */
export function formatMcpConnectionError(err: unknown): string {
  return err instanceof Error
    ? `${err.message}${err.stack ? "\n" + err.stack : ""}`
    : String(err);
}

// ─── Disconnect ──────────────────────────────────────────────────────────────

/** Disconnect all transports and mark all servers as disconnected. */
export async function disconnectAllMcpServers(
  state: McpManagerState,
): Promise<void> {
  for (const entry of state.connected) {
    try {
      await entry.transport.disconnect();
    } catch { /* Best-effort */ }
  }
  markAllMcpServersDisconnected(state);
}

/** Mark every server in the status map as disconnected. */
function markAllMcpServersDisconnected(state: McpManagerState): void {
  for (const [id, status] of state.statusMap.entries()) {
    state.statusMap.set(id, {
      ...status,
      state: "disconnected",
      server: undefined,
    });
  }
  state.connected = [];
  notifyMcpStatusListeners(state);
}
