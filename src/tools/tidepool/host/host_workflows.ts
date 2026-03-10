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
  loadWorkflowDefinition(
    name: string,
    sessionTaint: ClassificationLevel,
  ): Promise<
    {
      readonly name: string;
      readonly yaml: string;
      readonly classification: ClassificationLevel;
      readonly savedAt: string;
      readonly description?: string;
    } | null
  >;
  deleteWorkflowDefinition(name: string): Promise<void>;
  listWorkflowRuns(
    sessionTaint: ClassificationLevel,
    options?: {
      readonly workflowName?: string;
      readonly limit?: number;
    },
  ): Promise<
    readonly {
      readonly runId: string;
      readonly workflowName: string;
      readonly status: string;
      readonly startedAt: string;
      readonly completedAt: string;
      readonly taskCount: number;
      readonly error?: string;
    }[]
  >;
}

/** Minimal workflow executor callback — runs a workflow by tool name + input. */
type WorkflowExecutorFn = (
  name: string,
  input: Record<string, unknown>,
) => Promise<string | null>;

/** Minimal cron manager interface to avoid cross-layer imports. */
interface MinimalCronManager {
  create(options: {
    readonly expression: string;
    readonly task: string;
    readonly classificationCeiling: ClassificationLevel;
  }): { ok: true; value: { id: string } } | { ok: false; error: string };
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
  fetchWorkflowList(): Promise<Record<string, unknown>>;
  /** Fetch a single workflow definition with full YAML. */
  fetchWorkflowDetail(
    name: string,
    sessionTaint: ClassificationLevel,
  ): Promise<Record<string, unknown>>;
  /** Fetch currently active runs. */
  fetchActiveRuns(): Record<string, unknown>;
  /** Fetch past run history for a workflow. */
  fetchRunHistory(
    sessionTaint: ClassificationLevel,
    workflowName?: string,
    limit?: number,
  ): Promise<Record<string, unknown>>;
  /** Control a running workflow (stop/pause/unpause). */
  controlRun(
    runId: string,
    action: string,
  ): Record<string, unknown>;
  /** Delete a saved workflow definition. */
  deleteWorkflow(name: string): Promise<Record<string, unknown>>;
  /** Start a workflow run immediately. */
  startRun(
    name: string,
    sessionTaint: ClassificationLevel,
  ): Promise<Record<string, unknown>>;
  /** Schedule a workflow as a cron job. */
  scheduleRun(
    name: string,
    expression: string,
    classification: ClassificationLevel,
  ): Record<string, unknown>;
  /** Remove a socket from all subscriptions. */
  removeSocket(socket: WebSocket): void;
}

/** Options for creating a TidepoolWorkflowsHandler. */
export interface WorkflowsHandlerOptions {
  readonly store: MinimalWorkflowStore;
  readonly registry: MinimalRunRegistry;
  readonly workflowExecutor?: WorkflowExecutorFn;
  readonly cronManager?: MinimalCronManager;
}

/** Create a TidepoolWorkflowsHandler. */
export function createTidepoolWorkflowsHandler(
  store: MinimalWorkflowStore,
  registry: MinimalRunRegistry,
  options?: {
    readonly workflowExecutor?: WorkflowExecutorFn;
    readonly cronManager?: MinimalCronManager;
  },
): TidepoolWorkflowsHandler {
  const workflowExecutor = options?.workflowExecutor;
  const cronManager = options?.cronManager;
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

    async fetchWorkflowList() {
      const workflows = await store.listWorkflowDefinitions("RESTRICTED");
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

    async fetchWorkflowDetail(name, sessionTaint) {
      const wf = await store.loadWorkflowDefinition(name, sessionTaint);
      if (!wf) {
        return {
          topic: "workflows",
          type: "workflow_detail",
          name,
          found: false,
        };
      }
      return {
        topic: "workflows",
        type: "workflow_detail",
        name: wf.name,
        found: true,
        yaml: wf.yaml,
        classification: wf.classification,
        savedAt: wf.savedAt,
        description: wf.description,
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

    async fetchRunHistory(sessionTaint, workflowName, limit) {
      const runs = await store.listWorkflowRuns(sessionTaint, {
        workflowName,
        limit: limit ?? 20,
      });
      return {
        topic: "workflows",
        type: "run_history",
        runs: runs.map((r) => ({
          runId: r.runId,
          workflowName: r.workflowName,
          status: r.status,
          startedAt: r.startedAt,
          completedAt: r.completedAt,
          taskCount: r.taskCount,
          error: r.error,
        })),
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

    async deleteWorkflow(name) {
      await store.deleteWorkflowDefinition(name);
      log.info("Workflow definition deleted via Tidepool", {
        operation: "deleteWorkflow",
        workflow: name,
      });
      return {
        topic: "workflows",
        type: "workflow_deleted",
        name,
        ok: true,
      };
    },

    async startRun(name, sessionTaint) {
      if (!workflowExecutor) {
        return {
          topic: "workflows",
          type: "start_result",
          name,
          ok: false,
          error: "Workflow executor not available",
        };
      }
      const wf = await store.loadWorkflowDefinition(name, sessionTaint);
      if (!wf) {
        return {
          topic: "workflows",
          type: "start_result",
          name,
          ok: false,
          error: `Workflow not found or classification too high: ${name}`,
        };
      }
      log.info("Starting workflow run via Tidepool", {
        operation: "startRun",
        workflow: name,
      });
      // Fire and forget — the registry events will update the UI
      workflowExecutor("workflow_run", { name }).catch((err: unknown) => {
        log.warn("Workflow run failed", {
          operation: "startRun",
          workflow: name,
          err,
        });
      });
      return {
        topic: "workflows",
        type: "start_result",
        name,
        ok: true,
      };
    },

    scheduleRun(name, expression, classification) {
      if (!cronManager) {
        return {
          topic: "workflows",
          type: "schedule_result",
          name,
          ok: false,
          error: "Cron manager not available",
        };
      }
      const task =
        `Run the saved workflow named "${name}" using the workflow_run tool.`;
      const result = cronManager.create({
        expression,
        task,
        classificationCeiling: classification,
      });
      if (!result.ok) {
        log.warn("Workflow schedule creation failed", {
          operation: "scheduleRun",
          workflow: name,
          expression,
          error: result.error,
        });
        return {
          topic: "workflows",
          type: "schedule_result",
          name,
          ok: false,
          error: result.error,
        };
      }
      log.info("Workflow scheduled via Tidepool", {
        operation: "scheduleRun",
        workflow: name,
        expression,
        jobId: result.value.id,
      });
      return {
        topic: "workflows",
        type: "schedule_result",
        name,
        ok: true,
        jobId: result.value.id,
        expression,
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
