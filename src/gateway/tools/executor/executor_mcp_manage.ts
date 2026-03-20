/**
 * MCP server management executor.
 *
 * Handles list, add, remove, enable, disable, and status actions for
 * the mcp_manage tool. All operations are config-file-only — writes
 * modify triggerfish.yaml and require a daemon restart to take effect.
 *
 * @module
 */

import { parseClassification } from "../../../core/types/classification.ts";
import {
  deleteConfigValue,
  readConfigYaml,
  writeConfigValue,
} from "../../../core/config_io.ts";
import { createLogger } from "../../../core/logger/mod.ts";

const log = createLogger("mcp-manage");

/** Context required by the mcp_manage executor. */
export interface McpManageContext {
  readonly configPath: string;
}

/** Parse args string into a string array. */
function parseArgs(raw: unknown): readonly string[] {
  if (typeof raw !== "string" || raw.length === 0) return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch (_err: unknown) {
      // Not valid JSON array — fall through to space-split
    }
  }
  return trimmed.split(/\s+/);
}

/** Parse env JSON string into a record. */
function parseEnv(raw: unknown): Record<string, string> | undefined {
  if (typeof raw !== "string" || raw.length === 0) return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed as Record<string, string>;
    }
  } catch (_err: unknown) {
    // Not valid JSON — return undefined
  }
  return undefined;
}

/** Read MCP server entries from the config YAML. */
function readConfigServers(
  configPath: string,
): Record<string, Record<string, unknown>> {
  const configResult = readConfigYaml(configPath);
  if (!configResult.ok) return {};

  // Preferred path: mcp.servers; fallback: top-level mcp_servers
  const mcp = configResult.value.mcp as Record<string, unknown> | undefined;
  const mcpServers = mcp?.servers as
    | Record<string, Record<string, unknown>>
    | undefined;
  const legacyServers = configResult.value.mcp_servers as
    | Record<string, Record<string, unknown>>
    | undefined;

  return mcpServers ?? legacyServers ?? {};
}

/** Handle the list action — reads from config file. */
function executeList(ctx: McpManageContext): string {
  const configServers = readConfigServers(ctx.configPath);
  const serverIds = Object.keys(configServers);

  if (serverIds.length === 0) {
    return JSON.stringify({
      servers: [],
      message: "No MCP servers configured.",
    });
  }

  const servers = serverIds.map((id) => {
    const cfg = configServers[id];
    return {
      id,
      classification: cfg.classification ?? "INTERNAL",
      transport: cfg.command ? "stdio" : "sse",
      command: cfg.command,
      url: cfg.url,
      args: cfg.args,
      enabled: cfg.enabled !== false,
      env_keys: cfg.env ? Object.keys(cfg.env as Record<string, unknown>) : [],
    };
  });

  return JSON.stringify({
    servers,
    total: servers.length,
  });
}

/** Handle the add action — writes to config file. */
async function executeAdd(
  ctx: McpManageContext,
  input: Record<string, unknown>,
): Promise<string> {
  const serverId = input.server_id as string;
  const command = input.command as string | undefined;
  const url = input.url as string | undefined;

  if (!command && !url) {
    return "Error: mcp_manage(add) requires either 'command' (stdio) or 'url' (SSE).";
  }

  const classRaw = (input.classification as string) ?? "INTERNAL";
  const classResult = parseClassification(classRaw);
  if (!classResult.ok) return `Error: ${classResult.error}`;

  const args = parseArgs(input.args);
  const env = parseEnv(input.env);

  const configData: Record<string, unknown> = {
    ...(command ? { command } : {}),
    ...(args.length > 0 ? { args: [...args] } : {}),
    ...(url ? { url } : {}),
    classification: classResult.value,
    enabled: true,
    ...(env ? { env } : {}),
  };

  const writeResult = await writeConfigValue(
    ctx.configPath,
    `mcp.servers.${serverId}`,
    configData,
  );
  if (!writeResult.ok) return `Error: ${writeResult.error}`;

  log.info("MCP server added via mcp_manage", {
    operation: "mcpManageAdd",
    serverId,
    transport: command ? "stdio" : "sse",
  });

  return JSON.stringify({
    success: true,
    server_id: serverId,
    message:
      `MCP server '${serverId}' saved to config. Use daemon_manage(action: "restart") to activate.`,
    restart_needed: true,
  });
}

/** Handle the remove action — deletes from config file. */
async function executeRemove(
  ctx: McpManageContext,
  serverId: string,
): Promise<string> {
  await deleteConfigValue(ctx.configPath, `mcp.servers.${serverId}`);

  log.info("MCP server removed via mcp_manage", {
    operation: "mcpManageRemove",
    serverId,
  });

  return JSON.stringify({
    success: true,
    server_id: serverId,
    message:
      `MCP server '${serverId}' removed. Use daemon_manage(action: "restart") to apply.`,
    restart_needed: true,
  });
}

/** Handle enable/disable actions — toggles enabled flag in config. */
async function executeToggleEnabled(
  ctx: McpManageContext,
  serverId: string,
  enable: boolean,
): Promise<string> {
  // Check both config paths for the server
  const configServers = readConfigServers(ctx.configPath);
  if (!configServers[serverId]) {
    return JSON.stringify({
      error: `MCP server '${serverId}' not found in config.`,
      available: Object.keys(configServers),
    });
  }

  const path = `mcp.servers.${serverId}.enabled`;

  const writeResult = await writeConfigValue(ctx.configPath, path, enable);
  if (!writeResult.ok) return `Error: ${writeResult.error}`;

  const action = enable ? "enabled" : "disabled";
  log.info(`MCP server ${action} via mcp_manage`, {
    operation: `mcpManage${enable ? "Enable" : "Disable"}`,
    serverId,
  });

  return JSON.stringify({
    success: true,
    server_id: serverId,
    message:
      `MCP server '${serverId}' ${action}. Use daemon_manage(action: "restart") to apply.`,
    restart_needed: true,
  });
}

/** Handle the status action — reads config for a single server. */
function executeStatus(
  ctx: McpManageContext,
  serverId: string,
): string {
  const configServers = readConfigServers(ctx.configPath);
  const cfg = configServers[serverId];
  if (!cfg) {
    return JSON.stringify({
      error: `MCP server '${serverId}' not found in config.`,
      available: Object.keys(configServers),
    });
  }
  return JSON.stringify({
    id: serverId,
    classification: cfg.classification ?? "INTERNAL",
    transport: cfg.command ? "stdio" : "sse",
    command: cfg.command,
    url: cfg.url,
    args: cfg.args,
    enabled: cfg.enabled !== false,
    env_keys: cfg.env ? Object.keys(cfg.env as Record<string, unknown>) : [],
  });
}

/**
 * Create a SubsystemExecutor for mcp_manage.
 *
 * Returns null for non-matching tool names so the dispatch chain
 * continues to the next executor.
 */
export function createMcpManageExecutor(
  ctx: McpManageContext,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (name !== "mcp_manage") return null;

    const action = input.action as string | undefined;
    if (!action) {
      return "Error: mcp_manage requires an 'action' parameter (list, add, remove, enable, disable, status).";
    }

    const serverId = input.server_id as string | undefined;
    if (action !== "list" && (!serverId || serverId.length === 0)) {
      return `Error: mcp_manage(${action}) requires a 'server_id' parameter.`;
    }

    switch (action) {
      case "list":
        return executeList(ctx);
      case "add":
        return await executeAdd(ctx, input);
      case "remove":
        return await executeRemove(ctx, serverId!);
      case "enable":
        return await executeToggleEnabled(ctx, serverId!, true);
      case "disable":
        return await executeToggleEnabled(ctx, serverId!, false);
      case "status":
        return executeStatus(ctx, serverId!);
      default:
        return `Error: Unknown action "${action}". Valid actions: list, add, remove, enable, disable, status.`;
    }
  };
}
