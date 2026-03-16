/**
 * WebSocket event handlers for interactive prompts.
 *
 * Handles secret_prompt, credential_prompt, and trigger_prompt events
 * from the daemon, including trigger classification checks.
 * @module
 */

import { createLogger } from "../../core/logger/logger.ts";
import type { ClassificationLevel } from "../../core/types/classification.ts";
import { canFlowTo } from "../../core/types/classification.ts";
import type { ChatEvent } from "../../core/types/chat_event.ts";

import type { TriggerPromptModeState } from "./chat_ws_types.ts";
import type { RouterContext } from "./ws_route_status.ts";

const log = createLogger("cli");

/** Handle "secret_prompt" event. */
export function routeSecretPromptEvent(
  evt: Extract<ChatEvent, { type: "secret_prompt" }>,
  ctx: RouterContext,
): void {
  if (!ctx.isTty) return;
  log.info("Secret prompt received", {
    operation: "routeSecretPromptEvent",
    secretName: evt.name,
    nonce: evt.nonce,
  });
  ctx.state.passwordMode = {
    nonce: evt.nonce,
    name: evt.name,
    hint: evt.hint,
    chars: [],
  };
  ctx.screen.stopSpinner();
  const hintStr = evt.hint ? ` (${evt.hint})` : "";
  ctx.screen.writeOutput(
    `  \x1b[33m\u{1f512} Enter value for '${evt.name}'${hintStr}\x1b[0m`,
  );
  ctx.screen.setStatus(
    "\u{1f512} Type secret, Enter to submit, Esc to cancel",
  );
  ctx.screen.redrawInput(ctx.editor);
}

/** Handle "credential_prompt" event. */
export function routeCredentialPromptEvent(
  evt: Extract<ChatEvent, { type: "credential_prompt" }>,
  ctx: RouterContext,
): void {
  if (!ctx.isTty) return;
  log.info("Credential prompt received", {
    operation: "routeCredentialPromptEvent",
    credentialName: evt.name,
    nonce: evt.nonce,
  });
  ctx.state.credentialMode = {
    nonce: evt.nonce,
    name: evt.name,
    hint: evt.hint,
    phase: "username",
    username: [],
    password: [],
  };
  ctx.screen.stopSpinner();
  const hintStr = evt.hint ? ` (${evt.hint})` : "";
  ctx.screen.writeOutput(
    `  \x1b[33m\u{1f512} Enter credentials for '${evt.name}'${hintStr}\x1b[0m`,
  );
  ctx.screen.setStatus(
    "\u{1f512} Type username, Enter to continue, Esc to cancel",
  );
  ctx.screen.redrawInput(ctx.editor);
}

/** Build the consequence clause for the trigger prompt question. */
export function describeTriggerConsequence(
  sessionTaint: ClassificationLevel,
  triggerClassification: ClassificationLevel,
  isWriteDown: boolean,
): string {
  if (isWriteDown) {
    return "Your context will be reset to incorporate this result.";
  }
  const addedMsg =
    "This result will be added to your current conversation context.";
  if (sessionTaint === triggerClassification) {
    return addedMsg;
  }
  return `Your session will escalate from ${sessionTaint} to ${triggerClassification}. ${addedMsg}`;
}

/** Activate a trigger prompt — show the question and enter prompt mode. */
export function activateTriggerPrompt(
  prompt: TriggerPromptModeState,
  ctx: RouterContext,
): void {
  const sessionTaint = ctx.screen.getTaint();
  const isWriteDown = !canFlowTo(sessionTaint, prompt.classification);
  log.debug("Trigger prompt classification check", {
    operation: "activateTriggerPrompt",
    sessionTaint,
    triggerClassification: prompt.classification,
    isWriteDown,
  });
  const consequence = describeTriggerConsequence(
    sessionTaint,
    prompt.classification,
    isWriteDown,
  );

  ctx.screen.stopSpinner();
  ctx.screen.writeOutput(
    `  \x1b[33m\u26a1\x1b[0m \x1b[1mWould you like to allow this trigger result into context? ${consequence}\x1b[0m`,
  );
  ctx.screen.setStatus(
    isWriteDown
      ? "\u26a0 Session will reset. [Y] Accept  [N/Esc] Dismiss"
      : "\u26a1 Add to context? [Y] Accept  [N/Esc] Dismiss",
  );
  ctx.state.triggerPromptMode = prompt;
  ctx.screen.redrawInput(ctx.editor);
}

/** Handle "trigger_prompt" event. */
export function routeTriggerPromptEvent(
  evt: Extract<ChatEvent, { type: "trigger_prompt" }>,
  ctx: RouterContext,
): void {
  if (!ctx.isTty) return;
  const prompt: TriggerPromptModeState = {
    source: evt.source,
    classification: evt.classification,
  };
  if (ctx.state.isProcessing) {
    ctx.state.pendingTriggerPrompt = prompt;
    log.debug("Trigger prompt queued (agent is processing)", {
      operation: "routeTriggerPromptEvent",
      source: evt.source,
    });
    return;
  }
  log.debug("Trigger prompt activating immediately", {
    operation: "routeTriggerPromptEvent",
    source: evt.source,
  });
  activateTriggerPrompt(prompt, ctx);
}

/** Show a pending trigger prompt if one was queued while processing. */
export function drainPendingTriggerPrompt(ctx: RouterContext): void {
  if (!ctx.isTty) return;
  const pending = ctx.state.pendingTriggerPrompt;
  if (pending && !ctx.state.isProcessing) {
    ctx.state.pendingTriggerPrompt = null;
    activateTriggerPrompt(pending, ctx);
  }
}
