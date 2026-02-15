/**
 * Plan mode tool definitions.
 *
 * Defines the 8 plan tools available to the agent and the platform-level
 * system prompt section that introduces plan mode capabilities.
 *
 * @module
 */

import type { ToolDefinition } from "./orchestrator.ts";

/** Tool definitions for plan mode tools. */
export function getPlanToolDefinitions(): readonly ToolDefinition[] {
  return [
    {
      name: "plan_enter",
      description:
        "Enter plan mode. Constrains the agent to read-only exploration and planning. " +
        "write_file and cron_create/cron_delete are blocked until plan_exit is called.",
      parameters: {
        goal: {
          type: "string",
          description: "What the agent is planning to build/change",
          required: true,
        },
        scope: {
          type: "string",
          description:
            "Optional: constrain exploration to specific directories or modules",
          required: false,
        },
      },
    },
    {
      name: "plan_exit",
      description:
        "Exit plan mode and present the implementation plan for user approval. " +
        "Does NOT automatically begin execution — the user must approve first.",
      parameters: {
        plan: {
          type: "object",
          description:
            "The implementation plan object: { summary, approach, alternatives_considered, " +
            "steps: [{ id, description, files, depends_on, verification }], risks, " +
            "files_to_create, files_to_modify, tests_to_write, estimated_complexity }",
          required: true,
        },
      },
    },
    {
      name: "plan_status",
      description:
        "Returns current plan mode state: mode, goal, active plan progress.",
      parameters: {},
    },
    {
      name: "plan_approve",
      description:
        "Approve the pending plan and begin execution. Call this when the user " +
        "approves the plan presented by plan_exit.",
      parameters: {},
    },
    {
      name: "plan_reject",
      description:
        "Reject the pending plan and return to normal mode. Call this when " +
        "the user rejects the plan or wants to start over.",
      parameters: {},
    },
    {
      name: "plan_step_complete",
      description:
        "Mark a plan step as complete during execution of an approved plan.",
      parameters: {
        step_id: {
          type: "number",
          description: "The step ID to mark as complete",
          required: true,
        },
        verification_result: {
          type: "string",
          description: "Output from the verification command",
          required: true,
        },
      },
    },
    {
      name: "plan_complete",
      description:
        "Mark the entire plan as complete. Call when all steps are done.",
      parameters: {
        summary: {
          type: "string",
          description: "What was accomplished",
          required: true,
        },
        deviations: {
          type: "array",
          description: "Any changes from the original plan",
          required: false,
          items: { type: "string" },
        },
      },
    },
    {
      name: "plan_modify",
      description:
        "Request a modification to an approved plan step. Requires user approval.",
      parameters: {
        step_id: {
          type: "number",
          description: "Which step needs changing",
          required: true,
        },
        reason: {
          type: "string",
          description: "Why the change is needed",
          required: true,
        },
        new_description: {
          type: "string",
          description: "Updated step description",
          required: true,
        },
        new_files: {
          type: "array",
          description: "Updated file list (optional)",
          required: false,
          items: { type: "string" },
        },
        new_verification: {
          type: "string",
          description: "Updated verification command (optional)",
          required: false,
        },
      },
    },
  ];
}

/**
 * Platform-level system prompt section for plan mode.
 *
 * Appended AFTER SPINE.md + tool definitions, alongside TODO_SYSTEM_PROMPT.
 * Briefly describes plan mode availability so the agent knows when to use it.
 */
export const PLAN_SYSTEM_PROMPT = `## Plan Mode

You have access to plan mode (plan_enter, plan_exit, plan_status, plan_approve, plan_reject, plan_step_complete, plan_complete, plan_modify) for structured planning before implementation.

When the user asks you to build, implement, create, refactor, or redesign something complex:
- Consider entering plan mode first with plan_enter
- Explore the codebase thoroughly before proposing changes
- Present a concrete plan via plan_exit for user approval
- After approval, execute step by step, marking progress with plan_step_complete

For simple tasks (fix a typo, add a comment, rename), skip plan mode and just do it.`;
