/**
 * Workflow tool definitions and executor for LLM-callable tools.
 *
 * Follows the standard Triggerfish tool registration pattern:
 * - `getWorkflowToolDefinitions()` returns tool definitions
 * - `createWorkflowToolExecutor()` returns a subsystem executor
 * - `WORKFLOW_SYSTEM_PROMPT` provides LLM guidance
 * @module
 */

import type { ToolDefinition } from "../core/types/tool.ts";
import type { ClassificationLevel } from "../core/types/classification.ts";
import type { WorkflowStore } from "./store.ts";
import type { WorkflowToolExecutor } from "./engine.ts";
import type { WorkflowDefinition } from "./types.ts";
import { executeWorkflow } from "./engine.ts";
import { parseWorkflowYaml } from "./parser.ts";

/** System prompt section for workflow tools. */
export const WORKFLOW_SYSTEM_PROMPT = `## Workflow Engine

You can create, store, and execute CNCF Serverless Workflow DSL 1.0 workflows.

### CRITICAL: Workflow Creation Process

When a user asks you to create or build a workflow, you MUST follow this process.
Do NOT skip steps. Do NOT generate a workflow immediately from a vague request.

**Step 1 — Gather Requirements (MANDATORY)**
Ask the user about ALL of the following before writing any YAML:
- What is the goal? What problem does this solve?
- What are the inputs? (What data does the workflow start with?)
- What are the expected outputs? (What should the user get back?)
- What is the step-by-step flow? (Walk through each action in order)
- What services/APIs/data sources are involved?
- What should happen on errors or edge cases?
- Should results be saved to memory, sent to a channel, or returned directly?

Do NOT assume defaults. Ask specific questions. A request like "build a workflow
for checking GitHub issues" is NOT enough — you need: which repo, what filters,
what to do with the results, where to send them, what format, etc.

**Step 2 — Design with llm_task (MANDATORY)**
Once you have the user's requirements, use \`llm_task\` to design the workflow.
Give the sub-agent the full requirements and ask it to produce:
- The complete task sequence with specific call types and parameters
- Input schema (what the workflow expects)
- Output schema (what it produces)
- Error handling strategy
- Any edge cases to address

Review the design. If anything is unclear, ask the user before proceeding.

**Step 3 — Present the Plan and Get Approval (MANDATORY)**
Present the designed workflow to the user BEFORE saving. Show:
- A summary of what each task does
- The input parameters and their types
- The expected output
- Error handling behavior

Then ask: "Does this look right? Should I save this workflow?"
Do NOT call \`workflow_save\` until the user explicitly approves.

**Step 4 — Save**
Only after approval, use \`workflow_save\` to store it. This saves to the central
database — the workflow is immediately available to all sessions, cron jobs, and
triggers. Show the user the exact \`workflow_run\` command with example input.

**Step 5 — Offer to Test or Schedule**
Ask if the user wants to:
- Run it now (ask for actual input values)
- Schedule it with a cron job (use the \`cron\` tool with action \`create\`)

### Task Types
- \`call:\` — HTTP, triggerfish:llm, triggerfish:memory, triggerfish:web_search, triggerfish:web_fetch, triggerfish:mcp, triggerfish:message, triggerfish:agent
- \`run:\` — Shell commands, scripts, sub-workflows
- \`set:\` — Assign data context values
- \`switch:\` — Conditional branching
- \`for:\` — Iterate over collections
- \`raise:\` — Halt with error
- \`emit:\` — Record event
- \`wait:\` — Pause

### Expression Syntax
\`\${ .path.to.value }\` for interpolation. Supports dot-paths, comparisons, arithmetic.
`;

/** Context needed by the workflow tool executor. */
export interface WorkflowToolContext {
  readonly store: WorkflowStore;
  readonly toolExecutor: WorkflowToolExecutor;
  readonly getSessionTaint: () => ClassificationLevel;
  readonly resolveSubWorkflow?: (
    name: string,
  ) => Promise<WorkflowDefinition | null>;
}

/** Return all workflow tool definitions. */
export function getWorkflowToolDefinitions(): readonly ToolDefinition[] {
  return [
    buildWorkflowRunDef(),
    buildWorkflowSaveDef(),
    buildWorkflowListDef(),
    buildWorkflowGetDef(),
    buildWorkflowDeleteDef(),
    buildWorkflowHistoryDef(),
  ];
}

/** Create the workflow subsystem executor. */
export function createWorkflowToolExecutor(
  ctx: WorkflowToolContext,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  const executors: Record<
    string,
    (input: Record<string, unknown>) => Promise<string>
  > = {
    workflow_run: (input) => executeWorkflowRun(ctx, input),
    workflow_save: (input) => executeWorkflowSave(ctx, input),
    workflow_list: (input) => executeWorkflowList(ctx, input),
    workflow_get: (input) => executeWorkflowGet(ctx, input),
    workflow_delete: (input) => executeWorkflowDelete(ctx, input),
    workflow_history: (input) => executeWorkflowHistory(ctx, input),
  };

  return (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    const handler = executors[name];
    if (!handler) return Promise.resolve(null);
    return handler(input);
  };
}

// --- Tool Definitions ---

function buildWorkflowRunDef(): ToolDefinition {
  return {
    name: "workflow_run",
    description:
      "Execute a workflow by name or from inline YAML. Returns the workflow output and execution status.",
    parameters: {
      name: {
        type: "string",
        description: "Name of a saved workflow to execute",
      },
      yaml: {
        type: "string",
        description:
          "Inline YAML workflow definition (used when not referencing a saved workflow)",
      },
      input: {
        type: "string",
        description: "JSON string of input data for the workflow",
      },
    },
  };
}

function buildWorkflowSaveDef(): ToolDefinition {
  return {
    name: "workflow_save",
    description:
      "Parse, validate, and store a workflow definition. The workflow is saved at the current session's classification level.",
    parameters: {
      name: {
        type: "string",
        description: "Name for the workflow",
        required: true,
      },
      yaml: {
        type: "string",
        description: "YAML workflow definition",
        required: true,
      },
      description: {
        type: "string",
        description: "Optional description of what the workflow does",
      },
    },
  };
}

function buildWorkflowListDef(): ToolDefinition {
  return {
    name: "workflow_list",
    description:
      "List all saved workflows accessible at the current classification level.",
    parameters: {},
  };
}

function buildWorkflowGetDef(): ToolDefinition {
  return {
    name: "workflow_get",
    description: "Retrieve a saved workflow definition by name.",
    parameters: {
      name: {
        type: "string",
        description: "Name of the workflow to retrieve",
        required: true,
      },
    },
  };
}

function buildWorkflowDeleteDef(): ToolDefinition {
  return {
    name: "workflow_delete",
    description: "Delete a saved workflow by name.",
    parameters: {
      name: {
        type: "string",
        description: "Name of the workflow to delete",
        required: true,
      },
    },
  };
}

function buildWorkflowHistoryDef(): ToolDefinition {
  return {
    name: "workflow_history",
    description:
      "View past workflow execution results. Optionally filter by workflow name.",
    parameters: {
      workflow_name: {
        type: "string",
        description: "Filter by workflow name",
      },
      limit: {
        type: "string",
        description: "Maximum number of results (default 10)",
      },
    },
  };
}

// --- Tool Executors ---

async function executeWorkflowRun(
  ctx: WorkflowToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const definition = await resolveWorkflowDefinition(ctx, input);
  if (typeof definition === "string") return definition;

  const workflowInput = parseJsonInput(input.input as string | undefined);
  const resolveSubWorkflow = buildSubWorkflowResolver(ctx);

  const result = await executeWorkflow({
    definition,
    input: workflowInput,
    toolExecutor: ctx.toolExecutor,
    getSessionTaint: ctx.getSessionTaint,
    resolveSubWorkflow,
  });

  if (!result.ok) {
    return JSON.stringify({ error: result.error });
  }

  await ctx.store.saveWorkflowRun(result.value);
  return JSON.stringify(result.value);
}

async function executeWorkflowSave(
  ctx: WorkflowToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const name = input.name as string | undefined;
  const yaml = input.yaml as string | undefined;

  if (!name || !yaml) {
    return JSON.stringify({
      error: "Workflow save requires 'name' and 'yaml' parameters",
    });
  }

  const parsed = parseWorkflowYaml(yaml);
  if (!parsed.ok) {
    return JSON.stringify({
      error: `Workflow validation failed: ${parsed.error}`,
    });
  }

  const classification = ctx.getSessionTaint();
  const description = input.description as string | undefined;

  await ctx.store.saveWorkflowDefinition(
    name,
    yaml,
    classification,
    description,
  );

  return JSON.stringify({
    saved: name,
    classification,
    taskCount: parsed.value.do.length,
  });
}

async function executeWorkflowList(
  ctx: WorkflowToolContext,
  _input: Record<string, unknown>,
): Promise<string> {
  const taint = ctx.getSessionTaint();
  const workflows = await ctx.store.listWorkflowDefinitions(taint);

  const summary = workflows.map((w) => ({
    name: w.name,
    classification: w.classification,
    savedAt: w.savedAt,
    description: w.description,
  }));

  return JSON.stringify({ workflows: summary });
}

async function executeWorkflowGet(
  ctx: WorkflowToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const name = input.name as string | undefined;
  if (!name) {
    return JSON.stringify({ error: "Workflow get requires 'name' parameter" });
  }

  const taint = ctx.getSessionTaint();
  const stored = await ctx.store.loadWorkflowDefinition(name, taint);
  if (!stored) {
    return JSON.stringify({
      error: `Workflow not found or not accessible: ${name}`,
    });
  }

  return JSON.stringify({
    name: stored.name,
    classification: stored.classification,
    savedAt: stored.savedAt,
    description: stored.description,
    yaml: stored.yaml,
  });
}

async function executeWorkflowDelete(
  ctx: WorkflowToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const name = input.name as string | undefined;
  if (!name) {
    return JSON.stringify({
      error: "Workflow delete requires 'name' parameter",
    });
  }

  await ctx.store.deleteWorkflowDefinition(name);
  return JSON.stringify({ deleted: name });
}

async function executeWorkflowHistory(
  ctx: WorkflowToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const workflowName = input.workflow_name as string | undefined;
  const limit = parseInt(String(input.limit ?? "10"), 10);

  const runs = await ctx.store.listWorkflowRuns({
    workflowName,
    limit: isNaN(limit) ? 10 : limit,
  });

  const summary = runs.map((r) => ({
    runId: r.runId,
    workflowName: r.workflowName,
    status: r.status,
    startedAt: r.startedAt,
    completedAt: r.completedAt,
    taskCount: r.taskCount,
    error: r.error,
  }));

  return JSON.stringify({ runs: summary });
}

// --- Helpers ---

async function resolveWorkflowDefinition(
  ctx: WorkflowToolContext,
  input: Record<string, unknown>,
): Promise<WorkflowDefinition | string> {
  const name = input.name as string | undefined;
  const yaml = input.yaml as string | undefined;

  if (yaml) {
    const parsed = parseWorkflowYaml(yaml);
    if (!parsed.ok) {
      return JSON.stringify({
        error: `Workflow validation failed: ${parsed.error}`,
      });
    }
    return parsed.value;
  }

  if (name) {
    const taint = ctx.getSessionTaint();
    const stored = await ctx.store.loadWorkflowDefinition(name, taint);
    if (!stored) {
      return JSON.stringify({
        error: `Workflow not found or not accessible: ${name}`,
      });
    }
    const parsed = parseWorkflowYaml(stored.yaml);
    if (!parsed.ok) {
      return JSON.stringify({
        error: `Stored workflow has invalid YAML: ${parsed.error}`,
      });
    }
    return parsed.value;
  }

  return JSON.stringify({
    error: "workflow_run requires either 'name' or 'yaml' parameter",
  });
}

function parseJsonInput(
  raw: string | undefined,
): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function buildSubWorkflowResolver(
  ctx: WorkflowToolContext,
): (name: string) => Promise<WorkflowDefinition | null> {
  if (ctx.resolveSubWorkflow) return ctx.resolveSubWorkflow;

  return async (name: string): Promise<WorkflowDefinition | null> => {
    const taint = ctx.getSessionTaint();
    const stored = await ctx.store.loadWorkflowDefinition(name, taint);
    if (!stored) return null;
    const parsed = parseWorkflowYaml(stored.yaml);
    if (!parsed.ok) return null;
    return parsed.value;
  };
}
