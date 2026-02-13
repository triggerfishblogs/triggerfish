/**
 * Chat session handler for the daemon.
 *
 * Owns the shared orchestrator and serializes access via a processing
 * mutex. Both CLI (via gateway WebSocket) and Tidepool (via browser
 * WebSocket) call into the same ChatSession instance.
 *
 * Channels register via `registerChannel` and route messages through
 * `handleChannelMessage`. Owner messages use the main daemon session;
 * non-owner messages get independent per-user sessions managed here.
 *
 * @module
 */

import { createOrchestrator } from "../agent/orchestrator.ts";
import type {
  OrchestratorEvent,
  OrchestratorEventCallback,
  ToolDefinition,
  ToolExecutor,
} from "../agent/orchestrator.ts";
import type { LlmProviderRegistry, LlmProvider } from "../agent/llm.ts";
import type { PlanManager } from "../agent/plan.ts";
import type { HookRunner } from "../core/policy/hooks.ts";
import type { SessionState } from "../core/types/session.ts";
import { updateTaint } from "../core/types/session.ts";
import type { ClassificationLevel } from "../core/types/classification.ts";
import type { CompactorConfig } from "../agent/compactor.ts";
import type { MessageContent } from "../image/content.ts";
import type { ChannelMessage } from "../channels/types.ts";
import {
  createUserSessionManager,
  parseUserOverrides,
} from "../channels/user_sessions.ts";
import type { UserSessionManager } from "../channels/user_sessions.ts";

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
  | { readonly type: "error"; readonly message: string }
  | { readonly type: "vision_start"; readonly imageCount: number }
  | { readonly type: "vision_complete"; readonly imageCount: number }
  | { readonly type: "compact_start" }
  | {
    readonly type: "compact_complete";
    readonly messagesBefore: number;
    readonly messagesAfter: number;
    readonly tokensBefore: number;
    readonly tokensAfter: number;
  };

/** Messages the client can send. */
export type ChatClientMessage =
  | { readonly type: "message"; readonly content: MessageContent }
  | { readonly type: "cancel" }
  | { readonly type: "clear" }
  | { readonly type: "compact" };

/** Callback to send a chat event to a specific client. */
export type ChatEventSender = (event: ChatEvent) => void;

/** Per-channel classification config for non-owner user sessions. */
export interface ChannelClassificationConfig {
  /** Default classification ceiling for non-owner users on this channel. */
  readonly classification: ClassificationLevel;
  /** Optional per-user classification overrides keyed by platform-native ID. */
  readonly userClassifications?: Record<string, string>;
}

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
  /** Enable verbose logging of LLM responses to stderr. */
  readonly debug?: boolean;
  /** Vision-capable LLM provider for image fallback. */
  readonly visionProvider?: LlmProvider;
  /** Tool prefix → classification level. Enforced before every tool dispatch. */
  readonly toolClassifications?: ReadonlyMap<string, ClassificationLevel>;
  /** Read current session taint for canFlowTo checks. */
  readonly getSessionTaint?: () => ClassificationLevel;
  /** Escalate session taint after tool dispatch. */
  readonly escalateTaint?: (level: ClassificationLevel, reason: string) => void;
  /** Reset session state (taint back to PUBLIC). Called on /clear. */
  readonly resetSession?: () => void;
}

/** Shared chat session that serializes access to the orchestrator. */
export interface ChatSession {
  /** Process an owner message through the orchestrator. */
  processMessage(
    content: MessageContent,
    sendEvent: ChatEventSender,
    signal?: AbortSignal,
  ): Promise<void>;
  /**
   * Register a channel's classification config for per-user session management.
   *
   * Must be called before `handleChannelMessage` for a given channel type.
   */
  registerChannel(channelType: string, config: ChannelClassificationConfig): void;
  /**
   * Route a channel message to the correct session.
   *
   * Owner messages (`msg.isOwner !== false`) use the main daemon session.
   * Non-owner messages get independent per-user sessions with classification
   * ceilings derived from the registered channel config.
   */
  handleChannelMessage(
    msg: ChannelMessage,
    channelType: string,
    sendEvent: ChatEventSender,
    signal?: AbortSignal,
  ): Promise<void>;
  /** Clear conversation history and reset session state. */
  clear(): void;
  /** Force LLM-based summarization of conversation history. */
  compact(sendEvent: ChatEventSender): Promise<void>;
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
 *
 * Taint closures are session-aware: an `activeSessionId` ref determines
 * which session's taint is read/written. For owner messages it points to
 * the owner session; for non-owner messages it points to the user session.
 * The mutex guarantees no concurrent access.
 */
export function createChatSession(config: ChatSessionConfig): ChatSession {
  // Mutable ref: set per-message, cleared after
  let activeSend: ChatEventSender | null = null;

  // --- Session-aware taint and classification tracking ---
  const ownerSessionId = config.session.id as string;
  let activeSessionId: string = ownerSessionId;
  const ownerTargetClassification = config.targetClassification ?? "INTERNAL" as ClassificationLevel;
  // Non-owner tool ceiling: null = no explicit classification = all tools blocked.
  let activeNonOwnerCeiling: ClassificationLevel | null = null;

  // Track all session states. Owner session is always present.
  const sessionStates = new Map<string, SessionState>();
  sessionStates.set(ownerSessionId, config.session);

  // Per-channel UserSessionManagers, keyed by channelType.
  const channelUserSessions = new Map<string, UserSessionManager>();

  const ownerGetTaint = config.getSessionTaint;
  const ownerEscalateTaint = config.escalateTaint;

  function getSessionTaint(): ClassificationLevel {
    if (activeSessionId === ownerSessionId && ownerGetTaint) {
      return ownerGetTaint();
    }
    return sessionStates.get(activeSessionId)?.taint ?? "PUBLIC";
  }

  function escalateTaint(level: ClassificationLevel, reason: string): void {
    if (activeSessionId === ownerSessionId && ownerEscalateTaint) {
      ownerEscalateTaint(level, reason);
      return;
    }
    const s = sessionStates.get(activeSessionId);
    if (s) {
      sessionStates.set(activeSessionId, updateTaint(s, level, reason));
    }
  }

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
    debug: config.debug,
    visionProvider: config.visionProvider,
    toolClassifications: config.toolClassifications,
    getSessionTaint,
    escalateTaint,
    isOwnerSession: () => activeSessionId === ownerSessionId,
    getNonOwnerCeiling: () => activeNonOwnerCeiling,
  });

  const session = config.session;

  const providerName = config.providerRegistry.getDefault()?.name ?? "unknown";
  const modelName = config.providerRegistry.getDefault()?.name ?? "unknown";

  // Promise-chain mutex: each processMessage waits for the previous to finish
  let mutex: Promise<void> = Promise.resolve();

  async function processMessage(
    content: MessageContent,
    sendEvent: ChatEventSender,
    signal?: AbortSignal,
  ): Promise<void> {
    const prev = mutex;
    let resolve: () => void;
    mutex = new Promise<void>((r) => {
      resolve = r;
    });

    await prev;

    activeSend = sendEvent;
    activeSessionId = ownerSessionId;

    try {
      const result = await orchestrator.processMessage({
        session,
        message: content,
        targetClassification: ownerTargetClassification,
        signal,
      });

      if (!result.ok) {
        sendEvent({ type: "error", message: result.error });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendEvent({ type: "error", message: msg });
    } finally {
      activeSend = null;
      activeSessionId = ownerSessionId;
  
      resolve!();
    }
  }

  function registerChannel(channelType: string, channelConfig: ChannelClassificationConfig): void {
    const mgr = createUserSessionManager({
      channelDefault: channelConfig.classification,
      userOverrides: parseUserOverrides(channelConfig.userClassifications),
    });
    channelUserSessions.set(channelType, mgr);
  }

  async function handleChannelMessage(
    msg: ChannelMessage,
    channelType: string,
    sendEvent: ChatEventSender,
    signal?: AbortSignal,
  ): Promise<void> {
    // Owner messages → main daemon session
    if (msg.isOwner !== false) {
      return processMessage(msg.content, sendEvent, signal);
    }

    // Non-owner messages → per-user session
    const userSessions = channelUserSessions.get(channelType);
    if (!userSessions) {
      sendEvent({ type: "error", message: `No channel config registered for ${channelType}` });
      return;
    }

    const senderId = msg.senderId ?? "unknown";
    const userSession = userSessions.getOrCreate(channelType, senderId);
    const userCls = userSessions.getClassification(senderId);

    const prev = mutex;
    let resolve: () => void;
    mutex = new Promise<void>((r) => {
      resolve = r;
    });

    await prev;

    const userSessionId = userSession.id as string;
    sessionStates.set(userSessionId, userSession);
    activeSend = sendEvent;
    activeSessionId = userSessionId;
    activeNonOwnerCeiling = userSessions.hasExplicitClassification(senderId)
      ? userSessions.getClassification(senderId)
      : null;

    try {
      const result = await orchestrator.processMessage({
        session: userSession,
        message: msg.content,
        targetClassification: userCls,
        signal,
      });

      if (!result.ok) {
        sendEvent({ type: "error", message: result.error });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      sendEvent({ type: "error", message: errMsg });
    } finally {
      // Persist potentially-escalated session back to the UserSessionManager
      const updated = sessionStates.get(userSessionId);
      if (updated) {
        userSessions.updateSession(channelType, senderId, updated);
      }
      activeSend = null;
      activeSessionId = ownerSessionId;
      activeNonOwnerCeiling = null;
      resolve!();
    }
  }

  function clear(): void {
    orchestrator.clearHistory(session.id);
    if (config.resetSession) {
      config.resetSession();
    }
  }

  async function compact(sendEvent: ChatEventSender): Promise<void> {
    sendEvent({ type: "compact_start" });
    try {
      const result = await orchestrator.compactHistory(session.id);
      sendEvent({
        type: "compact_complete",
        messagesBefore: result.messagesBefore,
        messagesAfter: result.messagesAfter,
        tokensBefore: result.tokensBefore,
        tokensAfter: result.tokensAfter,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      sendEvent({ type: "error", message: `Compact failed: ${msg}` });
    }
  }

  return {
    processMessage,
    registerChannel,
    handleChannelMessage,
    clear,
    compact,
    get providerName() {
      return providerName;
    },
    get modelName() {
      return modelName;
    },
  };
}
