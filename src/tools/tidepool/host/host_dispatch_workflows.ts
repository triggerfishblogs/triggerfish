/**
 * Topic dispatcher for the workflows screen.
 *
 * Routes workflow list, detail, start, schedule, control, history,
 * and delete actions to the TidepoolWorkflowsHandler.
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";
import type { TopicHandler } from "./host_types.ts";
import type { TidepoolWorkflowsHandler } from "./host_workflows.ts";
import { createLogger } from "../../../core/logger/mod.ts";
import { reply } from "./host_dispatch_simple.ts";

const log = createLogger("tidepool-dispatch");

/** Create a topic handler for the workflows screen. */
export function createWorkflowsTopicDispatcher(
  handler: TidepoolWorkflowsHandler,
  sessionTaintProvider: () => string,
): TopicHandler {
  return (message, socket) => {
    const action = message.action as string;
    const payload = (message.payload ?? {}) as Record<string, unknown>;

    const dispatch: Record<string, () => void> = {
      list_workflows: () => dispatchListWorkflows(handler, socket),
      list_active: () => reply(socket, handler.fetchActiveRuns()),
      subscribe_live: () => dispatchSubscribeLive(handler, socket),
      unsubscribe_live: () => handler.unsubscribeLive(socket),
      control: () => dispatchControl(handler, socket, payload),
      get_workflow: () => dispatchGetWorkflow(handler, socket, payload),
      get_history: () => dispatchGetHistory(handler, socket, payload),
      start: () =>
        dispatchStart(handler, socket, payload, sessionTaintProvider),
      schedule: () =>
        dispatchSchedule(handler, socket, payload, sessionTaintProvider),
      delete_workflow: () => dispatchDeleteWorkflow(handler, socket, payload),
    };

    dispatch[action]?.();
  };
}

/** Dispatch list_workflows action. */
function dispatchListWorkflows(
  handler: TidepoolWorkflowsHandler,
  socket: WebSocket,
): void {
  handler.fetchWorkflowList().then((data) => reply(socket, data)).catch(
    (err: unknown) => {
      log.warn("Workflows list dispatch failed", {
        operation: "list_workflows",
        err,
      });
      reply(socket, {
        topic: "workflows",
        type: "workflow_list",
        workflows: [],
      });
    },
  );
}

/** Dispatch subscribe_live action. */
function dispatchSubscribeLive(
  handler: TidepoolWorkflowsHandler,
  socket: WebSocket,
): void {
  handler.subscribeLive(socket);
  reply(socket, handler.fetchActiveRuns());
}

/** Dispatch control action. */
function dispatchControl(
  handler: TidepoolWorkflowsHandler,
  socket: WebSocket,
  payload: Record<string, unknown>,
): void {
  const runId = payload.runId as string;
  const controlAction = payload.action as string;
  if (runId && controlAction) {
    reply(socket, handler.controlRun(runId, controlAction));
  }
}

/** Dispatch get_workflow action. */
function dispatchGetWorkflow(
  handler: TidepoolWorkflowsHandler,
  socket: WebSocket,
  payload: Record<string, unknown>,
): void {
  const name = payload.name as string;
  if (!name) return;
  handler
    .fetchWorkflowDetail(name, "RESTRICTED" as ClassificationLevel)
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

/** Dispatch get_history action. */
function dispatchGetHistory(
  handler: TidepoolWorkflowsHandler,
  socket: WebSocket,
  payload: Record<string, unknown>,
): void {
  const workflowName = payload.workflowName as string | undefined;
  const limit = payload.limit as number | undefined;
  handler
    .fetchRunHistory("RESTRICTED" as ClassificationLevel, workflowName, limit)
    .then((data) => reply(socket, data))
    .catch((err: unknown) => {
      log.warn("Workflow run history fetch failed", {
        operation: "get_history",
        err,
      });
      reply(socket, { topic: "workflows", type: "run_history", runs: [] });
    });
}

/** Dispatch start action. */
function dispatchStart(
  handler: TidepoolWorkflowsHandler,
  socket: WebSocket,
  payload: Record<string, unknown>,
  sessionTaintProvider: () => string,
): void {
  const name = payload.name as string;
  if (!name) return;
  const taint = sessionTaintProvider();
  handler
    .startRun(name, taint as ClassificationLevel)
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
        error: "Workflow start dispatch failed",
      });
    });
}

/** Dispatch schedule action. */
function dispatchSchedule(
  handler: TidepoolWorkflowsHandler,
  socket: WebSocket,
  payload: Record<string, unknown>,
  sessionTaintProvider: () => string,
): void {
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
        classification as ClassificationLevel,
      ),
    );
  }
}

/** Dispatch delete_workflow action. */
function dispatchDeleteWorkflow(
  handler: TidepoolWorkflowsHandler,
  socket: WebSocket,
  payload: Record<string, unknown>,
): void {
  const name = payload.name as string;
  if (!name) return;
  handler.deleteWorkflow(name).then((data) => reply(socket, data)).catch(
    (err: unknown) => {
      log.warn("Workflow delete dispatch failed", {
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
    },
  );
}
