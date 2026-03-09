/**
 * Tidepool topic handler registration and supporting providers.
 *
 * Wires screen-specific WebSocket topic handlers (logs, health,
 * agents, memory, settings) into the Tidepool host.
 *
 * @module
 */

import { createLogger } from "../../../core/logger/mod.ts";
import {
  createTidepoolAgentsHandler,
  createTidepoolConfigHandler,
  createTidepoolHealthHandler,
  createTidepoolLogSink,
  createTidepoolMemoryHandler,
} from "../../../tools/tidepool/host/mod.ts";
import {
  createAgentsTopicDispatcher,
  createHealthTopicDispatcher,
  createLogsTopicDispatcher,
  createMemoryTopicDispatcher,
  createSettingsTopicDispatcher,
} from "../../../tools/tidepool/host/host_topic_dispatch.ts";
import type { BootstrapResult } from "../bootstrap.ts";
import type { CoreInfraResult } from "../infra/core_infra.ts";
import type { ToolInfraResult } from "../tools/tool_infra.ts";
import { startTidepoolHost } from "./chat_session.ts";
import { createHealthSnapshotProvider } from "./tidepool_health.ts";

const log = createLogger("tidepool-topics");

/** Register WebSocket topic handlers for all Tidepool screens. */
export function registerTidepoolTopicHandlers(
  tidepoolHost: Awaited<ReturnType<typeof startTidepoolHost>>,
  toolInfra: ToolInfraResult,
  bootstrap: BootstrapResult,
  coreInfra: CoreInfraResult,
): void {
  registerLogsHandler(tidepoolHost);
  registerHealthHandler(tidepoolHost, coreInfra, bootstrap);
  registerAgentsHandler(tidepoolHost, coreInfra, toolInfra);
  registerMemoryHandler(tidepoolHost, toolInfra);
  registerSettingsHandler(tidepoolHost, bootstrap);
}

/** Wire logs topic: create sink, register handler, pipe log file. */
function registerLogsHandler(
  tidepoolHost: Awaited<ReturnType<typeof startTidepoolHost>>,
): void {
  const logSink = createTidepoolLogSink();
  tidepoolHost.registerTopicHandler(
    "logs",
    createLogsTopicDispatcher(logSink),
  );
  wireTidepoolLogSink(logSink);
}

/** Wire health topic with snapshot provider. */
function registerHealthHandler(
  tidepoolHost: Awaited<ReturnType<typeof startTidepoolHost>>,
  coreInfra: CoreInfraResult,
  bootstrap: BootstrapResult,
): void {
  const healthHandler = createTidepoolHealthHandler();
  healthHandler.setSnapshotProvider(
    createHealthSnapshotProvider(coreInfra, bootstrap),
  );
  tidepoolHost.registerTopicHandler(
    "health",
    createHealthTopicDispatcher(healthHandler),
  );
}

/** Wire agents topic with session list provider. */
function registerAgentsHandler(
  tidepoolHost: Awaited<ReturnType<typeof startTidepoolHost>>,
  coreInfra: CoreInfraResult,
  toolInfra: ToolInfraResult,
): void {
  const agentsHandler = createTidepoolAgentsHandler();
  tidepoolHost.registerTopicHandler(
    "agents",
    createAgentsTopicDispatcher(
      agentsHandler,
      () => buildAgentSessionListAsync(coreInfra, toolInfra),
    ),
  );
}

/** Wire memory topic if a store is available. */
function registerMemoryHandler(
  tidepoolHost: Awaited<ReturnType<typeof startTidepoolHost>>,
  toolInfra: ToolInfraResult,
): void {
  if (!toolInfra.memoryStore) return;
  const memoryHandler = createTidepoolMemoryHandler(
    toolInfra.memoryStore,
    toolInfra.memorySearchProvider,
  );
  tidepoolHost.registerTopicHandler(
    "memory",
    createMemoryTopicDispatcher(
      memoryHandler,
      () => toolInfra.state.session.taint,
    ),
  );
}

/** Wire settings topic with read-only config handler. */
function registerSettingsHandler(
  tidepoolHost: Awaited<ReturnType<typeof startTidepoolHost>>,
  bootstrap: BootstrapResult,
): void {
  const configHandler = createTidepoolConfigHandler(
    bootstrap.config as unknown as Record<string, unknown>,
  );
  tidepoolHost.registerTopicHandler(
    "settings",
    createSettingsTopicDispatcher(configHandler),
  );
}

/** Pipe structured log entries to the Tidepool log sink via log file polling. */
function wireTidepoolLogSink(
  sink: ReturnType<typeof createTidepoolLogSink>,
): void {
  const logPath = `${Deno.env.get("HOME")}/.triggerfish/logs/triggerfish.log`;

  let lastSize = 0;
  try {
    const stat = Deno.statSync(logPath);
    lastSize = stat.size;
  } catch (err) {
    log.debug("Log file not found at startup, will poll", { err });
  }

  const interval = setInterval(() => {
    try {
      lastSize = pollLogFile(sink, logPath, lastSize);
    } catch (err) {
      log.debug("Log file poll failed, may be rotated", { err });
    }
  }, 1000);

  Deno.unrefTimer(interval);
}

/** Read new lines from the log file and feed them to the sink. */
function pollLogFile(
  sink: ReturnType<typeof createTidepoolLogSink>,
  logPath: string,
  lastSize: number,
): number {
  const stat = Deno.statSync(logPath);
  if (stat.size <= lastSize) return lastSize;

  const file = Deno.openSync(logPath, { read: true });
  file.seekSync(lastSize, Deno.SeekMode.Start);
  const buf = new Uint8Array(stat.size - lastSize);
  file.readSync(buf);
  file.close();

  const text = new TextDecoder().decode(buf);
  const lines = text.split("\n").filter((l) => l.length > 0);
  const logLineRegex = /^\[([^\]]+)\]\s+\[(\w+)\]\s+\[([^\]]+)\]\s+(.*)/;

  for (const line of lines) {
    const match = line.match(logLineRegex);
    if (match) {
      sink.write({
        timestamp: match[1],
        level: match[2] as "DEBUG" | "INFO" | "WARN" | "ERROR",
        source: match[3],
        message: match[4],
      });
    }
  }
  return stat.size;
}

/** Serialize taint history events for client transport. */
function serializeTaintHistory(
  history: readonly {
    readonly timestamp: Date;
    readonly previousLevel: string;
    readonly newLevel: string;
    readonly reason: string;
    readonly sourceId?: string;
  }[],
): Record<string, unknown>[] {
  return history.map((e) => ({
    timestamp: e.timestamp?.toISOString?.() ?? null,
    previousLevel: e.previousLevel,
    newLevel: e.newLevel,
    reason: e.reason,
    sourceId: e.sourceId ?? null,
  }));
}

/** Build the agent session list from available session data. */
export async function buildAgentSessionListAsync(
  coreInfra: CoreInfraResult,
  toolInfra: ToolInfraResult,
): Promise<Record<string, unknown>[]> {
  const sessions: Record<string, unknown>[] = [];

  const mainState = toolInfra.state.session;
  sessions.push({
    sessionId: "main",
    label: "Main Session",
    group: "main",
    status: "green",
    taint: mainState.taint,
    channelId: mainState.channelId ?? null,
    createdAt: mainState.createdAt?.toISOString?.() ?? null,
    history: serializeTaintHistory(mainState.history ?? []),
  });

  if (coreInfra.enhancedSessionManager) {
    try {
      const managed = await coreInfra.enhancedSessionManager.sessionsList();
      for (const s of managed) {
        sessions.push({
          sessionId: s.id,
          label: `Session ${String(s.channelId)}`,
          group: "background",
          status: "gray",
          taint: s.taint ?? "PUBLIC",
          channelId: s.channelId,
          createdAt: s.createdAt?.toISOString?.() ?? null,
          history: serializeTaintHistory(s.history ?? []),
        });
      }
    } catch (err) {
      log.debug("Session list retrieval failed", { err });
    }
  }

  return sessions;
}

