/**
 * Type definitions for the Tidepool workflows host handler.
 *
 * Minimal interfaces that avoid cross-layer imports from the
 * workflow module while keeping the handler fully typed.
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";

/** Minimal workflow store interface to avoid cross-layer imports. */
export interface MinimalWorkflowStore {
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
export type WorkflowExecutorFn = (
  name: string,
  input: Record<string, unknown>,
) => Promise<string | null>;

/** Minimal cron manager interface to avoid cross-layer imports. */
export interface MinimalCronManager {
  create(options: {
    readonly expression: string;
    readonly task: string;
    readonly classificationCeiling: ClassificationLevel;
  }): { ok: true; value: { id: string } } | { ok: false; error: string };
}

/** Minimal run registry interface to avoid cross-layer imports. */
export interface MinimalRunRegistry {
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
export interface RegistryEventShape {
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
