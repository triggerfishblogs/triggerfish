/**
 * Tidepool workflows host handler — bridges store/registry to WebSocket topics.
 * @module
 */

import { createLogger } from "../../../core/logger/logger.ts";
import type { ClassificationLevel } from "../../../core/types/classification.ts";
import { trySendSocketPayload } from "./host_broadcast.ts";
import type {
  MinimalCronManager,
  MinimalRunRegistry,
  MinimalWorkflowStore,
  RegistryEventShape,
  TidepoolWorkflowsHandler,
  WorkflowExecutorFn,
} from "./host_workflows_types.ts";

export type {
  TidepoolWorkflowsHandler,
  WorkflowsHandlerOptions,
} from "./host_workflows_types.ts";

const log = createLogger("tidepool-workflows");

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
      return dispatchControlAction(registry, runId, action);
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

    startRun(name, sessionTaint) {
      return dispatchStartRun(store, workflowExecutor, name, sessionTaint);
    },

    scheduleRun(name, expression, classification) {
      return dispatchScheduleRun(cronManager, name, expression, classification);
    },

    removeSocket(socket) {
      subscribers.delete(socket);
    },
  };
}

/** Dispatch a control action (stop/pause/unpause) to the registry. */
function dispatchControlAction(
  registry: MinimalRunRegistry,
  runId: string,
  action: string,
): Record<string, unknown> {
  const dispatch: Record<string, () => boolean> = {
    stop: () => registry.stopRun(runId),
    pause: () => registry.pauseRun(runId),
    unpause: () => registry.unpauseRun(runId),
  };
  const handler = dispatch[action];
  if (!handler) {
    return {
      topic: "workflows",
      type: "control_result",
      runId,
      action,
      ok: false,
      error: `Unknown control action: ${action}`,
    };
  }
  return {
    topic: "workflows",
    type: "control_result",
    runId,
    action,
    ok: handler(),
  };
}

/** Start a workflow run via the executor. */
async function dispatchStartRun(
  store: MinimalWorkflowStore,
  workflowExecutor: WorkflowExecutorFn | undefined,
  name: string,
  sessionTaint: string,
): Promise<Record<string, unknown>> {
  if (!workflowExecutor) {
    return {
      topic: "workflows",
      type: "start_result",
      name,
      ok: false,
      error: "Workflow executor not available",
    };
  }
  const wf = await store.loadWorkflowDefinition(
    name,
    sessionTaint as ClassificationLevel,
  );
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
  workflowExecutor("workflow_run", { name }).catch((err: unknown) => {
    log.warn("Workflow run failed", {
      operation: "startRun",
      workflow: name,
      err,
    });
  });
  return { topic: "workflows", type: "start_result", name, ok: true };
}

/** Schedule a workflow as a cron job. */
function dispatchScheduleRun(
  cronManager: MinimalCronManager | undefined,
  name: string,
  expression: string,
  classification: ClassificationLevel,
): Record<string, unknown> {
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
}

/** Broadcast a registry event to all subscribed WebSocket clients. */
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
