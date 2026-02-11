/**
 * Chat session handler for the daemon.
 *
 * Owns the shared orchestrator and serializes access via a processing
 * mutex. Both CLI (via gateway WebSocket) and Tidepool (via browser
 * WebSocket) call into the same ChatSession instance.
 *
 * @module
 */

import { createOrchestrator } from "../agent/orchestrator.ts";
import type {
  OrchestratorConfig,
  OrchestratorEvent,
  OrchestratorEventCallback,
  ToolDefinition,
  ToolExecutor,
} from "../agent/orchestrator.ts";
import type { LlmProviderRegistry } from "../agent/llm.ts";
import type { PlanManager } from "../agent/plan.ts";
import type { HookRunner } from "../core/policy/hooks.ts";
import type { SessionState } from "../core/types/session.ts";
import type { ClassificationLevel } from "../core/types/classification.ts";
import type { CompactorConfig } from "../agent/compactor.ts";

/** Events sent over the chat wire protocol. */
export type ChatEvent =
  | { readonly type: "connected"; readonly provider: string; readonly model: string }
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
  | { readonly type: "response"; readonly text: string }
  | { readonly type: "error"; readonly message: string };

/** Messages the client can send. */
export type ChatClientMessage =
  | { readonly type: "message"; readonly content: string }
  | { readonly type: "cancel" };

/** Callback to send a chat event to a specific client. */
export type ChatEventSender = (event: ChatEvent) => void;

/** Configuration for creating a ChatSession. */
export interface ChatSessionConfig {
  readonly hookRunner: HookRunner;
  readonly providerRegistry: LlmProviderRegistry;
  readonly spinePath?: string;
  readonly tools?: readonly ToolDefinition[];
  readonly toolExecutor?: ToolExecutor;
  readonly systemPromptSections?: readonly string[];
  readonly compactorConfig?: Partial<CompactorConfig>;
  readonly session: SessionState;
  readonly targetClassification?: ClassificationLevel;
  /** Plan manager for plan mode state tracking. */
  readonly planManager?: PlanManager;
}

/** Shared chat session that serializes access to the orchestrator. */
export interface ChatSession {
  /** Process a message through the orchestrator, sending events to the caller. */
  processMessage(
    content: string,
    sendEvent: ChatEventSender,
    signal?: AbortSignal,
  ): Promise<void>;
  /** The name of the default LLM provider. */
  readonly providerName: string;
  /** The primary model identifier from config. */
  readonly modelName: string;
}

/**
 * Create a chat session that owns the orchestrator and serializes access.
 *
 * The orchestrator's `onEvent` callback forwards events to whichever
 * client is currently being served. A promise-chain mutex ensures only
 * one message is processed at a time.
 */
export function createChatSession(config: ChatSessionConfig): ChatSession {
  // Mutable ref: set per-message, cleared after
  let activeSend: ChatEventSender | null = null;

  const onEvent: OrchestratorEventCallback = (event: OrchestratorEvent) => {
    if (activeSend) {
      activeSend(event as ChatEvent);
    }
  };

  const orchestrator = createOrchestrator({
    hookRunner: config.hookRunner,
    providerRegistry: config.providerRegistry,
    spinePath: config.spinePath,
    tools: config.tools,
    toolExecutor: config.toolExecutor,
    onEvent,
    compactorConfig: config.compactorConfig,
    systemPromptSections: config.systemPromptSections,
    planManager: config.planManager,
  });

  const session = config.session;
  const targetClassification = config.targetClassification ?? "INTERNAL" as ClassificationLevel;

  const providerName = config.providerRegistry.getDefault()?.name ?? "unknown";
  const modelName = config.providerRegistry.getDefault()?.name ?? "unknown";

  // Promise-chain mutex: each processMessage waits for the previous to finish
  let mutex: Promise<void> = Promise.resolve();

  async function processMessage(
    content: string,
    sendEvent: ChatEventSender,
    signal?: AbortSignal,
  ): Promise<void> {
    // Chain onto the mutex so only one message processes at a time
    const prev = mutex;
    let resolve: () => void;
    mutex = new Promise<void>((r) => {
      resolve = r;
    });

    await prev;

    activeSend = sendEvent;
    try {
      const result = await orchestrator.processMessage({
        session,
        message: content,
        targetClassification,
        signal,
      });

      if (!result.ok) {
        sendEvent({ type: "error", message: result.error });
      }
      // Note: successful responses are already emitted via onEvent "response"
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendEvent({ type: "error", message: msg });
    } finally {
      activeSend = null;
      resolve!();
    }
  }

  return {
    processMessage,
    get providerName() {
      return providerName;
    },
    get modelName() {
      return modelName;
    },
  };
}
