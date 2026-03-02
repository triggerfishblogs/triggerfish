/**
 * Channel messaging tool handlers.
 *
 * Implements the message and channels_list handlers. Write-down enforcement
 * uses the injected context taint, not LLM arguments.
 *
 * @module
 */

import {
  canFlowTo,
  type ClassificationLevel,
} from "../../../core/types/classification.ts";
import { createLogger } from "../../../core/logger/logger.ts";

import type { SessionToolContext } from "./session_tools_defs.ts";

const log = createLogger("security");

/** Tool names handled by this executor. */
export const CHANNEL_TOOLS = new Set([
  "message",
  "channels_list",
]);

/** Build a session ID from a channel type and recipient identifier. */
function buildChannelSessionId(opts: {
  readonly channel: string;
  readonly recipient: string;
}): string {
  if (opts.channel === "signal") {
    return opts.recipient.startsWith("group-")
      ? `signal-${opts.recipient}`
      : `signal-${opts.recipient}`;
  }
  return `${opts.channel}-${opts.recipient}`;
}

/** Validate message tool input, returning an error string or null if valid. */
function validateMessageInput(input: Record<string, unknown>): string | null {
  if (typeof input.channel !== "string" || input.channel.length === 0) {
    return "Error: message requires a non-empty 'channel' argument (string).";
  }
  if (typeof input.recipient !== "string" || input.recipient.length === 0) {
    return "Error: message requires a non-empty 'recipient' argument (string).";
  }
  if (typeof input.text !== "string" || input.text.length === 0) {
    return "Error: message requires a non-empty 'text' argument (string).";
  }
  return null;
}

/** Enforce write-down policy for outbound messages. Returns error string or null. */
function enforceMessageWriteDown(ctx: SessionToolContext, opts: {
  readonly channel: string;
  readonly channelClassification: ClassificationLevel;
}): string | null {
  const currentTaint = ctx.getCallerTaint?.() ?? ctx.callerTaint;
  if (!canFlowTo(currentTaint, opts.channelClassification)) {
    log.warn("Message write-down blocked", {
      channel: opts.channel,
      sessionTaint: currentTaint,
      channelClassification: opts.channelClassification,
    });
    return `Write-down blocked: your session taint is ${currentTaint}, but channel "${opts.channel}" is classified as ${opts.channelClassification}. Data cannot flow from ${currentTaint} to ${opts.channelClassification}.`;
  }
  return null;
}

/** Handle message: send to a connected channel with write-down enforcement. */
async function executeMessage(
  ctx: SessionToolContext,
  input: Record<string, unknown>,
): Promise<string> {
  const validationErr = validateMessageInput(input);
  if (validationErr) return validationErr;

  const channel = input.channel as string;
  const recipient = input.recipient as string;
  const text = input.text as string;

  if (!ctx.channels || ctx.channels.size === 0) {
    return "Error: no messaging channels are connected. Use channels_list to check.";
  }

  const registered = ctx.channels.get(channel);
  if (!registered) {
    const available = [...ctx.channels.keys()].join(", ");
    return `Error: channel "${channel}" is not connected. Available channels: ${available}`;
  }

  const writeDownErr = enforceMessageWriteDown(ctx, {
    channel,
    channelClassification: registered.classification,
  });
  if (writeDownErr) return writeDownErr;

  const status = registered.adapter.status();
  if (!status.connected) {
    return `Error: channel "${channel}" is registered but not currently connected.`;
  }

  const sessionId = buildChannelSessionId({ channel, recipient });

  try {
    await registered.adapter.send({ content: text, sessionId });
    return JSON.stringify({
      status: "sent",
      channel,
      recipient,
      classification: registered.classification,
      text_length: text.length,
    });
  } catch (err) {
    return `Error sending message: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }
}

/** Handle channels_list: enumerate connected channels and their status. */
function executeChannelsList(ctx: SessionToolContext): string {
  if (!ctx.channels || ctx.channels.size === 0) {
    return "No messaging channels are connected.";
  }
  const entries: string[] = [];
  for (const [type, reg] of ctx.channels) {
    const status = reg.adapter.status();
    entries.push(
      `${type}\n  Name: ${reg.name}\n  Classification: ${reg.classification}\n  Connected: ${status.connected}`,
    );
  }
  return entries.join("\n\n");
}

/**
 * Dispatch a channel messaging tool call.
 *
 * Returns the tool result string, or null if the tool name is not recognized.
 */
// deno-lint-ignore require-await
export async function dispatchChannelTool(
  ctx: SessionToolContext,
  name: string,
  input: Record<string, unknown>,
): Promise<string | null> {
  switch (name) {
    case "message":
      return executeMessage(ctx, input);
    case "channels_list":
      return executeChannelsList(ctx);
    default:
      return null;
  }
}
