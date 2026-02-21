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
import type { Result, ClassificationLevel } from "../core/types/classification.ts";
import type { SecretStore } from "../core/secrets/keychain.ts";
import type { McpClient } from "./client/protocol.ts";
import type { McpServer, McpServerToolResult } from "./gateway/gateway.ts";
import { StdioTransport, SSETransport } from "./client/transport.ts";
import type { Transport } from "./client/transport.ts";
import { createMcpClient } from "./client/protocol.ts";
import type {
  McpServerConfig,
  ConnectedMcpServer,
  McpServerManager,
  McpServerStatus,
} from "./manager_types.ts";

// ─── Barrel re-exports from manager_types.ts ─────────────────────────────────

export type {
  McpServerConfig,
  ConnectedMcpServer,
  McpServerState,
  McpServerStatus,
  McpServerManager,
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
export function createMcpServerManager(): McpServerManager {
  const mcpLog = createLogger("mcp");
  let connected: ConnectedMcpServer[] = [];

  // State for startAll / background connection loops
  const statusMap = new Map<string, McpServerStatus>();
  const statusListeners = new Set<(status: readonly McpServerStatus[]) => void>();
  let configuredCount = 0;

  function notifyListeners(): void {
    const statuses = Array.from(statusMap.values());
    for (const cb of statusListeners) {
      try {
        cb(statuses);
      } catch {
        // Listeners must not throw
      }
    }
    // Keep connected array in sync
    connected = statuses
      .filter((s) => s.state === "connected" && s.server !== undefined)
      .map((s) => s.server!);
  }

  /**
   * Background retry loop for a single server.
   * Uses exponential backoff: 2s -> 4s -> 8s -> 30s max.
   */
  async function startRetryLoop(
    cfg: McpServerConfig,
    secretStore: SecretStore | undefined,
  ): Promise<void> {
    let delay = 2000;

    while (true) {
      // Update state to "connecting"
      statusMap.set(cfg.id, {
        id: cfg.id,
        config: cfg,
        state: "connecting",
      });
      notifyListeners();

      try {
        const entry = await connectOne(cfg, secretStore, mcpLog);

        statusMap.set(cfg.id, {
          id: cfg.id,
          config: cfg,
          state: "connected",
          server: entry,
        });
        notifyListeners();
        delay = 2000; // Reset backoff on success

        // Wait for transport disconnection by polling getConnected or transport close
        // We poll periodically — when the server drops out of connected, we re-attempt
        await waitForDisconnect(cfg.id, entry);

        mcpLog.warn(`MCP server '${cfg.id}' disconnected — reconnecting`);
        statusMap.set(cfg.id, {
          id: cfg.id,
          config: cfg,
          state: "disconnected",
        });
        notifyListeners();
      } catch (err: unknown) {
        const message = err instanceof Error
          ? `${err.message}${err.stack ? "\n" + err.stack : ""}`
          : String(err);
        mcpLog.warn(
          `MCP server '${cfg.id}' failed to connect: ${message} — retrying in ${delay}ms`,
        );
        statusMap.set(cfg.id, {
          id: cfg.id,
          config: cfg,
          state: "disconnected",
          lastError: message,
        });
        notifyListeners();
      }

      // Wait before next attempt
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 30000);
    }
  }

  /**
   * Wait until the transport signals disconnection.
   * Polls every 5 seconds to check if transport is still alive.
   */
  async function waitForDisconnect(
    serverId: string,
    _entry: ConnectedMcpServer,
  ): Promise<void> {
    // Poll until this server is no longer in the connected state in statusMap
    while (true) {
      await new Promise<void>((resolve) => setTimeout(resolve, 5000));
      const current = statusMap.get(serverId);
      // If the status was externally updated to disconnected (e.g. by disconnectAll), exit
      if (!current || current.state !== "connected") {
        return;
      }
      // Try a lightweight check: if we can't list tools, the transport dropped
      try {
        await _entry.client.listTools();
      } catch {
        return;
      }
    }
  }

  return {
    async connectAll(
      configs: readonly McpServerConfig[],
      secretStore?: SecretStore,
    ): Promise<readonly ConnectedMcpServer[]> {
      const results: ConnectedMcpServer[] = [];

      for (const cfg of configs) {
        // Skip disabled servers
        if (cfg.enabled === false) {
          continue;
        }

        // Must have either command or url
        if (!cfg.command && !cfg.url) {
          mcpLog.warn(`MCP server '${cfg.id}': no command or url — skipping`);
          continue;
        }

        try {
          const entry = await connectOne(cfg, secretStore, mcpLog);
          results.push(entry);
        } catch (err: unknown) {
          const message = err instanceof Error
            ? `${err.message}${err.stack ? "\n" + err.stack : ""}`
            : String(err);
          mcpLog.warn(
            `MCP server '${cfg.id}' failed to connect: ${message}`,
          );
        }
      }

      connected = results;
      return results;
    },

    async disconnectAll(): Promise<void> {
      for (const entry of connected) {
        try {
          await entry.transport.disconnect();
        } catch {
          // Best-effort cleanup
        }
      }
      // Mark all as disconnected
      for (const [id, status] of statusMap.entries()) {
        statusMap.set(id, {
          ...status,
          state: "disconnected",
          server: undefined,
        });
      }
      connected = [];
      notifyListeners();
    },

    getConnected(): readonly ConnectedMcpServer[] {
      return connected;
    },

    startAll(configs: readonly McpServerConfig[], secretStore?: SecretStore): void {
      const activeConfigs = configs.filter((cfg) => cfg.enabled !== false);
      configuredCount = activeConfigs.length;

      for (const cfg of activeConfigs) {
        if (!cfg.command && !cfg.url) {
          mcpLog.warn(`MCP server '${cfg.id}': no command or url — skipping`);
          statusMap.set(cfg.id, {
            id: cfg.id,
            config: cfg,
            state: "failed",
            lastError: "no command or url configured",
          });
          continue;
        }

        // Launch background retry loop (non-blocking)
        startRetryLoop(cfg, secretStore).catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err);
          mcpLog.error(`MCP retry loop for '${cfg.id}' crashed: ${msg}`);
        });
      }
    },

    getStatus(): readonly McpServerStatus[] {
      return Array.from(statusMap.values());
    },

    getConfiguredCount(): number {
      return configuredCount;
    },

    onStatusChange(cb: (status: readonly McpServerStatus[]) => void): () => void {
      statusListeners.add(cb);
      return () => {
        statusListeners.delete(cb);
      };
    },
  };
}
