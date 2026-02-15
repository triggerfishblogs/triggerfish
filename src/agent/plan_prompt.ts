/**
 * Plan mode prompt templates.
 *
 * Pure functions that build the behavioral prompts injected into the
 * agent's system context during plan mode and plan execution.
 *
 * @module
 */

import type { ActivePlan, ImplementationPlan } from "./plan_types.ts";

/**
 * Build the plan mode system prompt injection.
 *
 * Injected into system context while `mode === "plan"`.
 * Constrains the agent to read-only exploration and planning.
 */
export function buildPlanModePrompt(goal: string, scope?: string): string {
  const scopeLine = scope ? `\nScope: ${scope}` : "";
  return `PLAN MODE ACTIVE — Goal: ${goal}${scopeLine}

You are in plan mode. Focus on exploring the codebase and designing an implementation approach.

In plan mode, you MUST:
1. Use explore to understand the codebase structure, patterns, and conventions
2. Use explore with focus to investigate specific areas relevant to your goal
3. Use read_file for targeted deep-reads of specific files explore identified
4. Use search_files for specific pattern searches explore didn't cover
5. Use run_command for read-only commands (grep, find, wc, cat, head, etc.)
6. Design a concrete, step-by-step implementation strategy based on what you found

Start broad (explore the root or relevant module), then narrow (explore + focus
on specific concerns).

You MUST NOT:
- Write or edit any files (write_file is blocked)
- Create or delete cron jobs (cron_create, cron_delete are blocked)
- Make any changes to the codebase
- Skip exploration and jump to a plan without evidence

When you have a complete plan, call plan_exit with your implementation plan.
If you need clarification from the user, ask before finalizing.`;
}

/**
 * Build a prompt for the awaiting-approval state.
 *
 * Tells the agent that a plan is pending and the user's next message
 * is their response to the plan.
 */
export function buildAwaitingApprovalPrompt(): string {
  return `A plan is awaiting user approval. The user's message is their response to the plan you presented.

- If they approve, call plan_approve to begin execution.
- If they want changes, discuss modifications and call plan_enter to re-plan if needed.
- If they reject, call plan_reject to return to normal mode.`;
}

/**
 * Build the plan execution prompt injected after a plan is approved.
 *
 * Shows the plan steps with completion status and execution rules.
 */
export function buildPlanExecutionPrompt(activePlan: ActivePlan): string {
  const { plan, completedSteps, currentStep } = activePlan;

  const stepsFormatted = plan.steps.map((step) => {
    const checked = completedSteps.includes(step.id) ? "[x]" : "[ ]";
    const current = step.id === currentStep ? " <-- CURRENT" : "";
    const deps = step.depends_on.length > 0
      ? `\n  Depends on: Step ${step.depends_on.join(", Step ")}`
      : "";
    return `- ${checked} **Step ${step.id}:** ${step.description}${current}\n  Files: ${step.files.join(", ") || "(none)"}${deps}\n  Verify: \`${step.verification || "(none)"}\``;
  }).join("\n\n");

  return `APPROVED PLAN — Executing: ${activePlan.id}

You have an approved implementation plan. Execute it step by step.

Plan summary: ${plan.summary}

Steps:
${stepsFormatted}

Rules:
- Execute ONE step at a time
- After each step, run the verification command specified in the plan
- If verification fails, fix before moving to the next step
- If you discover the plan needs modification, call plan_modify and explain why
- Check off completed steps by calling plan_step_complete
- When all steps are done, call plan_complete`;
}

/**
 * Format an implementation plan as markdown for persistence and display.
 */
export function formatPlanAsMarkdown(
  planId: string,
  goal: string,
  plan: ImplementationPlan,
  status = "Pending Approval",
): string {
  const alternatives = plan.alternatives_considered.length > 0
    ? plan.alternatives_considered.map((a) => `- ${a}`).join("\n")
    : "- None considered";

  const steps = plan.steps.map((step) => {
    const deps = step.depends_on.length > 0
      ? `Step ${step.depends_on.join(", Step ")}`
      : "\u2014";
    return `- [ ] **Step ${step.id}:** ${step.description}\n  - Files: ${step.files.join(", ") || "(none)"}\n  - Depends on: ${deps}\n  - Verify: \`${step.verification || "(none)"}\``;
  }).join("\n\n");

  const createFiles = plan.files_to_create.length > 0
    ? plan.files_to_create.map((f) => `- ${f}`).join("\n")
    : "- None";
  const modifyFiles = plan.files_to_modify.length > 0
    ? plan.files_to_modify.map((f) => `- ${f}`).join("\n")
    : "- None";
  const testFiles = plan.tests_to_write.length > 0
    ? plan.tests_to_write.map((f) => `- ${f}`).join("\n")
    : "- None";

  const risks = plan.risks.length > 0
    ? plan.risks.map((r) => `- ${r}`).join("\n")
    : "- None identified";

  return `# Implementation Plan: ${goal}

**Status:** ${status}
**Created:** ${new Date().toISOString()}
**Plan ID:** ${planId}

## Summary
${plan.summary}

## Approach
${plan.approach}

## Alternatives Considered
${alternatives}

## Steps

${steps}

## Files Affected
- **Create:**
${createFiles}
- **Modify:**
${modifyFiles}
- **Tests:**
${testFiles}

## Risks
${risks}

## Estimated Complexity
${plan.estimated_complexity}
`;
}
