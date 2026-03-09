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
  tidepoolHost.registerSocketCleanup((socket) => logSink.unsubscribe(socket));
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
  tidepoolHost.registerSocketCleanup((socket) =>
    healthHandler.unsubscribeLive(socket)
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
  tidepoolHost.registerSocketCleanup((socket) =>
    agentsHandler.removeSocket(socket)
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
  const home = Deno.env.get("HOME");
  if (!home) {
    log.debug("HOME env var not set, log sink polling disabled");
    return;
  }
  const logPath = `${home}/.triggerfish/logs/triggerfish.log`;

  let lastSize = 0;
  Deno.stat(logPath)
    .then((stat) => {
      lastSize = stat.size;
    })
    .catch((err: unknown) => {
      log.debug("Log file not found at startup, will poll", { err });
    })
    .finally(() => {
      startLogPollLoop(sink, logPath, lastSize);
    });
}

/** Start async poll loop using setTimeout to avoid blocking the event loop. */
function startLogPollLoop(
  sink: ReturnType<typeof createTidepoolLogSink>,
  logPath: string,
  initialSize: number,
): void {
  let lastSize = initialSize;
  const tick = (): void => {
    pollLogFileAsync(sink, logPath, lastSize)
      .then((newSize) => {
        lastSize = newSize;
      })
      .catch((err: unknown) => {
        log.debug("Log file poll failed, may be rotated", { err });
      })
      .finally(() => {
        const timer = setTimeout(tick, 1000);
        Deno.unrefTimer(timer);
      });
  };
  const timer = setTimeout(tick, 1000);
  Deno.unrefTimer(timer);
}

/** Read new lines from the log file and feed them to the sink (async). */
async function pollLogFileAsync(
  sink: ReturnType<typeof createTidepoolLogSink>,
  logPath: string,
  lastSize: number,
): Promise<number> {
  const stat = await Deno.stat(logPath);
  if (stat.size <= lastSize) return lastSize;

  const file = await Deno.open(logPath, { read: true });
  try {
    await file.seek(lastSize, Deno.SeekMode.Start);
    const buf = new Uint8Array(stat.size - lastSize);
    await file.read(buf);
    feedLogLinesToSink(sink, buf);
  } finally {
    file.close();
  }
  return stat.size;
}

/** Parse log lines from raw bytes and write entries to the sink. */
function feedLogLinesToSink(
  sink: ReturnType<typeof createTidepoolLogSink>,
  buf: Uint8Array,
): void {
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

