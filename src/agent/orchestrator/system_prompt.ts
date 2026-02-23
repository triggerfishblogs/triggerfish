/**
 * System prompt assembly for agent turns.
 *
 * Loads SPINE.md from disk, appends platform-level prompt sections,
 * and injects plan mode context when applicable.
 *
 * @module
 */

import { createLogger } from "../../core/logger/mod.ts";
import {
  buildAwaitingApprovalPrompt,
  buildPlanExecutionPrompt,
  buildPlanModePrompt,
} from "../plan/prompt.ts";
import type { PlanManager } from "../plan/plan.ts";
import { DEFAULT_SYSTEM_PROMPT } from "./orchestrator_types.ts";
import type { OrchestratorState } from "./orchestrator.ts";

/**
 * Load SPINE.md content from the filesystem.
 * Returns the file content or null if the file cannot be read.
 */
export async function readSpineFromDisk(
  spinePath: string | undefined,
): Promise<string | null> {
  if (!spinePath) return null;
  try {
    return await Deno.readTextFile(spinePath);
  } catch (err: unknown) {
    const log = createLogger("orchestrator");
    log.debug("SPINE.md not readable", {
      path: spinePath,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/** Append platform-level system prompt sections after SPINE.md. */
function appendSystemPromptSections(
  base: string,
  sections: readonly string[],
): string {
  let prompt = base;
  for (const section of sections) {
    prompt += "\n\n" + section;
  }
  return prompt;
}

/** Inject plan mode context into the system prompt. */
function appendPlanModeContext(
  systemPrompt: string,
  planManager: PlanManager,
  sessionKey: string,
): string {
  const planState = planManager.getState(sessionKey);
  let prompt = systemPrompt;
  if (planState.mode === "plan" && planState.goal) {
    prompt += "\n\n" + buildPlanModePrompt(planState.goal, planState.scope);
  }
  if (planState.mode === "awaiting_approval") {
    prompt += "\n\n" + buildAwaitingApprovalPrompt();
  }
  if (planState.activePlan) {
    prompt += "\n\n" + buildPlanExecutionPrompt(planState.activePlan);
  }
  return prompt;
}

/** Build the full system prompt for an agent turn. */
export async function buildFullSystemPrompt(
  state: OrchestratorState,
  sessionKey: string,
): Promise<string> {
  const spineContent = await readSpineFromDisk(state.config.spinePath);
  let systemPrompt = spineContent ?? DEFAULT_SYSTEM_PROMPT;

  const effectiveSections = state.getExtraSystemPromptSections
    ? [
      ...state.baseSystemPromptSections,
      ...state.getExtraSystemPromptSections(),
    ]
    : state.baseSystemPromptSections;
  systemPrompt = appendSystemPromptSections(systemPrompt, effectiveSections);

  if (state.planManager) {
    systemPrompt = appendPlanModeContext(
      systemPrompt,
      state.planManager,
      sessionKey,
    );
  }
  return systemPrompt;
}
