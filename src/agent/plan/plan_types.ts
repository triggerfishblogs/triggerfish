/**
 * Plan manager interfaces and internal types.
 *
 * Defines the public PlanManager interface, its configuration options,
 * and the internal PendingPlan type used during the approval flow.
 *
 * @module
 */

import type { ImplementationPlan, PlanModeState } from "./types.ts";

/** Options for creating a PlanManager. */
export interface PlanManagerOptions {
  /** Base path for plan file persistence (e.g., workspace/plans). */
  readonly plansDir: string;
}

/** Manager for plan mode state and persistence. */
export interface PlanManager {
  /** Get the current plan mode state for a session. */
  getState(sessionId: string): PlanModeState;

  /** Enter plan mode. Returns JSON result string. */
  enter(sessionId: string, goal: string, scope?: string): string;

  /** Exit plan mode with a plan. Returns plan ID and markdown. */
  exit(
    sessionId: string,
    plan: ImplementationPlan,
  ): Promise<{ readonly planId: string; readonly markdown: string }>;

  /** Get status for a session. Returns JSON string. */
  status(sessionId: string): string;

  /** Approve pending plan. Returns plan ID or null if no pending plan. */
  approve(sessionId: string): string | null;

  /** Reject pending plan. Returns JSON result string. */
  reject(sessionId: string): string;

  /** Mark a step as complete. Returns JSON result string. */
  stepComplete(
    sessionId: string,
    stepId: number,
    verificationResult: string,
  ): string;

  /** Mark the entire plan as complete. Returns JSON result string. */
  complete(
    sessionId: string,
    summary: string,
    deviations?: readonly string[],
  ): string;

  /** Modify a step in the active plan. Returns JSON result string. */
  modify(
    sessionId: string,
    stepId: number,
    reason: string,
    newDescription: string,
    newFiles?: readonly string[],
    newVerification?: string,
  ): string;

  /** Check if a tool is blocked for a session in plan mode. */
  isToolBlocked(
    sessionId: string,
    toolName: string,
    args?: Record<string, unknown>,
  ): boolean;
}

/** Pending plan awaiting user approval. */
export interface PendingPlan {
  readonly goal: string;
  readonly plan: ImplementationPlan;
  readonly planId: string;
}
