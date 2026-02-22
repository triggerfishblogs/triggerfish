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
 * Types and interfaces live in `chat_types.ts`.
 *
 * @module
 */

import { createLogger } from "../core/logger/mod.ts";
import { createOrchestrator } from "../agent/orchestrator.ts";
import type {
  OrchestratorEvent,
  OrchestratorEventCallback,
} from "../agent/orchestrator.ts";
import type { SessionState } from "../core/types/session.ts";
import { updateTaint } from "../core/types/session.ts";
import type { ClassificationLevel } from "../core/types/classification.ts";
import type { MessageContent } from "../core/image/content.ts";
import type { ChannelAdapter, ChannelMessage } from "../channels/types.ts";
import {
  createUserSessionManager,
  parseUserOverrides,
} from "../channels/user_sessions.ts";
import type { UserSessionManager } from "../channels/user_sessions.ts";

import type {
  ChatEvent,
  ChatEventSender,
  ChatSession,
  ChatSessionConfig,
  ChannelRegistrationConfig,
} from "./chat_types.ts";

// ─── Barrel re-exports from chat_types.ts ───────────────────────────────────

export type {
  ChatEvent,
  ChatClientMessage,
  ChatEventSender,
  ChatSession,
  ChatSessionConfig,
  ChannelClassificationConfig,
  ChannelRegistrationConfig,
} from "./chat_types.ts";

const chatLog = createLogger("chat");

// ─── Internal per-channel state ─────────────────────────────────────────────

/** Internal per-channel state tracked by ChatSession. */
interface ChannelState {
  readonly userSessions: UserSessionManager;
  readonly adapter: ChannelAdapter;
  readonly channelName: string;
  readonly respondToUnclassified: boolean;
  readonly pairing: boolean;
  readonly pairingClassification: ClassificationLevel;
}

// ─── buildSendEvent ─────────────────────────────────────────────────────────

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
      adapter.sendTyping?.(msg.sessionId ?? "").catch((err: unknown) => {
        chatLog.debug("Typing indicator send failed", {
          channel: channelName,
          error: err instanceof Error ? err.message : String(err),
        });
      });
      typingInterval = setInterval(() => {
        adapter.sendTyping?.(msg.sessionId ?? "").catch((err: unknown) => {
          chatLog.debug("Typing indicator send failed", {
            channel: channelName,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }, 4000) as unknown as number;
    }

    if (event.type === "tool_result" && event.blocked) {
      adapter.send({
        content: event.result,
        sessionId: msg.sessionId,
      }).catch((err) => chatLog.warn(`${channelName} send error:`, err));
    }

    if (event.type === "response") {
      clearInterval(typingInterval);
      typingInterval = undefined;
      const text = event.text.trim();
      if (text.length > 0) {
        adapter.send({
          content: text,
          sessionId: msg.sessionId,
        }).catch((err) => chatLog.warn(`${channelName} send error:`, err));
      } else {
        chatLog.warn(`${channelName}: skipping empty response (LLM returned no text)`);
      }
    }

    if (event.type === "error") {
      clearInterval(typingInterval);
      typingInterval = undefined;
      adapter.send({
        content: `Error: ${event.message}`,
        sessionId: msg.sessionId,
      }).catch((err) => chatLog.warn(`${channelName} send error:`, err));
    }
  };
}

// ─── createChatSession ──────────────────────────────────────────────────────

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
    getExtraTools: config.getExtraTools,
    getExtraSystemPromptSections: config.getExtraSystemPromptSections,
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
    secretStore: config.secretStore,
  });

  const initialSession = config.session;
  function getSession(): SessionState {
    return config.getSession?.() ?? initialSession;
  }

  const providerName = config.providerRegistry.getDefault()?.name ?? "unknown";
  const modelName = config.primaryModelName ?? config.providerRegistry.getDefault()?.name ?? "unknown";

  // Registry of pending secret prompt requests from the Tidepool browser client.
  // Keyed by nonce; values are resolve functions from awaited Promises.
  const pendingSecretPrompts = new Map<string, (value: string | null) => void>();

  // Promise-chain mutex: each executeAgentTurn waits for the previous to finish
  let mutex: Promise<void> = Promise.resolve();

  async function executeAgentTurn(
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
      const result = await orchestrator.executeAgentTurn({
        session: getSession(),
        message: content,
        targetClassification: ownerTargetClassification,
        signal,
      });

      if (!result.ok && !signal?.aborted) {
        sendEvent({ type: "error", message: result.error });
      }
    } catch (err: unknown) {
      if (!signal?.aborted) {
        const msg = err instanceof Error ? err.message : String(err);
        sendEvent({ type: "error", message: msg });
      }
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
      chatLog.error(`No channel config registered for ${channelType}`);
      return;
    }

    // Owner messages → build sendEvent from adapter → main daemon session
    if (msg.isOwner !== false) {
      const sendEvent = buildSendEvent(channelState.adapter, channelState.channelName, msg);
      return executeAgentTurn(msg.content, sendEvent, signal);
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
              }).catch((err: unknown) => {
                chatLog.debug("Pairing confirmation send failed", {
                  channel: channelType,
                  error: err instanceof Error ? err.message : String(err),
                });
              });
            }
            // Invalid/expired code: stay silent.
          }
        }
        // Pairing required, user not classified → drop
        return;
      }

      // No pairing, no classification → check respondToUnclassified
      if (!channelState.respondToUnclassified) {
        chatLog.warn(`[${channelType}] Dropping unclassified sender ${senderId} (respondToUnclassified=false)`);
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
      const result = await orchestrator.executeAgentTurn({
        session: userSession,
        message: msg.content,
        targetClassification: userCls,
        signal,
      });

      if (!result.ok && !signal?.aborted) {
        sendEvent({ type: "error", message: result.error });
      }
    } catch (err: unknown) {
      if (!signal?.aborted) {
        const errMsg = err instanceof Error ? err.message : String(err);
        sendEvent({ type: "error", message: errMsg });
      }
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

  function handleSecretPromptResponse(nonce: string, value: string | null): void {
    const resolve = pendingSecretPrompts.get(nonce);
    if (resolve) {
      pendingSecretPrompts.delete(nonce);
      resolve(value);
    }
  }

  function createTidepoolSecretPrompt(
    sendEvent: ChatEventSender,
  ): (name: string, hint?: string) => Promise<string | null> {
    return (name: string, hint?: string): Promise<string | null> => {
      const nonce = crypto.randomUUID();
      return new Promise<string | null>((resolve) => {
        pendingSecretPrompts.set(nonce, resolve);
        const promptEvent: ChatEvent = hint !== undefined
          ? { type: "secret_prompt", nonce, name, hint }
          : { type: "secret_prompt", nonce, name };
        sendEvent(promptEvent);
      });
    };
  }

  // Stored MCP status for sending to new clients on connect
  let mcpStatusConnected = -1;
  let mcpStatusConfigured = 0;

  return {
    executeAgentTurn,
    registerChannel,
    handleChannelMessage,
    clear,
    compact,
    handleSecretPromptResponse,
    createTidepoolSecretPrompt,
    getMcpStatus(): { connected: number; configured: number } | null {
      if (mcpStatusConnected < 0 || mcpStatusConfigured === 0) return null;
      return { connected: mcpStatusConnected, configured: mcpStatusConfigured };
    },
    setMcpStatus(connected: number, configured: number): void {
      mcpStatusConnected = connected;
      mcpStatusConfigured = configured;
    },
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
