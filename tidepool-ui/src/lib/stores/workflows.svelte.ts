/**
 * Workflows store — saved workflows, active runs, selection.
 */

import type { WorkflowActiveRun, WorkflowListEntry } from "../types.js";
import { onTopic, send } from "./websocket.svelte.js";

/** Saved workflow definitions. */
let _workflows: WorkflowListEntry[] = $state([]);

/** Active runs. */
let _activeRuns: WorkflowActiveRun[] = $state([]);

/** Selected workflow name. */
let _selectedWorkflow: string | null = $state(null);

/** Selected workflow detail data. */
let _workflowDetail: Record<string, unknown> | null = $state(null);

/** Get saved workflow definitions. */
export function getWorkflows(): WorkflowListEntry[] {
  return _workflows;
}

/** Get active runs. */
export function getActiveRuns(): WorkflowActiveRun[] {
  return _activeRuns;
}

/** Get selected workflow name. */
export function getSelectedWorkflow(): string | null {
  return _selectedWorkflow;
}

/** Get selected workflow detail data. */
export function getWorkflowDetail(): Record<string, unknown> | null {
  return _workflowDetail;
}

/** Request workflow list. */
export function requestWorkflowList(): void {
  send({ topic: "workflows", action: "list_workflows" });
}

/** Request workflow detail. */
export function requestWorkflowDetail(name: string): void {
  _selectedWorkflow = name;
  send({ topic: "workflows", action: "get_workflow", payload: { name } });
}

/** Request active runs. */
export function requestActiveRuns(): void {
  send({ topic: "workflows", action: "list_active" });
}

/** Start a workflow. */
export function startWorkflow(name: string): void {
  send({ topic: "workflows", action: "start", payload: { name } });
}

/** Control a run (pause, unpause, stop). */
export function controlRun(
  runId: string,
  action: "pause" | "unpause" | "stop",
): void {
  send({ topic: "workflows", action: "control", payload: { runId, action } });
}

/** Delete a saved workflow. */
export function deleteWorkflow(name: string): void {
  send({ topic: "workflows", action: "delete_workflow", payload: { name } });
}

/** Schedule a workflow as a cron job. */
export function scheduleWorkflow(name: string, expression: string): void {
  send({
    topic: "workflows",
    action: "schedule",
    payload: { name, expression },
  });
}

/** Request run history for a workflow. */
export function requestWorkflowHistory(name: string): void {
  send({ topic: "workflows", action: "get_history", payload: { name } });
}

/** Subscribe to live updates. */
export function subscribeLive(): void {
  send({ topic: "workflows", action: "subscribe_live" });
}

/** Unsubscribe from live updates. */
export function unsubscribeLive(): void {
  send({ topic: "workflows", action: "unsubscribe_live" });
}

function handleMessage(msg: Record<string, unknown>): void {
  switch (msg.type) {
    case "workflow_list":
      _workflows = msg.workflows as WorkflowListEntry[];
      break;
    case "workflow_detail":
      _workflowDetail = msg as Record<string, unknown>;
      break;
    case "active_runs":
      _activeRuns = msg.runs as WorkflowActiveRun[];
      break;
    case "run_started":
    case "run_stopped":
    case "run_completed":
      requestActiveRuns();
      break;
    case "workflow_deleted":
      _workflows = _workflows.filter((w) => w.name !== msg.name);
      if (_selectedWorkflow === msg.name) {
        _selectedWorkflow = null;
        _workflowDetail = null;
      }
      break;
    case "run_paused":
    case "run_unpaused": {
      const runId = msg.runId as string;
      const idx = _activeRuns.findIndex((r) => r.runId === runId);
      if (idx >= 0) {
        _activeRuns[idx] = {
          ..._activeRuns[idx],
          paused: msg.type === "run_paused",
          status: msg.type === "run_paused" ? "paused" : "running",
        };
      }
      break;
    }
    case "task_progress": {
      const runId = msg.runId as string;
      const idx = _activeRuns.findIndex((r) => r.runId === runId);
      if (idx >= 0) {
        _activeRuns[idx] = {
          ..._activeRuns[idx],
          currentTaskIndex: msg.taskIndex as number,
          currentTaskName: msg.taskName as string,
        };
      }
      break;
    }
  }
}

onTopic("workflows", handleMessage);
