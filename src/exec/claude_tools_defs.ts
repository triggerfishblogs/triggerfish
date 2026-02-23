/**
 * Claude session tool definitions — LLM-callable schema declarations.
 *
 * Defines the parameter schemas and tool definitions for the five Claude
 * session management tools (start, send, output, status, stop) and the
 * system prompt section that describes them to the LLM.
 *
 * @module
 */

import type { ToolDefinition } from "../core/types/tool.ts";

function buildClaudeStartParams(): ToolDefinition["parameters"] {
  return {
    prompt: {
      type: "string",
      description: "Initial prompt/task for the Claude session",
      required: true,
    },
    model: {
      type: "string",
      description: 'Model to use (e.g. "sonnet", "opus")',
      required: false,
    },
    max_turns: {
      type: "number",
      description: "Maximum agent iteration turns",
      required: false,
    },
    timeout_ms: {
      type: "number",
      description: "Max runtime in milliseconds (default: 300000 = 5min)",
      required: false,
    },
    working_dir: {
      type: "string",
      description: "Working directory (must be within workspace)",
      required: false,
    },
    system_prompt: {
      type: "string",
      description: "Custom system prompt for the session",
      required: false,
    },
    allowed_tools: {
      type: "string",
      description: "Comma-separated tool allowlist",
      required: false,
    },
    max_budget_usd: {
      type: "number",
      description: "Spending cap in USD",
      required: false,
    },
  };
}

function buildClaudeStartDef(): ToolDefinition {
  return {
    name: "claude_start",
    description:
      "Start a headless Claude Code CLI session with an initial prompt. Returns the session ID for follow-up interaction.",
    parameters: buildClaudeStartParams(),
  };
}

function buildClaudeSendDef(): ToolDefinition {
  return {
    name: "claude_send",
    description:
      "Send a follow-up message to a running Claude session and get the response.",
    parameters: {
      session_id: {
        type: "string",
        description: "Session ID from claude_start",
        required: true,
      },
      input: {
        type: "string",
        description: "Follow-up message to send",
        required: true,
      },
    },
  };
}

function buildClaudeOutputDef(): ToolDefinition {
  return {
    name: "claude_output",
    description:
      "Get the accumulated output from a Claude session (non-blocking).",
    parameters: {
      session_id: {
        type: "string",
        description: "Session ID from claude_start",
        required: true,
      },
    },
  };
}

function buildClaudeStatusDef(): ToolDefinition {
  return {
    name: "claude_status",
    description: "Check the status and metadata of a Claude session.",
    parameters: {
      session_id: {
        type: "string",
        description: "Session ID from claude_start",
        required: true,
      },
    },
  };
}

function buildClaudeStopDef(): ToolDefinition {
  return {
    name: "claude_stop",
    description: "Terminate a running Claude session.",
    parameters: {
      session_id: {
        type: "string",
        description: "Session ID from claude_start",
        required: true,
      },
    },
  };
}

/** Tool definitions for Claude session management. */
export function getClaudeToolDefinitions(): readonly ToolDefinition[] {
  return [
    buildClaudeStartDef(),
    buildClaudeSendDef(),
    buildClaudeOutputDef(),
    buildClaudeStatusDef(),
    buildClaudeStopDef(),
  ];
}

/** System prompt section for Claude session tools. */
export const CLAUDE_SESSION_SYSTEM_PROMPT = `## Claude Session Tools

You can spawn headless Claude Code CLI sessions for delegating complex tasks.
Each session runs as a separate process with its own context, tools, and workspace.

- \`claude_start\`: Start a new session with a prompt. Returns a session ID.
- \`claude_send\`: Send a follow-up message to a running session.
- \`claude_output\`: Read accumulated output from a session.
- \`claude_status\`: Check if a session is still running.
- \`claude_stop\`: Terminate a session.

Sessions are sandboxed to the agent workspace. Use these for:
- Delegating code generation tasks
- Running research in parallel
- Multi-step debugging workflows`;
