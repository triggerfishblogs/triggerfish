/**
 * Topic dispatchers for logs, health, and agents screens.
 *
 * Each factory takes a handler and returns a TopicHandler that routes
 * WebSocket messages to the appropriate handler method.
 *
 * @module
 */

import type { TopicHandler } from "./host_types.ts";
import type { TidepoolLogSink } from "./host_logs.ts";
import type { TidepoolHealthHandler } from "./host_health.ts";
import type { TidepoolAgentsHandler } from "./host_agents.ts";
import type { LogLevel } from "../screens/logs.ts";
import { trySendSocketPayload } from "./host_broadcast.ts";
import { createLogger } from "../../../core/logger/mod.ts";

const log = createLogger("tidepool-dispatch");

/** Send a JSON response to a single socket. */
export function reply(
  socket: WebSocket,
  data: Record<string, unknown>,
): void {
  trySendSocketPayload(socket, JSON.stringify(data));
}

/** Create a topic handler for the logs screen. */
export function createLogsTopicDispatcher(
  sink: TidepoolLogSink,
): TopicHandler {
  return (message, socket) => {
    const action = message.action as string;
    const payload = (message.payload ?? {}) as Record<string, unknown>;

    if (action === "subscribe") {
      const levels = (payload.levels as string[]) ?? [
        "DEBUG",
        "INFO",
        "WARN",
        "ERROR",
      ];
      sink.subscribe(socket, {
        levels: new Set(levels as LogLevel[]),
        source: (payload.source as string) ?? null,
        search: (payload.search as string) ?? null,
      });
    } else if (action === "unsubscribe") {
      sink.unsubscribe(socket);
    }
  };
}

/** Create a topic handler for the health screen. */
export function createHealthTopicDispatcher(
  handler: TidepoolHealthHandler,
): TopicHandler {
  return (message, socket) => {
    const action = message.action as string;

    if (action === "snapshot") {
      handler.snapshot().then((snap) => {
        reply(socket, { topic: "health", type: "snapshot", ...snap });
      }).catch((err: unknown) => {
        log.warn("Health snapshot dispatch failed", {
          operation: "snapshot",
          err,
        });
      });
    } else if (action === "subscribe_live") {
      handler.subscribeLive(socket);
    } else if (action === "unsubscribe_live") {
      handler.unsubscribeLive(socket);
    }
  };
}

/** Data shape returned by the agent list provider. */
interface AgentListData {
  readonly sessions: Record<string, unknown>[];
  readonly teams: Record<string, unknown>[];
}

/** Create a topic handler for the agents screen. */
export function createAgentsTopicDispatcher(
  handler: TidepoolAgentsHandler,
  agentListProvider: () => Promise<AgentListData>,
): TopicHandler {
  return (message, socket) => {
    const action = message.action as string;
    const payload = (message.payload ?? {}) as Record<string, unknown>;

    if (action === "list_sessions") {
      handler.subscribeList(socket);
      agentListProvider().then((data) => {
        reply(socket, {
          topic: "agents",
          type: "session_list",
          sessions: data.sessions,
          teams: data.teams,
        });
      }).catch((err: unknown) => {
        log.warn("Agents session list dispatch failed", {
          operation: "list_sessions",
          err,
        });
      });
    } else if (action === "subscribe_session") {
      const sessionId = payload.sessionId as string;
      if (sessionId) {
        handler.subscribeSession(socket, sessionId);
      }
    } else if (action === "unsubscribe_session") {
      const sessionId = payload.sessionId as string;
      if (sessionId) {
        handler.unsubscribeSession(socket, sessionId);
      }
    } else if (action === "terminate") {
      reply(socket, {
        topic: "agents",
        type: "terminate_ack",
        sessionId: payload.sessionId,
      });
    }
  };
}
