/**
 * Inline tool definitions for cron scheduling operations.
 *
 * Cron create/list/delete/history are defined inline because
 * they are wired directly in the gateway executor.
 *
 * @module
 */

import type { ToolDefinition } from "../../core/types/tool.ts";

function buildCronCreateDef(): ToolDefinition {
  return {
    name: "cron_create",
    description:
      "Create a scheduled cron job. The task runs on the given cron schedule.",
    parameters: {
      expression: {
        type: "string",
        description: "5-field cron expression (e.g. '0 9 * * *' for 9am daily)",
        required: true,
      },
      task: {
        type: "string",
        description: "The task/prompt to execute on each trigger",
        required: true,
      },
      classification: {
        type: "string",
        description:
          "Classification ceiling: PUBLIC, INTERNAL, CONFIDENTIAL, or RESTRICTED",
        required: false,
      },
    },
  };
}

function buildCronListDef(): ToolDefinition {
  return {
    name: "cron_list",
    description:
      "List all registered cron jobs with their schedules and status.",
    parameters: {},
  };
}

function buildCronDeleteDef(): ToolDefinition {
  return {
    name: "cron_delete",
    description: "Delete a cron job by its ID.",
    parameters: {
      job_id: {
        type: "string",
        description: "The UUID of the cron job to delete",
        required: true,
      },
    },
  };
}

function buildCronHistoryDef(): ToolDefinition {
  return {
    name: "cron_history",
    description: "Show recent execution history for a cron job.",
    parameters: {
      job_id: {
        type: "string",
        description: "The UUID of the cron job",
        required: true,
      },
    },
  };
}

/** Cron scheduling tools: cron_create, cron_list, cron_delete, cron_history. */
export function getCronInlineDefinitions(): readonly ToolDefinition[] {
  return [
    buildCronCreateDef(),
    buildCronListDef(),
    buildCronDeleteDef(),
    buildCronHistoryDef(),
  ];
}
