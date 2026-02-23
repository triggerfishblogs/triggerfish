/**
 * MCP Manager — health polling and retry logic for MCP server connections.
 *
 * Background retry loops with exponential backoff, health polling via
 * periodic listTools checks, and server startup orchestration.
 *
 * @module
 */

import type {
  ConnectedMcpServer,
  McpServerConfig,
  McpServerStatus,
} from "./manager_types.ts";
import type {
  McpConnectionContext,
  McpManagerState,
} from "./manager_connection.ts";
import {
  connectOneMcpServer,
  formatMcpConnectionError,
  notifyMcpStatusListeners,
} from "./manager_connection.ts";

// ─── Health polling ──────────────────────────────────────────────────────────

/** Poll until an MCP server disconnects or is externally marked disconnected. */
async function pollMcpServerHealth(
  entry: ConnectedMcpServer,
  statusMap: Map<string, McpServerStatus>,
): Promise<void> {
  while (true) {
    await new Promise<void>((resolve) => setTimeout(resolve, 5000));
    const current = statusMap.get(entry.id);
    if (!current || current.state !== "connected") return;
    try {
      await entry.client.listTools();
    } catch {
      return;
    }
  }
}

// ─── Retry loop ──────────────────────────────────────────────────────────────

/** Background retry loop for a single MCP server with exponential backoff. */
async function runMcpRetryLoop(
  cfg: McpServerConfig,
  ctx: McpConnectionContext,
): Promise<void> {
  let delay = 2000;
  let attempts = 0;
  const maxRetries = cfg.maxRetries ?? 10;
  while (true) {
    setMcpServerConnecting(cfg, ctx.state);
    try {
      delay = await attemptMcpConnection(cfg, ctx);
      attempts = 0; // reset on successful connection
    } catch (err: unknown) {
      attempts++;
      if (attempts >= maxRetries) {
        markMcpServerPermanentlyFailed(
          cfg,
          ctx,
          maxRetries,
          formatMcpConnectionError(err),
        );
        return;
      }
      delay = handleMcpConnectionFailure(cfg, { err, delay, ctx, attempts, maxRetries });
    }
    await new Promise<void>((resolve) => setTimeout(resolve, delay));
    delay = Math.min(delay * 2, 30000);
  }
}

/** Mark a server as "connecting" in the status map and notify listeners. */
function setMcpServerConnecting(
  cfg: McpServerConfig,
  state: McpManagerState,
): void {
  state.statusMap.set(cfg.id, {
    id: cfg.id,
    config: cfg,
    state: "connecting",
  });
  notifyMcpStatusListeners(state);
}

/** Attempt connection, poll health, then mark disconnected. Returns reset delay. */
async function attemptMcpConnection(
  cfg: McpServerConfig,
  ctx: McpConnectionContext,
): Promise<number> {
  const entry = await connectOneMcpServer(cfg, ctx);
  ctx.state.statusMap.set(cfg.id, {
    id: cfg.id,
    config: cfg,
    state: "connected",
    server: entry,
  });
  notifyMcpStatusListeners(ctx.state);

  await pollMcpServerHealth(entry, ctx.state.statusMap);
  ctx.mcpLog.warn(
    `MCP server '${cfg.id}' disconnected — reconnecting`,
  );
  ctx.state.statusMap.set(cfg.id, {
    id: cfg.id,
    config: cfg,
    state: "disconnected",
  });
  notifyMcpStatusListeners(ctx.state);
  return 2000;
}

/** Options for handling an MCP connection failure. */
interface McpFailureDetails {
  readonly err: unknown;
  readonly delay: number;
  readonly ctx: McpConnectionContext;
  readonly attempts: number;
  readonly maxRetries: number;
}

/** Handle a connection failure: log, update status, return current delay. */
function handleMcpConnectionFailure(
  cfg: McpServerConfig,
  details: McpFailureDetails,
): number {
  const message = formatMcpConnectionError(details.err);
  details.ctx.mcpLog.warn(
    `MCP server '${cfg.id}' failed to connect (attempt ${details.attempts}/${details.maxRetries}): ${message} — retrying in ${details.delay}ms`,
  );
  details.ctx.state.statusMap.set(cfg.id, {
    id: cfg.id,
    config: cfg,
    state: "disconnected",
    lastError: message,
  });
  notifyMcpStatusListeners(details.ctx.state);
  return details.delay;
}

/** Mark a server as permanently failed after exhausting all retries. */
function markMcpServerPermanentlyFailed(
  cfg: McpServerConfig,
  ctx: McpConnectionContext,
  maxRetries: number,
  lastError: string,
): void {
  ctx.mcpLog.error(
    `MCP server '${cfg.id}' permanently failed after ${maxRetries} attempts: ${lastError}`,
  );
  ctx.state.statusMap.set(cfg.id, {
    id: cfg.id,
    config: cfg,
    state: "failed",
    lastError: `Max retries (${maxRetries}) exceeded. Last error: ${lastError}`,
  });
  notifyMcpStatusListeners(ctx.state);
}

// ─── Start all ───────────────────────────────────────────────────────────────

/** Launch a single MCP server config into a background retry loop. */
function launchMcpServerRetryLoop(
  cfg: McpServerConfig,
  ctx: McpConnectionContext,
): void {
  runMcpRetryLoop(cfg, ctx).catch((err: unknown) => {
    ctx.mcpLog.error(
      `MCP retry loop for '${cfg.id}' crashed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  });
}

/** Mark a config as failed (missing command/url) in the status map. */
function markMcpServerFailed(
  cfg: McpServerConfig,
  ctx: McpConnectionContext,
): void {
  ctx.mcpLog.warn(
    `MCP server '${cfg.id}': no command or url — skipping`,
  );
  ctx.state.statusMap.set(cfg.id, {
    id: cfg.id,
    config: cfg,
    state: "failed",
    lastError: "no command or url configured",
  });
}

/** Start all enabled MCP servers with background retry loops. */
export function startAllMcpServers(
  configs: readonly McpServerConfig[],
  ctx: McpConnectionContext,
): void {
  const activeConfigs = configs.filter((cfg) => cfg.enabled !== false);
  ctx.state.configuredCount = activeConfigs.length;
  for (const cfg of activeConfigs) {
    if (!cfg.command && !cfg.url) {
      markMcpServerFailed(cfg, ctx);
      continue;
    }
    launchMcpServerRetryLoop(cfg, ctx);
  }
}
