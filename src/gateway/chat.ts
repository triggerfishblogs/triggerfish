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
 * `handleChannelMessage` is the single authority for all non-owner
 * access control: pairing enforcement, respondToUnclassified gating,
 * and send-event construction. Adapters are dumb pipes.
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
import type { PathClassifier } from "../core/security/path_classification.ts";
import type { DomainClassifier } from "../web/domains.ts";
import type { ToolFloorRegistry } from "../core/security/tool_floors.ts";
import type { SessionState } from "../core/types/session.ts";
import { updateTaint } from "../core/types/session.ts";
import type { ClassificationLevel } from "../core/types/classification.ts";
import type { CompactorConfig } from "../agent/compactor.ts";
import type { MessageContent } from "../image/content.ts";
import type { ChannelAdapter, ChannelMessage } from "../channels/types.ts";
import {
  createUserSessionManager,
  parseUserOverrides,
} from "../channels/user_sessions.ts";
import type { UserSessionManager } from "../channels/user_sessions.ts";
import type { PairingService } from "../channels/pairing.ts";

/** Events sent over the chat wire protocol. */
export type ChatEvent =
  | { readonly type: "connected"; readonly provider: string; readonly model: string; readonly taint?: ClassificationLevel }
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
  | { readonly type: "response_chunk"; readonly text: string; readonly done: boolean }
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
  }
  | { readonly type: "taint_changed"; readonly level: ClassificationLevel };

/** Messages the client can send. */
export type ChatClientMessage =
  | { readonly type: "message"; readonly content: MessageContent }
  | { readonly type: "cancel" }
  | { readonly type: "clear" }
  | { readonly type: "compact" };

/** Callback to send a chat event to a specific client. */
export type ChatEventSender = (event: ChatEvent) => void;

/**
 * Per-channel classification config for non-owner user sessions.
 *
 * @deprecated Use ChannelRegistrationConfig instead.
 */
export interface ChannelClassificationConfig {
  /** Default classification ceiling for non-owner users on this channel. */
  readonly classification: ClassificationLevel;
  /** Optional per-user classification overrides keyed by platform-native ID. */
  readonly userClassifications?: Record<string, string>;
  /** Whether to respond to users not listed in userClassifications. Default: true. */
  readonly respondToUnclassified?: boolean;
}

/** Full channel registration config including adapter and access control. */
export interface ChannelRegistrationConfig {
  /** The channel adapter instance. */
  readonly adapter: ChannelAdapter;
  /** Human-readable channel name (e.g. "Signal", "Telegram"). */
  readonly channelName: string;
  /** Default classification ceiling for non-owner users on this channel. */
  readonly classification: ClassificationLevel;
  /** Optional per-user classification overrides keyed by platform-native ID. */
  readonly userClassifications?: Record<string, string>;
  /** Whether to respond to users not listed in userClassifications. Default: true. */
  readonly respondToUnclassified?: boolean;
  /** Whether pairing is required for this channel. Default: false. */
  readonly pairing?: boolean;
  /** Classification level assigned to paired users. Default: INTERNAL. */
  readonly pairingClassification?: ClassificationLevel;
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
  /** Enable streaming responses from the LLM provider. Default: true. */
  readonly enableStreaming?: boolean;
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
  /** Pairing service for verifying channel pairing codes. */
  readonly pairingService?: PairingService;
  /** Return the current owner session state (tracks taint reassignment in main.ts). */
  readonly getSession?: () => SessionState;
  /** Path classifier for filesystem tool security checks. */
  readonly pathClassifier?: PathClassifier;
  /** Domain classifier for URL-based tool security checks. */
  readonly domainClassifier?: DomainClassifier;
  /** Tool floor registry for minimum classification enforcement. */
  readonly toolFloorRegistry?: ToolFloorRegistry;
  /** Primary model identifier (e.g. "gpt-5.2-codex") for display. */
  readonly primaryModelName?: string;
}

/** Internal per-channel state tracked by ChatSession. */
interface ChannelState {
  readonly userSessions: UserSessionManager;
  readonly adapter: ChannelAdapter;
  readonly channelName: string;
  readonly respondToUnclassified: boolean;
  readonly pairing: boolean;
  readonly pairingClassification: ClassificationLevel;
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
   * Register a channel for routing through handleChannelMessage.
   *
   * Pre-loads paired senders from storage when pairing is enabled.
   * Must be called before `handleChannelMessage` for a given channel type.
   */
  registerChannel(channelType: string, config: ChannelRegistrationConfig): Promise<void>;
  /**
   * Route a channel message to the correct session.
   *
   * Owner messages (`msg.isOwner !== false`) use the main daemon session.
   * Non-owner messages pass through pairing and respondToUnclassified gates,
   * then get independent per-user sessions with classification ceilings
   * derived from the registered channel config.
   *
   * Builds the ChatEventSender internally from the registered adapter —
   * callers do not provide sendEvent.
   */
  handleChannelMessage(
    msg: ChannelMessage,
    channelType: string,
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
  /** Read the current owner session taint. */
  readonly sessionTaint: ClassificationLevel;
}

/**
 * Build a ChatEventSender for a channel adapter that handles typing
 * indicators, response sending, and error delivery.
 */
export function buildSendEvent(
  adapter: ChannelAdapter,
  channelName: string,
  msg: ChannelMessage,
): ChatEventSender {
  let typingInterval: number | undefined;

  return (event) => {
    if (event.type === "llm_start") {
      clearInterval(typingInterval);
      adapter.sendTyping?.(msg.sessionId ?? "").catch(() => {});
      typingInterval = setInterval(() => {
        adapter.sendTyping?.(msg.sessionId ?? "").catch(() => {});
      }, 4000) as unknown as number;
    }

    if (event.type === "response") {
      clearInterval(typingInterval);
      typingInterval = undefined;
      const text = event.text.trim();
      if (text.length > 0) {
        adapter.send({
          content: text,
          sessionId: msg.sessionId,
        }).catch((err) => console.error(`${channelName} send error:`, err));
      } else {
        console.error(`${channelName}: skipping empty response (LLM returned no text)`);
      }
    }

    if (event.type === "error") {
      clearInterval(typingInterval);
      typingInterval = undefined;
      adapter.send({
        content: `Error: ${event.message}`,
        sessionId: msg.sessionId,
      }).catch((err) => console.error(`${channelName} send error:`, err));
    }
  };
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

  // Per-channel state, keyed by channelType.
  const channelStates = new Map<string, ChannelState>();

  const pairingService = config.pairingService;

  const ownerGetTaint = config.getSessionTaint;
  const ownerEscalateTaint = config.escalateTaint;

  function getSessionTaint(): ClassificationLevel {
    if (activeSessionId === ownerSessionId && ownerGetTaint) {
      return ownerGetTaint();
    }
    return sessionStates.get(activeSessionId)?.taint ?? "PUBLIC";
  }

  function escalateTaint(level: ClassificationLevel, reason: string): void {
    const prevTaint = getSessionTaint();
    if (activeSessionId === ownerSessionId && ownerEscalateTaint) {
      ownerEscalateTaint(level, reason);
    } else {
      const s = sessionStates.get(activeSessionId);
      if (s) {
        sessionStates.set(activeSessionId, updateTaint(s, level, reason));
      }
    }
    const newTaint = getSessionTaint();
    if (newTaint !== prevTaint && activeSend) {
      activeSend({ type: "taint_changed", level: newTaint });
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
    enableStreaming: config.enableStreaming,
    debug: config.debug,
    visionProvider: config.visionProvider,
    toolClassifications: config.toolClassifications,
    getSessionTaint,
    escalateTaint,
    isOwnerSession: () => activeSessionId === ownerSessionId,
    getNonOwnerCeiling: () => activeNonOwnerCeiling,
    pathClassifier: config.pathClassifier,
    domainClassifier: config.domainClassifier,
    toolFloorRegistry: config.toolFloorRegistry,
  });

  const initialSession = config.session;
  function getSession(): SessionState {
    return config.getSession?.() ?? initialSession;
  }

  const providerName = config.providerRegistry.getDefault()?.name ?? "unknown";
  const modelName = config.primaryModelName ?? config.providerRegistry.getDefault()?.name ?? "unknown";

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
        session: getSession(),
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

  async function registerChannel(channelType: string, channelConfig: ChannelRegistrationConfig): Promise<void> {
    const mgr = createUserSessionManager({
      channelDefault: channelConfig.classification,
      userOverrides: parseUserOverrides(channelConfig.userClassifications),
    });

    const pairingCls = channelConfig.pairingClassification ?? "INTERNAL" as ClassificationLevel;

    // Pre-load paired users as classified users when pairing is enabled.
    if (channelConfig.pairing && pairingService) {
      try {
        const linkedUsers = await pairingService.getLinkedUsers(channelType);
        for (const userId of linkedUsers) {
          mgr.addClassification(userId, pairingCls);
        }
      } catch { /* ignore if prefix listing not supported */ }
    }

    channelStates.set(channelType, {
      userSessions: mgr,
      adapter: channelConfig.adapter,
      channelName: channelConfig.channelName,
      respondToUnclassified: channelConfig.respondToUnclassified ?? true,
      pairing: channelConfig.pairing ?? false,
      pairingClassification: pairingCls,
    });
  }

  async function handleChannelMessage(
    msg: ChannelMessage,
    channelType: string,
    signal?: AbortSignal,
  ): Promise<void> {
    const channelState = channelStates.get(channelType);
    if (!channelState) {
      console.error(`No channel config registered for ${channelType}`);
      return;
    }

    // Owner messages → build sendEvent from adapter → main daemon session
    if (msg.isOwner !== false) {
      const sendEvent = buildSendEvent(channelState.adapter, channelState.channelName, msg);
      return processMessage(msg.content, sendEvent, signal);
    }

    const senderId = msg.senderId ?? "";
    const userSessions = channelState.userSessions;
    const hasClassification = userSessions.hasExplicitClassification(senderId || "unknown");

    // --- Unified access control gate ---
    if (!hasClassification) {
      // Try pairing if enabled (DMs only, 6-digit codes)
      if (channelState.pairing && senderId) {
        const isGroupMsg = msg.sessionId?.startsWith(`${channelType}-group-`) ?? false;
        if (!isGroupMsg) {
          const codeMatch = (msg.content ?? "").trim().match(/^\d{6}$/);
          if (codeMatch && pairingService) {
            const result = await pairingService.verifyCode(codeMatch[0], channelType, senderId);
            if (result.ok) {
              userSessions.addClassification(senderId, channelState.pairingClassification);
              await channelState.adapter.send({
                content: "Paired successfully. You can now chat with me.",
                sessionId: msg.sessionId,
              }).catch(() => {});
            }
            // Invalid/expired code: stay silent.
          }
        }
        // Pairing required, user not classified → drop
        return;
      }

      // No pairing, no classification → check respondToUnclassified
      if (!channelState.respondToUnclassified) {
        console.error(`[${channelType}] Dropping unclassified sender ${senderId} (respondToUnclassified=false)`);
        return;
      }
    }

    // Non-owner messages → per-user session
    const effectiveSenderId = senderId || "unknown";
    const userSession = userSessions.getOrCreate(channelType, effectiveSenderId);
    const userCls = userSessions.getClassification(effectiveSenderId);

    const sendEvent = buildSendEvent(channelState.adapter, channelState.channelName, msg);

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
    activeNonOwnerCeiling = userSessions.hasExplicitClassification(effectiveSenderId)
      ? userSessions.getClassification(effectiveSenderId)
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
        userSessions.updateSession(channelType, effectiveSenderId, updated);
      }
      activeSend = null;
      activeSessionId = ownerSessionId;
      activeNonOwnerCeiling = null;
      resolve!();
    }
  }

  function clear(): void {
    orchestrator.clearHistory(getSession().id);
    if (config.resetSession) {
      config.resetSession();
    }
  }

  async function compact(sendEvent: ChatEventSender): Promise<void> {
    sendEvent({ type: "compact_start" });
    try {
      const result = await orchestrator.compactHistory(getSession().id);
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
    get sessionTaint() {
      return getSessionTaint();
    },
  };
}
