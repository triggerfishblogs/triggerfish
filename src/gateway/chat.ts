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
  ChannelRegistrationConfig,
  ChatEvent,
  ChatEventSender,
  ChatSession,
  ChatSessionConfig,
} from "./chat_types.ts";

// ─── Barrel re-exports from chat_types.ts ───────────────────────────────────

export type {
  ChannelClassificationConfig,
  ChannelRegistrationConfig,
  ChatClientMessage,
  ChatEvent,
  ChatEventSender,
  ChatSession,
  ChatSessionConfig,
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

/** Start or restart typing indicator interval for a channel. */
function startTypingIndicator(
  adapter: ChannelAdapter,
  channelName: string,
  sessionId: string,
): number {
  const sendTyping = () => {
    adapter.sendTyping?.(sessionId).catch((err: unknown) => {
      chatLog.debug("Typing indicator send failed", {
        channel: channelName,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  };
  sendTyping();
  return setInterval(sendTyping, 4000) as unknown as number;
}

/** Send a message through the adapter, logging errors. */
function sendAdapterMessage(
  adapter: ChannelAdapter,
  channelName: string,
  sessionId: string | undefined,
  content: string,
): void {
  adapter.send({ content, sessionId })
    .catch((err) => chatLog.warn(`${channelName} send error:`, err));
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
      typingInterval = startTypingIndicator(
        adapter,
        channelName,
        msg.sessionId ?? "",
      );
    }
    if (event.type === "tool_result" && event.blocked) {
      sendAdapterMessage(adapter, channelName, msg.sessionId, event.result);
    }
    if (event.type === "response") {
      clearInterval(typingInterval);
      typingInterval = undefined;
      const text = event.text.trim();
      if (text.length > 0) {
        sendAdapterMessage(adapter, channelName, msg.sessionId, text);
      } else {
        chatLog.warn(
          `${channelName}: skipping empty response (LLM returned no text)`,
        );
      }
    }
    if (event.type === "error") {
      clearInterval(typingInterval);
      typingInterval = undefined;
      sendAdapterMessage(
        adapter,
        channelName,
        msg.sessionId,
        `Error: ${event.message}`,
      );
    }
  };
}

// ─── Pairing & Access Control ────────────────────────────────────────────────

/** Attempt pairing verification for a DM message containing a 6-digit code. */
async function attemptPairingVerification(
  msg: ChannelMessage,
  channelType: string,
  senderId: string,
  channelState: ChannelState,
  pairingService: ChatSessionConfig["pairingService"],
): Promise<void> {
  const isGroupMsg = msg.sessionId?.startsWith(`${channelType}-group-`) ??
    false;
  if (isGroupMsg) return;

  const codeMatch = (msg.content ?? "").trim().match(/^\d{6}$/);
  if (!codeMatch || !pairingService) return;

  const result = await pairingService.verifyCode(
    codeMatch[0],
    channelType,
    senderId,
  );
  if (result.ok) {
    channelState.userSessions.addClassification(
      senderId,
      channelState.pairingClassification,
    );
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
}

/**
 * Check non-owner access control. Returns true if the message should be processed,
 * false if it should be dropped.
 */
async function checkNonOwnerAccess(
  msg: ChannelMessage,
  channelType: string,
  senderId: string,
  channelState: ChannelState,
  pairingService: ChatSessionConfig["pairingService"],
): Promise<boolean> {
  const hasClassification = channelState.userSessions.hasExplicitClassification(
    senderId || "unknown",
  );
  if (hasClassification) return true;

  if (channelState.pairing && senderId) {
    await attemptPairingVerification(
      msg,
      channelType,
      senderId,
      channelState,
      pairingService,
    );
    return false;
  }

  if (!channelState.respondToUnclassified) {
    chatLog.warn(
      `[${channelType}] Dropping unclassified sender ${senderId} (respondToUnclassified=false)`,
    );
    return false;
  }

  return true;
}

/** Send an orchestrator error result to the event sender if not aborted. */
function sendTurnErrorIfNotAborted(
  sendEvent: ChatEventSender,
  err: unknown,
  signal?: AbortSignal,
): void {
  if (!signal?.aborted) {
    const msg = err instanceof Error ? err.message : String(err);
    sendEvent({ type: "error", message: msg });
  }
}

/** Pre-load paired users into the user session manager. */
async function preloadPairedUsers(
  pairingService: ChatSessionConfig["pairingService"],
  channelType: string,
  mgr: UserSessionManager,
  pairingCls: ClassificationLevel,
): Promise<void> {
  if (!pairingService) return;
  try {
    const linkedUsers = await pairingService.getLinkedUsers(channelType);
    for (const userId of linkedUsers) mgr.addClassification(userId, pairingCls);
  } catch { /* ignore if prefix listing not supported */ }
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
  let activeSend: ChatEventSender | null = null;
  const ownerSessionId = config.session.id as string;
  let activeSessionId: string = ownerSessionId;
  const ownerTargetClassification = config.targetClassification ??
    "INTERNAL" as ClassificationLevel;
  let activeNonOwnerCeiling: ClassificationLevel | null = null;
  const sessionStates = new Map<string, SessionState>();
  sessionStates.set(ownerSessionId, config.session);
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
      if (s) sessionStates.set(activeSessionId, updateTaint(s, level, reason));
    }
    const newTaint = getSessionTaint();
    if (newTaint !== prevTaint && activeSend) {
      activeSend({ type: "taint_changed", level: newTaint });
    }
  }

  const orchestrator = createOrchestrator({
    hookRunner: config.hookRunner,
    providerRegistry: config.providerRegistry,
    spinePath: config.spinePath,
    tools: config.tools,
    getExtraTools: config.getExtraTools,
    getExtraSystemPromptSections: config.getExtraSystemPromptSections,
    toolExecutor: config.toolExecutor,
    onEvent: (event) => {
      if (activeSend) activeSend(event as ChatEvent);
    },
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
  const getSession = (): SessionState =>
    config.getSession?.() ?? initialSession;
  const providerName = config.providerRegistry.getDefault()?.name ?? "unknown";
  const modelName = config.primaryModelName ??
    config.providerRegistry.getDefault()?.name ?? "unknown";
  const pendingSecretPrompts = new Map<
    string,
    (value: string | null) => void
  >();
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
      sendTurnErrorIfNotAborted(sendEvent, err, signal);
    } finally {
      activeSend = null;
      activeSessionId = ownerSessionId;
      resolve!();
    }
  }

  async function registerChannel(
    channelType: string,
    channelConfig: ChannelRegistrationConfig,
  ): Promise<void> {
    const mgr = createUserSessionManager({
      channelDefault: channelConfig.classification,
      userOverrides: parseUserOverrides(channelConfig.userClassifications),
    });
    const pairingCls = channelConfig.pairingClassification ??
      "INTERNAL" as ClassificationLevel;
    if (channelConfig.pairing) {
      await preloadPairedUsers(pairingService, channelType, mgr, pairingCls);
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

  async function executeNonOwnerTurn(
    msg: ChannelMessage,
    channelType: string,
    channelState: ChannelState,
    signal?: AbortSignal,
  ): Promise<void> {
    const senderId = msg.senderId ?? "";
    const effectiveSenderId = senderId || "unknown";
    const userSessions = channelState.userSessions;
    const userSession = userSessions.getOrCreate(
      channelType,
      effectiveSenderId,
    );
    const userCls = userSessions.getClassification(effectiveSenderId);
    const sendEvent = buildSendEvent(
      channelState.adapter,
      channelState.channelName,
      msg,
    );

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
    activeNonOwnerCeiling =
      userSessions.hasExplicitClassification(effectiveSenderId)
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
      sendTurnErrorIfNotAborted(sendEvent, err, signal);
    } finally {
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

    if (msg.isOwner !== false) {
      return executeAgentTurn(
        msg.content,
        buildSendEvent(channelState.adapter, channelState.channelName, msg),
        signal,
      );
    }

    const senderId = msg.senderId ?? "";
    const allowed = await checkNonOwnerAccess(
      msg,
      channelType,
      senderId,
      channelState,
      pairingService,
    );
    if (!allowed) return;

    await executeNonOwnerTurn(msg, channelType, channelState, signal);
  }

  function clear(): void {
    orchestrator.clearHistory(getSession().id);
    if (config.resetSession) config.resetSession();
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
      sendEvent({
        type: "error",
        message: `Compact failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      });
    }
  }

  function handleSecretPromptResponse(
    nonce: string,
    value: string | null,
  ): void {
    const resolve = pendingSecretPrompts.get(nonce);
    if (resolve) {
      pendingSecretPrompts.delete(nonce);
      resolve(value);
    }
  }

  function createTidepoolSecretPrompt(
    sendEvent: ChatEventSender,
  ): (name: string, hint?: string) => Promise<string | null> {
    return (name, hint) => {
      const nonce = crypto.randomUUID();
      return new Promise<string | null>((resolve) => {
        pendingSecretPrompts.set(nonce, resolve);
        sendEvent(
          hint !== undefined
            ? { type: "secret_prompt", nonce, name, hint }
            : { type: "secret_prompt", nonce, name },
        );
      });
    };
  }

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
    getMcpStatus() {
      if (mcpStatusConnected < 0 || mcpStatusConfigured === 0) return null;
      return { connected: mcpStatusConnected, configured: mcpStatusConfigured };
    },
    setMcpStatus(connected, configured) {
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
