/**
 * Agent orchestrator — the main agent loop.
 *
 * Receives messages from channels, fires enforcement hooks,
 * builds LLM context with SPINE.md, calls the LLM provider,
 * executes tool calls, and returns responses subject to policy checks.
 *
 * Uses prompt-based tool calling: tool definitions are embedded in the
 * system prompt and the LLM outputs structured JSON tool invocations.
 * This works universally across all LLM providers.
 *
 * @module
 */

import type { Result, ClassificationLevel } from "../core/types/classification.ts";
import type { SessionState, SessionId } from "../core/types/session.ts";
import type { HookRunner } from "../core/policy/hooks.ts";
import type { LlmProviderRegistry, LlmMessage } from "./llm.ts";
import { createCompactor } from "./compactor.ts";
import type { Compactor, CompactorConfig } from "./compactor.ts";

/** Default system prompt used when no SPINE.md is found. */
const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful AI assistant powered by Triggerfish. " +
  "Follow the user's instructions and respond clearly and concisely.";

/** Maximum tool call iterations to prevent infinite loops. */
const MAX_TOOL_ITERATIONS = 25;

/** Iteration at which the LLM is warned to wrap up. */
const SOFT_LIMIT_ITERATIONS = 20;

/** A tool definition for prompt-based tool calling. */
export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: Readonly<Record<string, {
    readonly type: string;
    readonly description: string;
    readonly required?: boolean;
  }>>;
}

/** Handler that executes a tool call and returns the result text. */
export type ToolExecutor = (
  name: string,
  input: Record<string, unknown>,
) => Promise<string>;

/** Configuration for creating an orchestrator. */
export interface OrchestratorConfig {
  readonly hookRunner: HookRunner;
  readonly providerRegistry: LlmProviderRegistry;
  readonly spinePath?: string;
  /** Tool definitions available to the agent. */
  readonly tools?: readonly ToolDefinition[];
  /** Callback to execute tool calls. */
  readonly toolExecutor?: ToolExecutor;
  /** Event callback for real-time progress reporting. */
  readonly onEvent?: OrchestratorEventCallback;
  /** Configuration for conversation compactor. */
  readonly compactorConfig?: Partial<CompactorConfig>;
  /**
   * Additional system prompt sections injected by the platform.
   * Appended AFTER SPINE.md and tool definitions. SPINE.md remains
   * the foundation — these sections layer platform behaviour on top.
   */
  readonly systemPromptSections?: readonly string[];
}

/** Options for processing a single message. */
export interface ProcessMessageOptions {
  readonly session: SessionState;
  readonly message: string;
  readonly targetClassification: ClassificationLevel;
  /** Optional signal to abort the operation. */
  readonly signal?: AbortSignal;
}

/** Successful response from message processing. */
export interface ProcessMessageResult {
  readonly response: string;
}

/** A conversation history entry. */
export interface HistoryEntry {
  readonly role: string;
  readonly content: string;
}

/** The orchestrator interface for processing messages. */
export interface Orchestrator {
  /** Process a user message through the full agent loop. */
  processMessage(
    options: ProcessMessageOptions,
  ): Promise<Result<ProcessMessageResult, string>>;
  /** Get conversation history for a session. */
  getHistory(sessionId: SessionId): readonly HistoryEntry[];
}

/** Events emitted by the orchestrator during message processing. */
export type OrchestratorEvent =
  | { readonly type: "llm_start"; readonly iteration: number; readonly maxIterations: number }
  | {
    readonly type: "llm_complete";
    readonly iteration: number;
    readonly hasToolCalls: boolean;
  }
  | {
    readonly type: "tool_call";
    readonly name: string;
    readonly args: Record<string, unknown>;
  }
  | {
    readonly type: "tool_result";
    readonly name: string;
    readonly result: string;
    readonly blocked: boolean;
  }
  | { readonly type: "response"; readonly text: string };

/** Callback for real-time orchestrator event reporting. */
export type OrchestratorEventCallback = (event: OrchestratorEvent) => void;

/**
 * Load SPINE.md content from the filesystem.
 * Returns the file content or null if the file cannot be read.
 */
async function loadSpine(spinePath: string | undefined): Promise<string | null> {
  if (!spinePath) return null;
  try {
    return await Deno.readTextFile(spinePath);
  } catch {
    return null;
  }
}

/** A parsed tool call from LLM text output. */
interface ParsedToolCall {
  readonly name: string;
  readonly args: Record<string, unknown>;
}

/**
 * Build the tool-use instruction block for the system prompt.
 */
function buildToolPrompt(tools: readonly ToolDefinition[]): string {
  const toolDescs = tools.map((t) => {
    const params = Object.entries(t.parameters)
      .map(([name, info]) => {
        const req = info.required !== false ? " (required)" : " (optional)";
        return `    - ${name} (${info.type}${req}): ${info.description}`;
      })
      .join("\n");
    return `  ${t.name}: ${t.description}\n    Parameters:\n${params}`;
  }).join("\n\n");

  return `## Available Tools

You have access to the following tools. To use a tool, output a JSON block wrapped in <tool_call> tags. You may use multiple tools in a single response. After all tool results are returned, continue your response.

Format:
<tool_call>
{"name": "tool_name", "args": {"param1": "value1"}}
</tool_call>

Tools:
${toolDescs}

Important: Use tools when the user asks you to interact with the filesystem, run commands, or search for files. After using tools, provide your answer based on the results.`;
}

/**
 * Extract arguments from a parsed tool call JSON object.
 * LLMs use varying key names for arguments: args, input, parameters, arguments.
 * Falls back to collecting all top-level keys except "name" as flat args.
 */
function extractArgs(parsed: Record<string, unknown>): Record<string, unknown> {
  // Check common arg container key names
  for (const key of ["args", "input", "parameters", "arguments"]) {
    const val = parsed[key];
    if (val !== null && val !== undefined && typeof val === "object" && !Array.isArray(val)) {
      return val as Record<string, unknown>;
    }
  }
  // Flat format: args are top-level siblings of "name"
  const { name: _, args: _a, input: _i, parameters: _p, arguments: _g, ...rest } = parsed;
  if (Object.keys(rest).length > 0) {
    return rest;
  }
  return {};
}

/**
 * Parse tool calls from LLM text output.
 * Looks for <tool_call>...</tool_call> blocks containing JSON.
 */
function parseToolCalls(text: string): readonly ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];
  const regex = /<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.name && typeof parsed.name === "string") {
        calls.push({
          name: parsed.name,
          args: extractArgs(parsed),
        });
      }
    } catch {
      // Skip malformed JSON
    }
  }
  return calls;
}

/**
 * Strip tool_call blocks from text to get the "clean" response.
 */
function stripToolCalls(text: string): string {
  return text.replace(/<tool_call>\s*[\s\S]*?\s*<\/tool_call>/g, "").trim();
}

/**
 * Create an agent orchestrator.
 *
 * The orchestrator implements the agent loop:
 * 1. Receive message from channel
 * 2. Fire PRE_CONTEXT_INJECTION hook
 * 3. Build LLM context with SPINE.md + tool instructions as system prompt
 * 4. Send to LLM provider
 * 5. Parse tool calls from text response
 * 6. If tool calls found: execute each, append results, call LLM again
 * 7. Repeat until no more tool calls (or max iterations)
 * 8. Fire PRE_OUTPUT on final text response
 * 9. Return response
 *
 * @param config - Orchestrator configuration
 * @returns An Orchestrator instance
 */
export function createOrchestrator(config: OrchestratorConfig): Orchestrator {
  const { hookRunner, providerRegistry, spinePath } = config;
  const tools = config.tools ?? [];
  const toolExecutor = config.toolExecutor;
  const systemPromptSections = config.systemPromptSections ?? [];
  const emit = config.onEvent ?? (() => {});
  const histories = new Map<string, HistoryEntry[]>();
  const compactor: Compactor = createCompactor(config.compactorConfig);

  async function processMessage(
    options: ProcessMessageOptions,
  ): Promise<Result<ProcessMessageResult, string>> {
    const { session, message, targetClassification, signal } = options;

    // 1. Fire PRE_CONTEXT_INJECTION hook
    const preContextResult = await hookRunner.run("PRE_CONTEXT_INJECTION", {
      session,
      input: { content: message, source_type: "OWNER" },
    });

    if (!preContextResult.allowed) {
      return {
        ok: false,
        error: preContextResult.message ?? "Input blocked by policy",
      };
    }

    // 2. Get the default LLM provider
    const provider = providerRegistry.getDefault();
    if (!provider) {
      return { ok: false, error: "No default LLM provider configured" };
    }

    // 3. Build LLM context — load SPINE.md or use default prompt
    const spineContent = await loadSpine(spinePath);
    let systemPrompt = spineContent ?? DEFAULT_SYSTEM_PROMPT;

    // Append tool instructions if tools are available
    if (tools.length > 0 && toolExecutor) {
      systemPrompt += "\n\n" + buildToolPrompt(tools);
    }

    // Append platform-level sections (layered after SPINE.md + tools)
    for (const section of systemPromptSections) {
      systemPrompt += "\n\n" + section;
    }

    // Get or create conversation history for this session
    const sessionKey = session.id as string;
    if (!histories.has(sessionKey)) {
      histories.set(sessionKey, []);
    }
    const history = histories.get(sessionKey)!;

    // Add user message to history
    history.push({ role: "user", content: message });

    // Auto-compact history if approaching context limits
    const compacted = compactor.compact(history);
    if (compacted.length < history.length) {
      history.length = 0;
      history.push(...compacted);
    }

    // 4. Agent loop — call LLM, parse tool calls, execute, repeat
    let iterations = 0;
    while (iterations < MAX_TOOL_ITERATIONS) {
      iterations++;

      // Check abort signal
      if (signal?.aborted) {
        return { ok: false, error: "Operation cancelled by user" };
      }

      emit({ type: "llm_start", iteration: iterations, maxIterations: MAX_TOOL_ITERATIONS });

      // Build messages array: system prompt + conversation history
      const messages: LlmMessage[] = [
        { role: "system", content: systemPrompt },
        ...history,
      ];

      // Call LLM provider (no native tools — we use prompt-based tools)
      const completion = await provider.complete(messages, [], {
        ...(signal ? { signal } : {}),
      });

      // Parse tool calls from the response text
      const parsedCalls = (tools.length > 0 && toolExecutor)
        ? parseToolCalls(completion.content)
        : [];

      emit({
        type: "llm_complete",
        iteration: iterations,
        hasToolCalls: parsedCalls.length > 0,
      });

      if (parsedCalls.length === 0) {
        // No tool calls — this is the final response
        const finalText = stripToolCalls(completion.content);

        // Fire PRE_OUTPUT hook
        const preOutputResult = await hookRunner.run("PRE_OUTPUT", {
          session,
          input: {
            content: finalText,
            target_classification: targetClassification,
          },
        });

        if (!preOutputResult.allowed) {
          return {
            ok: false,
            error: preOutputResult.message ?? "Output blocked by policy",
          };
        }

        emit({ type: "response", text: finalText });

        // Add assistant response to history
        history.push({ role: "assistant", content: completion.content });

        return {
          ok: true,
          value: { response: finalText },
        };
      }

      // Tool calls found — add assistant message to history
      history.push({ role: "assistant", content: completion.content });

      // Inject soft limit warning to help the LLM wrap up
      if (iterations === SOFT_LIMIT_ITERATIONS) {
        history.push({
          role: "user",
          content:
            `[SYSTEM] You have used many tool calls (${iterations}/${MAX_TOOL_ITERATIONS}). ` +
            `You have ${MAX_TOOL_ITERATIONS - iterations} remaining iterations. ` +
            "Please provide your best answer now based on the information gathered so far. " +
            "If you cannot find what you're looking for, say so rather than continuing to search.",
        });
      }

      // Execute each tool call and build results
      const resultParts: string[] = [];
      for (const call of parsedCalls) {
        // Check abort signal before each tool execution
        if (signal?.aborted) {
          return { ok: false, error: "Operation cancelled by user" };
        }

        emit({ type: "tool_call", name: call.name, args: call.args });

        // Fire PRE_TOOL_CALL hook
        const preToolResult = await hookRunner.run("PRE_TOOL_CALL", {
          session,
          input: { tool_call: call },
        });

        let resultText: string;
        if (!preToolResult.allowed) {
          resultText = `Tool call blocked by policy: ${preToolResult.message ?? "denied"}`;
        } else {
          resultText = await toolExecutor!(call.name, call.args);
        }

        emit({
          type: "tool_result",
          name: call.name,
          result: resultText,
          blocked: !preToolResult.allowed,
        });
        resultParts.push(`<tool_result name="${call.name}">\n${resultText}\n</tool_result>`);
      }

      // Add tool results as a user message
      history.push({ role: "user", content: resultParts.join("\n\n") });
    }

    // Exceeded max iterations
    return {
      ok: false,
      error: "Agent loop exceeded maximum tool call iterations",
    };
  }

  function getHistory(sessionId: SessionId): readonly HistoryEntry[] {
    const sessionKey = sessionId as string;
    return histories.get(sessionKey) ?? [];
  }

  return { processMessage, getHistory };
}
