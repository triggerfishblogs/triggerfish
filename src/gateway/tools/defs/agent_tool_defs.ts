/**
 * Inline tool definitions for agent meta-operations.
 *
 * Subagent spawning and agent listing are defined inline because
 * they are wired directly in the gateway executor.
 *
 * @module
 */

import type { ToolDefinition } from "../../../core/types/tool.ts";

function buildSubagentDef(): ToolDefinition {
  return {
    name: "subagent",
    description:
      "Spawn a sub-agent ONLY for tasks requiring independent tool access (file operations, API calls, web searches). NEVER use for calculations, summarization, formatting, or any task you can do with the data you already have. If you have the data, process it yourself.",
    parameters: {
      task: {
        type: "string",
        description: "What the sub-agent should accomplish",
        required: true,
      },
      tools: {
        type: "string",
        description:
          "Comma-separated tool whitelist (default: read-only tools)",
        required: false,
      },
    },
  };
}

function buildAgentsListDef(): ToolDefinition {
  return {
    name: "agents_list",
    description: "List configured LLM providers/agents.",
    parameters: {},
  };
}

/** Agent meta-tools: subagent, agents_list. */
export function buildAgentInlineDefinitions(): readonly ToolDefinition[] {
  return [buildSubagentDef(), buildAgentsListDef()];
}

/** @deprecated Use buildAgentInlineDefinitions instead */
export const getAgentInlineDefinitions = buildAgentInlineDefinitions;
