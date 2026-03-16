/**
 * Workflows screen type definitions.
 *
 * Types for the workflow visualization panel in Tidepool,
 * covering saved workflow listings, active run state, and
 * run tree nodes for execution visualization.
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";
import type { HealingPhase } from "../../../core/types/healing.ts";

/** Summary of a saved workflow definition for the list view. */
export interface WorkflowListEntry {
  readonly name: string;
  readonly description?: string;
  readonly classification: ClassificationLevel;
  readonly savedAt: string;
}

/** Active workflow run as seen by the UI. */
export interface WorkflowActiveRun {
  readonly runId: string;
  readonly workflowName: string;
  readonly status: "running" | "paused" | "cancelled";
  readonly currentTaskIndex: number;
  readonly currentTaskName: string;
  readonly startedAt: string;
  readonly paused: boolean;
  readonly taint?: ClassificationLevel;
}

/** A node in the run tree visualization. */
export interface RunTreeNode {
  readonly taskIndex: number;
  readonly taskName: string;
  readonly status: "pending" | "running" | "completed" | "failed" | "skipped";
  readonly taintBefore?: ClassificationLevel;
  readonly taintAfter?: ClassificationLevel;
  readonly duration?: number;
  readonly error?: string;
  readonly healingPhase?: HealingPhase;
  readonly attemptNumber?: number;
  readonly branchTaken?: string;
}

/** Full run tree for an active or completed workflow. */
export interface WorkflowRunTree {
  readonly runId: string;
  readonly workflowName: string;
  readonly nodes: readonly RunTreeNode[];
  readonly taint?: ClassificationLevel;
}

/** Event types emitted on the workflows WebSocket topic. */
export type WorkflowScreenEventType =
  | "workflow_list"
  | "active_runs"
  | "run_event"
  | "run_started"
  | "run_stopped"
  | "run_paused"
  | "run_unpaused"
  | "task_progress"
  | "run_completed"
  | "control_result"
  | "step_event"
  | "run_detail"
  | "healing_status"
  | "version_result";
