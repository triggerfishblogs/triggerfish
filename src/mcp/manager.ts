/**
 * MCP Server Manager — lifecycle management for configured MCP servers.
 *
 * Handles env var resolution (including `keychain:` prefix for OS keychain),
 * transport creation, connection, initialization, tool discovery, and
 * bridging to the gateway's McpServer interface.
 *
 * Types and interfaces live in `manager_types.ts`.
 *
 * @module
 */

import { createLogger } from "../core/logger/mod.ts";
import type {
  ClassificationLevel,
  Result,
} from "../core/types/classification.ts";
import type { SecretStore } from "../core/secrets/keychain.ts";
import type { McpClient } from "./client/protocol.ts";
import type { McpServer, McpServerToolResult } from "./gateway/gateway.ts";
import { SSETransport, StdioTransport } from "./client/transport.ts";
import type { Transport } from "./client/transport.ts";
import { createMcpClient } from "./client/protocol.ts";
import type {
  ConnectedMcpServer,
  McpServerConfig,
  McpServerManager,
  McpServerStatus,
} from "./manager_types.ts";

// ─── Barrel re-exports from manager_types.ts ─────────────────────────────────

export type {
  ConnectedMcpServer,
  McpServerConfig,
  McpServerManager,
  McpServerState,
  McpServerStatus,
} from "./manager_types.ts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Resolve env var values, expanding `keychain:` prefixed values via SecretStore.
 *
 * Plain string values are passed through as-is. Values starting with `keychain:`
 * are looked up in the OS keychain. Failed lookups are skipped with a warning.
 */
export async function resolveEnvVars(
  env: Readonly<Record<string, string>>,
  secretStore?: SecretStore,
): Promise<Record<string, string>> {
  const resolved: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (value.startsWith("keychain:") && secretStore) {
      const secretName = value.slice("keychain:".length);
      const result = await secretStore.getSecret(secretName);
      if (result.ok) {
        resolved[key] = result.value;
      } else {
        createLogger("mcp").warn(
          `env: could not resolve keychain secret '${secretName}' for ${key}: ${result.error}`,
        );
      }
    } else if (value.startsWith("keychain:")) {
      createLogger("mcp").warn(
        `env: keychain: prefix used for ${key} but no SecretStore available`,
      );
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}

/**
 * Create an McpServer adapter that bridges an McpClient to the gateway's
 * McpServer interface. Wraps callTool in try/catch to return Result.
 */
export function createMcpServerAdapter(
  client: McpClient,
  classification: ClassificationLevel | undefined,
): McpServer {
  return {
    async callTool(
      name: string,
      args: Record<string, unknown>,
    ): Promise<Result<McpServerToolResult, string>> {
      try {
        const result = await client.callTool(name, args);
        // Extract text content from the MCP tool result
        const textParts: string[] = [];
        for (const item of result.content) {
          if (item.text) {
            textParts.push(item.text);
          }
        }
        const content = textParts.join("\n");
        return {
          ok: true,
          value: {
            content,
            classification: classification ?? ("PUBLIC" as ClassificationLevel),
          },
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: `MCP tool call failed: ${message}` };
      }
    },
  };
}

// ─── Connection helpers ──────────────────────────────────────────────────────

/** Attempt to connect to a single configured MCP server. Returns ConnectedMcpServer or throws. */
async function connectOne(
  cfg: McpServerConfig,
  secretStore: SecretStore | undefined,
  mcpLog: ReturnType<typeof createLogger>,
): Promise<ConnectedMcpServer> {
  // Resolve env vars (including keychain: prefixed values)
  const resolvedEnv = cfg.env
    ? await resolveEnvVars(cfg.env, secretStore)
    : undefined;

  // Create transport
  let transport: Transport;
  if (cfg.command) {
    transport = new StdioTransport(
      cfg.command,
      cfg.args ?? [],
      resolvedEnv,
    );
  } else {
    transport = new SSETransport(cfg.url!);
  }

  // Create client, connect, and initialize
  const client = createMcpClient(transport);
  await client.initialize();

  // Discover tools
  const tools = await client.listTools();

  // Create McpServer adapter for the gateway
  const server = createMcpServerAdapter(client, cfg.classification);

  const entry: ConnectedMcpServer = {
    id: cfg.id,
    classification: cfg.classification,
    tools,
    server,
    client,
    transport,
  };

  mcpLog.info(
    `MCP server '${cfg.id}' connected (${tools.length} tools)`,
  );

  return entry;
}

// ─── Manager implementation ──────────────────────────────────────────────────

/**
 * Create an McpServerManager instance.
 *
 * Owns the full lifecycle: env resolution, transport creation, connection,
 * initialization, tool discovery, and disconnection.
 */
/** Format an MCP connection error with optional stack trace. */
function formatMcpConnectionError(err: unknown): string {
  return err instanceof Error
    ? `${err.message}${err.stack ? "\n" + err.stack : ""}`
    : String(err);
}

/** Poll until an MCP server transport disconnects or is externally marked disconnected. */
async function pollMcpServerHealth(
  serverId: string,
  entry: ConnectedMcpServer,
  statusMap: Map<string, McpServerStatus>,
): Promise<void> {
  while (true) {
    await new Promise<void>((resolve) => setTimeout(resolve, 5000));
    const current = statusMap.get(serverId);
    if (!current || current.state !== "connected") return;
    try {
      await entry.client.listTools();
    } catch {
      return;
    }
  }
}

/** Attempt to connect to all enabled MCP servers sequentially. */
async function connectAllMcpServers(
  configs: readonly McpServerConfig[],
  secretStore: SecretStore | undefined,
  mcpLog: ReturnType<typeof createLogger>,
): Promise<ConnectedMcpServer[]> {
  const results: ConnectedMcpServer[] = [];
  for (const cfg of configs) {
    if (cfg.enabled === false) continue;
    if (!cfg.command && !cfg.url) {
      mcpLog.warn(`MCP server '${cfg.id}': no command or url — skipping`);
      continue;
    }
    try {
      results.push(await connectOne(cfg, secretStore, mcpLog));
    } catch (err: unknown) {
      mcpLog.warn(
        `MCP server '${cfg.id}' failed to connect: ${
          formatMcpConnectionError(err)
        }`,
      );
    }
  }
  return results;
}

/** Mutable state container for the MCP server manager. */
interface McpManagerState {
  connected: ConnectedMcpServer[];
  configuredCount: number;
  readonly statusMap: Map<string, McpServerStatus>;
  readonly statusListeners: Set<(status: readonly McpServerStatus[]) => void>;
}

/** Notify all status listeners and sync the connected array. */
function notifyMcpStatusListeners(state: McpManagerState): void {
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

/** Background retry loop for a single MCP server with exponential backoff. */
async function runMcpRetryLoop(
  cfg: McpServerConfig,
  secretStore: SecretStore | undefined,
  mcpLog: ReturnType<typeof createLogger>,
  state: McpManagerState,
): Promise<void> {
  let delay = 2000;
  while (true) {
    state.statusMap.set(cfg.id, {
      id: cfg.id,
      config: cfg,
      state: "connecting",
    });
    notifyMcpStatusListeners(state);
    try {
      const entry = await connectOne(cfg, secretStore, mcpLog);
      state.statusMap.set(cfg.id, {
        id: cfg.id,
        config: cfg,
        state: "connected",
        server: entry,
      });
      notifyMcpStatusListeners(state);
      delay = 2000;
      await pollMcpServerHealth(cfg.id, entry, state.statusMap);
      mcpLog.warn(`MCP server '${cfg.id}' disconnected — reconnecting`);
      state.statusMap.set(cfg.id, {
        id: cfg.id,
        config: cfg,
        state: "disconnected",
      });
      notifyMcpStatusListeners(state);
    } catch (err: unknown) {
      const message = formatMcpConnectionError(err);
      mcpLog.warn(
        `MCP server '${cfg.id}' failed to connect: ${message} — retrying in ${delay}ms`,
      );
      state.statusMap.set(cfg.id, {
        id: cfg.id,
        config: cfg,
        state: "disconnected",
        lastError: message,
      });
      notifyMcpStatusListeners(state);
    }
    await new Promise<void>((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 2, 30000);
  }
}

export function createMcpServerManager(): McpServerManager {
  const mcpLog = createLogger("mcp");
  const state: McpManagerState = {
    connected: [],
    configuredCount: 0,
    statusMap: new Map(),
    statusListeners: new Set(),
  };

  return {
    async connectAll(
      configs,
      secretStore?,
    ): Promise<readonly ConnectedMcpServer[]> {
      state.connected = await connectAllMcpServers(
        configs,
        secretStore,
        mcpLog,
      );
      return state.connected;
    },

    async disconnectAll(): Promise<void> {
      for (const entry of state.connected) {
        try {
          await entry.transport.disconnect();
        } catch { /* Best-effort */ }
      }
      for (const [id, status] of state.statusMap.entries()) {
        state.statusMap.set(id, {
          ...status,
          state: "disconnected",
          server: undefined,
        });
      }
      state.connected = [];
      notifyMcpStatusListeners(state);
    },

    getConnected: () => state.connected,

    startAll(configs, secretStore?): void {
      const activeConfigs = configs.filter((cfg) => cfg.enabled !== false);
      state.configuredCount = activeConfigs.length;
      for (const cfg of activeConfigs) {
        if (!cfg.command && !cfg.url) {
          mcpLog.warn(`MCP server '${cfg.id}': no command or url — skipping`);
          state.statusMap.set(cfg.id, {
            id: cfg.id,
            config: cfg,
            state: "failed",
            lastError: "no command or url configured",
          });
          continue;
        }
        runMcpRetryLoop(cfg, secretStore, mcpLog, state).catch(
          (err: unknown) => {
            mcpLog.error(
              `MCP retry loop for '${cfg.id}' crashed: ${
                err instanceof Error ? err.message : String(err)
              }`,
            );
          },
        );
      }
    },

    getStatus: () => Array.from(state.statusMap.values()),
    getConfiguredCount: () => state.configuredCount,

    onStatusChange(cb): () => void {
      state.statusListeners.add(cb);
      return () => {
        state.statusListeners.delete(cb);
      };
    },
  };
}
