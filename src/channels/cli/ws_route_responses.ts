/**
 * WebSocket event handlers for response lifecycle events.
 *
 * Handles cancelled, error, compact_start, compact_complete,
 * response_chunk, and response events from the daemon.
 * @module
 */

import {
  formatError,
  renderError,
  renderPrompt,
} from "../../cli/chat/chat_ui.ts";
import type { OrchestratorEvent } from "../../agent/orchestrator/orchestrator_types.ts";
import type { ChatEvent } from "../../core/types/chat_event.ts";

import { sendNextQueuedMessage } from "./chat_ws_types.ts";
import type { RouterContext } from "./ws_route_status.ts";
import { drainPendingTriggerPrompt } from "./ws_route_prompts.ts";

/** Handle "cancelled" event. */
export function routeCancelledEvent(ctx: RouterContext): void {
  if (ctx.isTty) {
    ctx.screen.stopSpinner();
    ctx.screen.redrawInput(ctx.editor);
  }
  ctx.state.isProcessing = false;
  sendNextQueuedMessage(ctx.deps);
  drainPendingTriggerPrompt(ctx);
}

/** Handle "error" event. */
export function routeErrorEvent(
  evt: Extract<ChatEvent, { type: "error" }>,
  ctx: RouterContext,
): void {
  if (ctx.isTty) {
    ctx.screen.stopSpinner();
    ctx.screen.writeOutput(formatError(evt.message));
    ctx.screen.writeOutput("");
    ctx.screen.redrawInput(ctx.editor);
  } else {
    renderError(evt.message);
    renderPrompt();
  }
  ctx.state.isProcessing = false;
  sendNextQueuedMessage(ctx.deps);
  drainPendingTriggerPrompt(ctx);
}

/** Handle "compact_start" event. */
export function routeCompactStartEvent(ctx: RouterContext): void {
  if (ctx.isTty) {
    ctx.screen.startSpinner("Summarizing history...");
  } else {
    console.log("  Summarizing history...");
  }
}

/** Handle "compact_complete" event. */
export function routeCompactCompleteEvent(
  evt: Extract<ChatEvent, { type: "compact_complete" }>,
  ctx: RouterContext,
): void {
  const saved = evt.tokensBefore - evt.tokensAfter;
  const msg =
    `  Compacted: ${evt.messagesBefore} \u2192 ${evt.messagesAfter} messages (saved ~${saved} tokens)`;
  if (ctx.isTty) {
    ctx.screen.stopSpinner();
    ctx.screen.writeOutput(msg);
    ctx.screen.redrawInput(ctx.editor);
  } else {
    console.log(msg);
    renderPrompt();
  }
}

/** Handle "response_chunk" event (streaming text). */
export function routeResponseChunkEvent(
  evt: ChatEvent,
  ctx: RouterContext,
): void {
  ctx.eventHandler(evt as OrchestratorEvent);
  if (ctx.isTty) ctx.screen.redrawInput(ctx.editor);
}

/** Handle "response" event (final response). */
export function routeResponseCompleteEvent(
  evt: ChatEvent,
  ctx: RouterContext,
): void {
  ctx.eventHandler(evt as OrchestratorEvent);
  ctx.state.isProcessing = false;
  if (ctx.isTty) {
    ctx.screen.writeOutput("");
    ctx.screen.redrawInput(ctx.editor);
  } else {
    renderPrompt();
  }
  sendNextQueuedMessage(ctx.deps);
  drainPendingTriggerPrompt(ctx);
}

/** Forward an unhandled orchestrator event to the event handler. */
export function forwardOrchestratorEvent(
  evt: ChatEvent,
  ctx: RouterContext,
): void {
  ctx.eventHandler(evt as OrchestratorEvent);
  if (ctx.isTty) {
    ctx.screen.redrawInput(ctx.editor);
  }
}
