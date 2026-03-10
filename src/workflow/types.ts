/**
 * Workflow engine type definitions for CNCF Serverless Workflow DSL 1.0.
 * @module
 */

import type { ClassificationLevel } from "../core/types/classification.ts";

/** Branded workflow identifier. */
export type WorkflowId = string & { readonly __brand: "WorkflowId" };

/** Create a WorkflowId from a raw string. */
export function createWorkflowId(id: string): WorkflowId {
  return id as WorkflowId;
}

/** Top-level workflow document metadata. */
export interface WorkflowDocument {
  readonly dsl: string;
  readonly namespace: string;
  readonly name: string;
  readonly version?: string;
  readonly description?: string;
}

/** A named task entry in a workflow's `do:` list. */
export interface WorkflowTaskEntry {
  readonly name: string;
  readonly task: WorkflowTask;
}

/** Union of all supported task types. */
export type WorkflowTask =
  | CallTask
  | RunTask
  | SetTask
  | SwitchTask
  | ForTask
  | RaiseTask
  | EmitTask
  | WaitTask;

/** Base fields shared by all task types. */
export interface TaskBase {
  readonly if?: string;
  readonly input?: TaskTransform;
  readonly output?: TaskTransform;
  readonly timeout?: TaskTimeout;
  readonly then?: TaskFlowDirective;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/** Expression-based input/output transform. */
export interface TaskTransform {
  readonly from?: string | Readonly<Record<string, string>>;
  readonly schema?: Readonly<Record<string, unknown>>;
}

/** Timeout configuration. */
export interface TaskTimeout {
  readonly after: string;
}

/** Flow directive: continue, end, or jump to a named task. */
export type TaskFlowDirective = "continue" | "end" | string;

/** Call task — dispatches to HTTP, GRPC, or custom function. */
export interface CallTask extends TaskBase {
  readonly type: "call";
  readonly call: string;
  readonly with?: Readonly<Record<string, unknown>>;
}

/** Run task — shell command, script, or sub-workflow. */
export interface RunTask extends TaskBase {
  readonly type: "run";
  readonly run: RunTaskTarget;
}

/** Target for a run task. */
export type RunTaskTarget =
  | RunShellTarget
  | RunScriptTarget
  | RunWorkflowTarget;

export interface RunShellTarget {
  readonly shell: {
    readonly command: string;
    readonly arguments?: Readonly<Record<string, string>>;
    readonly environment?: Readonly<Record<string, string>>;
  };
}

export interface RunScriptTarget {
  readonly script: {
    readonly language: string;
    readonly code: string;
    readonly arguments?: Readonly<Record<string, string>>;
  };
}

export interface RunWorkflowTarget {
  readonly workflow: {
    readonly name: string;
    readonly version?: string;
    readonly input?: Readonly<Record<string, unknown>>;
  };
}

/** Set task — assigns values to the data context. */
export interface SetTask extends TaskBase {
  readonly type: "set";
  readonly set: Readonly<Record<string, unknown>>;
}

/** Switch task — conditional branching. */
export interface SwitchTask extends TaskBase {
  readonly type: "switch";
  readonly switch: readonly SwitchCase[];
}

/** A single case in a switch task. */
export interface SwitchCase {
  readonly name: string;
  readonly when?: string;
  readonly then: TaskFlowDirective;
}

/** For task — iteration over a collection. */
export interface ForTask extends TaskBase {
  readonly type: "for";
  readonly for: ForTaskConfig;
  readonly do: readonly WorkflowTaskEntry[];
}

export interface ForTaskConfig {
  readonly each: string;
  readonly in: string;
  readonly at?: string;
}

/** Raise task — halt with an error. */
export interface RaiseTask extends TaskBase {
  readonly type: "raise";
  readonly raise: RaiseError;
}

export interface RaiseError {
  readonly error: {
    readonly status: number;
    readonly type: string;
    readonly title: string;
    readonly detail?: string;
  };
}

/** Emit task — record an event. */
export interface EmitTask extends TaskBase {
  readonly type: "emit";
  readonly emit: EmitEvent;
}

export interface EmitEvent {
  readonly event: {
    readonly type: string;
    readonly source?: string;
    readonly data?: Readonly<Record<string, unknown>>;
  };
}

/** Wait task — pause for a duration. */
export interface WaitTask extends TaskBase {
  readonly type: "wait";
  readonly wait: string;
}

/** Complete parsed workflow definition. */
export interface WorkflowDefinition {
  readonly document: WorkflowDocument;
  readonly do: readonly WorkflowTaskEntry[];
  readonly input?: TaskTransform;
  readonly output?: TaskTransform;
  readonly timeout?: TaskTimeout;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly classificationCeiling?: ClassificationLevel;
}

/** Execution status of a workflow run. */
export type WorkflowStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled";

/** Recorded event during workflow execution. */
export interface WorkflowEvent {
  readonly type: string;
  readonly source?: string;
  readonly data?: Readonly<Record<string, unknown>>;
  readonly timestamp: string;
}

/** State of a single workflow execution. */
export interface WorkflowRunState {
  readonly id: string;
  readonly workflowId: WorkflowId;
  readonly workflowName: string;
  readonly status: WorkflowStatus;
  readonly currentTaskIndex: number;
  readonly currentTaskName: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly output?: Readonly<Record<string, unknown>>;
  readonly error?: string;
  readonly events: readonly WorkflowEvent[];
  readonly startedAt: string;
  readonly completedAt?: string;
}

/** Result returned after workflow execution. */
export interface WorkflowRunResult {
  readonly runId: string;
  readonly workflowName: string;
  readonly status: WorkflowStatus;
  readonly output: Readonly<Record<string, unknown>>;
  readonly events: readonly WorkflowEvent[];
  readonly error?: string;
  readonly startedAt: string;
  readonly completedAt: string;
  readonly taskCount: number;
  readonly classification?: ClassificationLevel;
}
