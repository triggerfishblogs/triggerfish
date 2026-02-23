/**
 * Tool definitions and executor for Claude Code CLI session management.
 *
 * Provides the LLM-callable tool definitions (claude_start, claude_send,
 * claude_output, claude_status, claude_stop) and a chain-pattern executor
 * that dispatches calls to a ClaudeSessionManager.
 *
 * @module
 */

import type { ToolDefinition } from "../core/types/tool.ts";
import type { ClaudeSessionConfig, ClaudeSessionManager } from "./claude.ts";

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

// ─── Executor Helpers ──────────────────────────────────────────────────────────

function buildSessionConfig(
  input: Record<string, unknown>,
): Partial<ClaudeSessionConfig> {
  const config: Partial<ClaudeSessionConfig> = {};
  if (typeof input.model === "string") {
    (config as Record<string, unknown>).model = input.model;
  }
  if (typeof input.max_turns === "number") {
    (config as Record<string, unknown>).maxTurns = input.max_turns;
  }
  if (typeof input.timeout_ms === "number") {
    (config as Record<string, unknown>).timeoutMs = input.timeout_ms;
  }
  if (typeof input.working_dir === "string") {
    (config as Record<string, unknown>).workingDir = input.working_dir;
  }
  if (typeof input.system_prompt === "string") {
    (config as Record<string, unknown>).systemPrompt = input.system_prompt;
  }
  if (typeof input.allowed_tools === "string") {
    (config as Record<string, unknown>).allowedTools = input.allowed_tools
      .split(",")
      .map((t: string) => t.trim());
  }
  if (typeof input.max_budget_usd === "number") {
    (config as Record<string, unknown>).maxBudgetUsd = input.max_budget_usd;
  }
  return config;
}

async function executeClaudeStart(
  manager: ClaudeSessionManager,
  input: Record<string, unknown>,
): Promise<string> {
  const prompt = input.prompt;
  if (typeof prompt !== "string" || prompt.length === 0) {
    return "Error: claude_start requires a 'prompt' argument (string).";
  }

  const config = buildSessionConfig(input);
  const result = await manager.start(prompt, config);
  if (!result.ok) return `Error: ${result.error}`;
  return JSON.stringify({
    session_id: result.value.id,
    pid: result.value.pid,
    status: result.value.status,
    message: "Claude session started successfully.",
  });
}

async function executeClaudeSend(
  manager: ClaudeSessionManager,
  input: Record<string, unknown>,
): Promise<string> {
  const sessionId = input.session_id;
  const userInput = input.input;
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    return "Error: claude_send requires a 'session_id' argument (string).";
  }
  if (typeof userInput !== "string" || userInput.length === 0) {
    return "Error: claude_send requires an 'input' argument (string).";
  }

  const result = await manager.send(sessionId, userInput);
  if (!result.ok) return `Error: ${result.error}`;
  return result.value;
}

function executeClaudeOutput(
  manager: ClaudeSessionManager,
  input: Record<string, unknown>,
): string {
  const sessionId = input.session_id;
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    return "Error: claude_output requires a 'session_id' argument (string).";
  }

  const result = manager.getOutput(sessionId);
  if (!result.ok) return `Error: ${result.error}`;
  return result.value || "(no output yet)";
}

function executeClaudeStatus(
  manager: ClaudeSessionManager,
  input: Record<string, unknown>,
): string {
  const sessionId = input.session_id;
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    return "Error: claude_status requires a 'session_id' argument (string).";
  }

  const result = manager.status(sessionId);
  if (!result.ok) return `Error: ${result.error}`;
  const s = result.value;
  return JSON.stringify({
    session_id: s.id,
    pid: s.pid,
    status: s.status,
    started_at: s.startedAt.toISOString(),
    ended_at: s.endedAt?.toISOString() ?? null,
    exit_code: s.exitCode,
    model: s.config.model ?? "default",
  });
}

async function executeClaudeStop(
  manager: ClaudeSessionManager,
  input: Record<string, unknown>,
): Promise<string> {
  const sessionId = input.session_id;
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    return "Error: claude_stop requires a 'session_id' argument (string).";
  }

  const result = await manager.stop(sessionId);
  if (!result.ok) return `Error: ${result.error}`;
  return `Session ${sessionId} stopped.`;
}

/**
 * Create a tool executor for Claude session tools.
 *
 * Returns null for unrecognized tool names (chain pattern).
 */
export function createClaudeToolExecutor(
  manager: ClaudeSessionManager,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    switch (name) {
      case "claude_start":
        return executeClaudeStart(manager, input);
      case "claude_send":
        return executeClaudeSend(manager, input);
      case "claude_output":
        return executeClaudeOutput(manager, input);
      case "claude_status":
        return executeClaudeStatus(manager, input);
      case "claude_stop":
        return executeClaudeStop(manager, input);
      default:
        return null;
    }
  };
}
