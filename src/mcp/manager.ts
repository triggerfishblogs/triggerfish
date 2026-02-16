/**
 * MCP Server Manager — lifecycle management for configured MCP servers.
 *
 * Handles env var resolution (including `keychain:` prefix for OS keychain),
 * transport creation, connection, initialization, tool discovery, and
 * bridging to the gateway's McpServer interface.
 *
 * @module
 */

import type { Result, ClassificationLevel } from "../core/types/classification.ts";
import type { SecretStore } from "../secrets/keychain.ts";
import type { McpClient, McpToolDefinition } from "./client/protocol.ts";
import type { McpServer, McpServerToolResult } from "./gateway/gateway.ts";
import { StdioTransport, SSETransport } from "./client/transport.ts";
import type { Transport } from "./client/transport.ts";
import { createMcpClient } from "./client/protocol.ts";

/** Parsed configuration for a single MCP server. */
export interface McpServerConfig {
  readonly id: string;
  readonly command?: string;
  readonly args?: readonly string[];
  readonly env?: Readonly<Record<string, string>>;
  readonly url?: string;
  readonly classification?: ClassificationLevel;
  readonly enabled?: boolean;
}

/** A connected MCP server with its tools and metadata. */
export interface ConnectedMcpServer {
  readonly id: string;
  readonly classification: ClassificationLevel | undefined;
  readonly tools: readonly McpToolDefinition[];
  readonly server: McpServer;
  readonly client: McpClient;
  readonly transport: Transport;
}

/** Manager interface for MCP server lifecycle. */
export interface McpServerManager {
  /** Connect to all configured servers. Graceful degradation on failure. */
  connectAll(
    configs: readonly McpServerConfig[],
    secretStore?: SecretStore,
  ): Promise<readonly ConnectedMcpServer[]>;
  /** Disconnect all connected servers. */
  disconnectAll(): Promise<void>;
  /** Get currently connected servers. */
  getConnected(): readonly ConnectedMcpServer[];
}

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
        console.warn(
          `  MCP env: could not resolve keychain secret '${secretName}' for ${key}: ${result.error}`,
        );
      }
    } else if (value.startsWith("keychain:")) {
      console.warn(
        `  MCP env: keychain: prefix used for ${key} but no SecretStore available`,
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

/**
 * Create an McpServerManager instance.
 *
 * Owns the full lifecycle: env resolution, transport creation, connection,
 * initialization, tool discovery, and disconnection.
 */
export function createMcpServerManager(): McpServerManager {
  let connected: ConnectedMcpServer[] = [];

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
          console.warn(`  MCP server '${cfg.id}': no command or url — skipping`);
          continue;
        }

        try {
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

          results.push(entry);
          console.log(
            `  MCP server '${cfg.id}' connected (${tools.length} tools)`,
          );
        } catch (err: unknown) {
          const message = err instanceof Error
            ? `${err.message}${err.stack ? "\n" + err.stack : ""}`
            : String(err);
          console.warn(
            `  MCP server '${cfg.id}' failed to connect: ${message}`,
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
      connected = [];
    },

    getConnected(): readonly ConnectedMcpServer[] {
      return connected;
    },
  };
}
