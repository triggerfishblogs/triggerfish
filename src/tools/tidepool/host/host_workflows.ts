/**
 * Tidepool workflows host handler.
 *
 * Bridges the workflow store and run registry to the Tidepool
 * WebSocket topic system. Manages subscriber sets and forwards
 * registry events to connected clients.
 *
 * @module
 */

import { createLogger } from "../../../core/logger/logger.ts";
import type { ClassificationLevel } from "../../../core/types/classification.ts";
import { trySendSocketPayload } from "./host_broadcast.ts";

const log = createLogger("tidepool-workflows");

/** Minimal workflow store interface to avoid cross-layer imports. */
interface MinimalWorkflowStore {
  listWorkflowDefinitions(
    sessionTaint: ClassificationLevel,
  ): Promise<
    readonly {
      readonly name: string;
      readonly classification: ClassificationLevel;
      readonly savedAt: string;
      readonly description?: string;
    }[]
  >;
}

/** Minimal run registry interface to avoid cross-layer imports. */
interface MinimalRunRegistry {
  listActiveRuns(): readonly {
    readonly runId: string;
    readonly workflowName: string;
    readonly status: string;
    readonly currentTaskIndex: number;
    readonly currentTaskName: string;
    readonly startedAt: string;
    readonly paused: boolean;
    readonly taint?: ClassificationLevel;
  }[];
  stopRun(runId: string): boolean;
  pauseRun(runId: string): boolean;
  unpauseRun(runId: string): boolean;
  subscribe(
    listener: (event: RegistryEventShape) => void,
  ): () => void;
}

/** Shape of registry events we consume. */
interface RegistryEventShape {
  readonly type: string;
  readonly runId: string;
  readonly workflowName: string;
  readonly status: string;
  readonly currentTaskIndex?: number;
  readonly currentTaskName?: string;
  readonly taint?: ClassificationLevel;
  readonly error?: string;
}

/** Tidepool workflows handler interface. */
export interface TidepoolWorkflowsHandler {
  /** Subscribe a WebSocket client to workflow updates. */
  subscribeLive(socket: WebSocket): void;
  /** Unsubscribe a WebSocket client. */
  unsubscribeLive(socket: WebSocket): void;
  /** Fetch the workflow list for a client. */
  fetchWorkflowList(
    sessionTaint: ClassificationLevel,
  ): Promise<Record<string, unknown>>;
  /** Fetch currently active runs. */
  fetchActiveRuns(): Record<string, unknown>;
  /** Control a running workflow (stop/pause/unpause). */
  controlRun(
    runId: string,
    action: string,
  ): Record<string, unknown>;
  /** Remove a socket from all subscriptions. */
  removeSocket(socket: WebSocket): void;
}

/** Create a TidepoolWorkflowsHandler. */
export function createTidepoolWorkflowsHandler(
  store: MinimalWorkflowStore,
  registry: MinimalRunRegistry,
): TidepoolWorkflowsHandler {
  const subscribers = new Set<WebSocket>();

  const unsubscribeRegistry = registry.subscribe((event) => {
    broadcastRegistryEvent(subscribers, event);
  });

  log.debug("Tidepool workflows handler created", {
    operation: "createTidepoolWorkflowsHandler",
  });

  // Prevent unused variable warning — cleanup on GC
  void unsubscribeRegistry;

  return {
    subscribeLive(socket) {
      subscribers.add(socket);
    },

    unsubscribeLive(socket) {
      subscribers.delete(socket);
    },

    async fetchWorkflowList(sessionTaint) {
      const workflows = await store.listWorkflowDefinitions(sessionTaint);
      return {
        topic: "workflows",
        type: "workflow_list",
        workflows: workflows.map((w) => ({
          name: w.name,
          description: w.description,
          classification: w.classification,
          savedAt: w.savedAt,
        })),
      };
    },

    fetchActiveRuns() {
      const runs = registry.listActiveRuns();
      return {
        topic: "workflows",
        type: "active_runs",
        runs,
      };
    },

    controlRun(runId, action) {
      if (action === "stop") {
        const ok = registry.stopRun(runId);
        return {
          topic: "workflows",
          type: "control_result",
          runId,
          action,
          ok,
        };
      }
      if (action === "pause") {
        const ok = registry.pauseRun(runId);
        return {
          topic: "workflows",
          type: "control_result",
          runId,
          action,
          ok,
        };
      }
      if (action === "unpause") {
        const ok = registry.unpauseRun(runId);
        return {
          topic: "workflows",
          type: "control_result",
          runId,
          action,
          ok,
        };
      }
      return {
        topic: "workflows",
        type: "control_result",
        runId,
        action,
        ok: false,
        error: `Unknown action: ${action}`,
      };
    },

    removeSocket(socket) {
      subscribers.delete(socket);
    },
  };
}

function broadcastRegistryEvent(
  subscribers: Set<WebSocket>,
  event: RegistryEventShape,
): void {
  const payload = JSON.stringify({
    topic: "workflows",
    type: "run_event",
    event,
  });

  for (const socket of subscribers) {
    trySendSocketPayload(socket, payload);
  }
}
