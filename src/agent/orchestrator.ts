/**
 * Agent orchestrator — the main agent loop.
 *
 * Receives messages from channels, fires enforcement hooks,
 * builds LLM context with SPINE.md, calls the LLM provider,
 * and returns responses subject to policy checks.
 *
 * @module
 */

import type { Result, ClassificationLevel } from "../core/types/classification.ts";
import type { SessionState, SessionId } from "../core/types/session.ts";
import type { HookRunner } from "../core/policy/hooks.ts";
import type { LlmProviderRegistry, LlmMessage } from "./llm.ts";

/** Default system prompt used when no SPINE.md is found. */
const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful AI assistant powered by Triggerfish. " +
  "Follow the user's instructions and respond clearly and concisely.";

/** Configuration for creating an orchestrator. */
export interface OrchestratorConfig {
  readonly hookRunner: HookRunner;
  readonly providerRegistry: LlmProviderRegistry;
  readonly spinePath?: string;
}

/** Options for processing a single message. */
export interface ProcessMessageOptions {
  readonly session: SessionState;
  readonly message: string;
  readonly targetClassification: ClassificationLevel;
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

/**
 * Create an agent orchestrator.
 *
 * The orchestrator implements the agent loop:
 * 1. Receive message from channel
 * 2. Fire PRE_CONTEXT_INJECTION hook
 * 3. Build LLM context with SPINE.md as system prompt
 * 4. Send to LLM provider
 * 5. Parse response for tool calls
 * 6. For each tool call: PRE_TOOL_CALL → execute → POST_TOOL_RESPONSE
 * 7. Fire PRE_OUTPUT on final response
 * 8. Return response
 *
 * @param config - Orchestrator configuration
 * @returns An Orchestrator instance
 */
export function createOrchestrator(config: OrchestratorConfig): Orchestrator {
  const { hookRunner, providerRegistry, spinePath } = config;
  const histories = new Map<string, HistoryEntry[]>();

  async function processMessage(
    options: ProcessMessageOptions,
  ): Promise<Result<ProcessMessageResult, string>> {
    const { session, message, targetClassification } = options;

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
    const systemPrompt = spineContent ?? DEFAULT_SYSTEM_PROMPT;

    // Get or create conversation history for this session
    const sessionKey = session.id as string;
    if (!histories.has(sessionKey)) {
      histories.set(sessionKey, []);
    }
    const history = histories.get(sessionKey)!;

    // Add user message to history
    history.push({ role: "user", content: message });

    // Build messages array: system prompt + conversation history
    const messages: LlmMessage[] = [
      { role: "system", content: systemPrompt },
      ...history,
    ];

    // 4. Call LLM provider
    const completion = await provider.complete(messages, [], {});

    // 5. Handle tool calls (if any)
    // For each tool call: PRE_TOOL_CALL → execute → POST_TOOL_RESPONSE
    for (const toolCall of completion.toolCalls) {
      const preToolResult = await hookRunner.run("PRE_TOOL_CALL", {
        session,
        input: { tool_call: toolCall },
      });

      if (!preToolResult.allowed) {
        continue; // Skip blocked tool calls
      }

      // POST_TOOL_RESPONSE hook would fire after tool execution
      // Tool execution is handled by the MCP gateway / exec environment
    }

    // 6. Fire PRE_OUTPUT hook — enforce write-down check
    const preOutputResult = await hookRunner.run("PRE_OUTPUT", {
      session,
      input: {
        content: completion.content,
        target_classification: targetClassification,
      },
    });

    if (!preOutputResult.allowed) {
      return {
        ok: false,
        error: preOutputResult.message ?? "Output blocked by policy",
      };
    }

    // 7. Add assistant response to history
    history.push({ role: "assistant", content: completion.content });

    return {
      ok: true,
      value: { response: completion.content },
    };
  }

  function getHistory(sessionId: SessionId): readonly HistoryEntry[] {
    const sessionKey = sessionId as string;
    return histories.get(sessionKey) ?? [];
  }

  return { processMessage, getHistory };
}
