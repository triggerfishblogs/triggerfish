/**
 * A2UI chat message dispatch.
 *
 * Parses incoming WebSocket chat messages from Tidepool browser clients
 * and routes them to the appropriate ChatSession method (cancel, clear,
 * secret prompt response, or agent turn execution).
 *
 * @module
 */

import type { ChatClientMessage, ChatSession } from "../../../gateway/chat.ts";
import type { MessageContent } from "../../../core/image/content.ts";
import { trySendSocketPayload } from "./host_broadcast.ts";
import { createLogger } from "../../../core/logger/logger.ts";

const log = createLogger("tidepool-chat");

/** Mutable holder so event-listener closures can read/write the current AbortController. */
export interface AbortControllerRef {
  current: AbortController | null;
}

/** Context needed to dispatch a client chat message. */
export interface ChatDispatchContext {
  readonly socket: WebSocket;
  readonly chatSession: ChatSession;
  readonly ref: AbortControllerRef;
}

/** Parse and dispatch a client chat message (cancel, clear, secret_prompt_response, message). */
export function dispatchClientChatMessage(
  rawData: string | ArrayBuffer,
  ctx: ChatDispatchContext,
): void {
  const text = typeof rawData === "string"
    ? rawData
    : new TextDecoder().decode(rawData as ArrayBuffer);
  const msg = JSON.parse(text) as ChatClientMessage;

  if (msg.type === "cancel") {
    dispatchCancelMessage(ctx.socket, ctx.ref);
    return;
  }
  if (msg.type === "clear") {
    ctx.chatSession.clear();
    return;
  }
  if (msg.type === "secret_prompt_response") {
    log.debug("Dispatching secret prompt response", { operation: "dispatchClientChatMessage", nonce: msg.nonce });
    ctx.chatSession.handleSecretPromptResponse(msg.nonce, msg.value);
    return;
  }
  if (msg.type === "credential_prompt_response") {
    log.debug("Dispatching credential prompt response", { operation: "dispatchClientChatMessage", nonce: msg.nonce });
    ctx.chatSession.handleCredentialPromptResponse(
      msg.nonce,
      msg.username,
      msg.password,
    );
    return;
  }
  if (msg.type === "trigger_prompt_response") {
    log.debug("Dispatching trigger prompt response", {
      operation: "dispatchClientChatMessage",
      source: msg.source,
      accepted: msg.accepted,
    });
    const send = (evt: unknown) => {
      trySendSocketPayload(ctx.socket, JSON.stringify(evt));
    };
    ctx.chatSession.handleTriggerPromptResponse(msg.source, msg.accepted, send);
    return;
  }
  if (msg.type === "message" && isNonEmptyContent(msg.content)) {
    executeAgentTurnFromSocket(msg.content, ctx);
  }
}

/** Check whether message content is non-empty (string or non-empty array). */
function isNonEmptyContent(content: MessageContent): boolean {
  return (
    typeof content === "string" ||
    (Array.isArray(content) && content.length > 0)
  );
}

/** Handle a cancel message by aborting the current agent turn. */
function dispatchCancelMessage(
  socket: WebSocket,
  ref: AbortControllerRef,
): void {
  if (ref.current) {
    ref.current.abort();
    trySendSocketPayload(socket, JSON.stringify({ type: "cancelled" }));
  }
}

/** Start an agent turn, routing events back through the socket. */
function executeAgentTurnFromSocket(
  content: MessageContent,
  ctx: ChatDispatchContext,
): void {
  ctx.ref.current = new AbortController();
  const signal = ctx.ref.current.signal;

  const send = (evt: unknown) => {
    trySendSocketPayload(ctx.socket, JSON.stringify(evt));
  };

  ctx.chatSession.executeAgentTurn(content, send, signal).finally(() => {
    ctx.ref.current = null;
  });
}
