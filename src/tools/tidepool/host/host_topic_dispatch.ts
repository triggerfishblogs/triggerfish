/**
 * Topic dispatcher factories for Tidepool screen handlers.
 *
 * Each factory takes a handler object and returns a `TopicHandler`
 * function that routes `{ action, payload }` WebSocket messages
 * to the appropriate handler method and sends responses back.
 *
 * @module
 */

import type { TopicHandler } from "./host_types.ts";
import type { TidepoolLogSink } from "./host_logs.ts";
import type { TidepoolHealthHandler } from "./host_health.ts";
import type { TidepoolAgentsHandler } from "./host_agents.ts";
import type { TidepoolMemoryHandler } from "./host_memory.ts";
import type { TidepoolConfigHandler } from "./host_config.ts";
import type { TidepoolWorkflowsHandler } from "./host_workflows.ts";
import type { LogLevel } from "../screens/logs.ts";
import { trySendSocketPayload } from "./host_broadcast.ts";
import { createLogger } from "../../../core/logger/mod.ts";

const log = createLogger("tidepool-dispatch");

/** Send a JSON response to a single socket. */
function reply(
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
      // Termination requires gateway-level handling; acknowledge for now
      reply(socket, {
        topic: "agents",
        type: "terminate_ack",
        sessionId: payload.sessionId,
      });
    }
  };
}

/** Create a topic handler for the memory screen. */
export function createMemoryTopicDispatcher(
  handler: TidepoolMemoryHandler,
  sessionTaintProvider: () => string,
): TopicHandler {
  return (message, socket) => {
    const action = message.action as string;
    const payload = (message.payload ?? {}) as Record<string, unknown>;
    const taint = sessionTaintProvider();

    if (action === "search") {
      handler
        .search(
          {
            query: (payload.query as string) ?? "",
            classification: payload.classification as
              | import("../../../core/types/classification.ts").ClassificationLevel
              | undefined,
            tags: payload.tags as string[] | undefined,
            dateFrom: payload.dateFrom as string | undefined,
            dateTo: payload.dateTo as string | undefined,
          },
          taint,
        )
        .then((result) => {
          reply(socket, { topic: "memory", type: "search_results", ...result });
        })
        .catch((err: unknown) => {
          log.warn("Memory search dispatch failed", {
            operation: "search",
            err,
          });
          reply(socket, {
            topic: "memory",
            type: "search_results",
            entries: [],
            total: 0,
          });
        });
    } else if (action === "tags") {
      handler
        .tags(taint)
        .then((tags) => {
          reply(socket, { topic: "memory", type: "tags", tags });
        })
        .catch((err: unknown) => {
          log.warn("Memory tags dispatch failed", { operation: "tags", err });
          reply(socket, { topic: "memory", type: "tags", tags: [] });
        });
    } else if (action === "get") {
      const id = payload.id as string;
      if (id) {
        handler
          .get(id, taint)
          .then((entry) => {
            reply(socket, { topic: "memory", type: "entry", entry });
          })
          .catch((err: unknown) => {
            log.warn("Memory get dispatch failed", {
              operation: "get",
              id,
              err,
            });
            reply(socket, { topic: "memory", type: "entry", entry: null });
          });
      }
    } else if (action === "delete") {
      const id = payload.id as string;
      if (id) {
        handler
          .delete(id, taint)
          .then((ok) => {
            reply(socket, { topic: "memory", type: "deleted", id, ok });
          })
          .catch((err: unknown) => {
            log.warn("Memory delete dispatch failed", {
              operation: "delete",
              id,
              err,
            });
            reply(socket, { topic: "memory", type: "deleted", id, ok: false });
          });
      }
    }
  };
}

/** Create a topic handler for the workflows screen. */
export function createWorkflowsTopicDispatcher(
  handler: TidepoolWorkflowsHandler,
  sessionTaintProvider: () => string,
): TopicHandler {
  return (message, socket) => {
    const action = message.action as string;
    const payload = (message.payload ?? {}) as Record<string, unknown>;

    if (action === "list_workflows") {
      const taint = sessionTaintProvider();
      handler
        .fetchWorkflowList(
          taint as import("../../../core/types/classification.ts").ClassificationLevel,
        )
        .then((data) => {
          reply(socket, data);
        })
        .catch((err: unknown) => {
          log.warn("Workflows list dispatch failed", {
            operation: "list_workflows",
            err,
          });
          reply(socket, {
            topic: "workflows",
            type: "workflow_list",
            workflows: [],
          });
        });
    } else if (action === "list_active") {
      reply(socket, handler.fetchActiveRuns());
    } else if (action === "subscribe_live") {
      handler.subscribeLive(socket);
      reply(socket, handler.fetchActiveRuns());
    } else if (action === "unsubscribe_live") {
      handler.unsubscribeLive(socket);
    } else if (action === "control") {
      const runId = payload.runId as string;
      const controlAction = payload.action as string;
      if (runId && controlAction) {
        reply(socket, handler.controlRun(runId, controlAction));
      }
    } else if (action === "get_workflow") {
      const name = payload.name as string;
      if (name) {
        const taint = sessionTaintProvider();
        handler
          .fetchWorkflowDetail(
            name,
            taint as import("../../../core/types/classification.ts").ClassificationLevel,
          )
          .then((data) => reply(socket, data))
          .catch((err: unknown) => {
            log.warn("Workflow detail fetch failed", {
              operation: "get_workflow",
              name,
              err,
            });
            reply(socket, {
              topic: "workflows",
              type: "workflow_detail",
              name,
              found: false,
            });
          });
      }
    } else if (action === "get_history") {
      const taint = sessionTaintProvider();
      const workflowName = payload.workflowName as string | undefined;
      const limit = payload.limit as number | undefined;
      handler
        .fetchRunHistory(
          taint as import("../../../core/types/classification.ts").ClassificationLevel,
          workflowName,
          limit,
        )
        .then((data) => reply(socket, data))
        .catch((err: unknown) => {
          log.warn("Workflow run history fetch failed", {
            operation: "get_history",
            err,
          });
          reply(socket, { topic: "workflows", type: "run_history", runs: [] });
        });
    } else if (action === "start") {
      const name = payload.name as string;
      if (name) {
        const taint = sessionTaintProvider();
        handler
          .startRun(
            name,
            taint as import("../../../core/types/classification.ts").ClassificationLevel,
          )
          .then((data) => reply(socket, data))
          .catch((err: unknown) => {
            log.warn("Workflow start dispatch failed", {
              operation: "start",
              name,
              err,
            });
            reply(socket, {
              topic: "workflows",
              type: "start_result",
              name,
              ok: false,
              error: "Start failed",
            });
          });
      }
    } else if (action === "schedule") {
      const name = payload.name as string;
      const expression = payload.expression as string;
      const classification = (payload.classification as string) ||
        sessionTaintProvider();
      if (name && expression) {
        reply(
          socket,
          handler.scheduleRun(
            name,
            expression,
            classification as import("../../../core/types/classification.ts").ClassificationLevel,
          ),
        );
      }
    } else if (action === "delete_workflow") {
      const name = payload.name as string;
      if (name) {
        handler
          .deleteWorkflow(name)
          .then((data) => reply(socket, data))
          .catch((err: unknown) => {
            log.warn("Workflow delete failed", {
              operation: "delete_workflow",
              name,
              err,
            });
            reply(socket, {
              topic: "workflows",
              type: "workflow_deleted",
              name,
              ok: false,
            });
          });
      }
    }
  };
}

/** Create a topic handler for the settings screen. */
export function createSettingsTopicDispatcher(
  handler: TidepoolConfigHandler,
): TopicHandler {
  return (message, socket) => {
    const action = message.action as string;
    const payload = (message.payload ?? {}) as Record<string, unknown>;

    if (action === "get_section") {
      const section = payload.section as string;
      handler
        .getSection(
          section as Parameters<TidepoolConfigHandler["getSection"]>[0],
        )
        .then((data) => {
          reply(socket, {
            topic: "settings",
            type: "section_data",
            section,
            data,
          });
        })
        .catch((err: unknown) => {
          log.warn("Settings get_section dispatch failed", {
            operation: "get_section",
            section,
            err,
          });
          const errMessage = err instanceof Error ? err.message : String(err);
          reply(socket, {
            topic: "settings",
            type: "section_data",
            section,
            data: {},
            error: errMessage,
          });
        });
    } else if (action === "update") {
      const section = payload.section as string;
      const values = payload.values as Record<string, unknown>;
      handler
        .updateSection(
          section as Parameters<TidepoolConfigHandler["updateSection"]>[0],
          values,
        )
        .then((result) => {
          reply(socket, {
            topic: "settings",
            type: "update_result",
            section,
            ...result,
          });
        })
        .catch((err: unknown) => {
          log.warn("Settings update dispatch failed", {
            operation: "update",
            section,
            err,
          });
          const errMessage = err instanceof Error ? err.message : String(err);
          reply(socket, {
            topic: "settings",
            type: "update_result",
            section,
            valid: false,
            errors: [{ field: "_", message: errMessage }],
          });
        });
    }
  };
}
