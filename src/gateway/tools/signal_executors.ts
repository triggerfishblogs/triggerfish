/**
 * Signal-specific tool handlers.
 *
 * Implements signal_list_groups, signal_list_contacts, and
 * signal_generate_pairing handlers. Requires the Signal channel
 * adapter to be connected.
 *
 * @module
 */

import type { SignalChannelAdapter } from "../../channels/signal/adapter.ts";

import type { SessionToolContext } from "./session_tools_defs.ts";

/** Tool names handled by this executor. */
export const SIGNAL_TOOLS = new Set([
  "signal_list_groups",
  "signal_list_contacts",
  "signal_generate_pairing",
]);

/** Resolve the Signal adapter from context, returning an error string if unavailable. */
function resolveSignalAdapter(
  ctx: SessionToolContext,
): SignalChannelAdapter | string {
  if (!ctx.channels) return "No channels connected.";
  const signalReg = ctx.channels.get("signal");
  if (!signalReg) return "Signal is not connected.";
  if (!signalReg.adapter.status().connected) {
    return "Signal is registered but not currently connected.";
  }
  return signalReg.adapter as SignalChannelAdapter;
}

/** Format a Signal group for display. */
function formatSignalGroup(g: {
  readonly id: string;
  readonly name: string;
  readonly members?: readonly unknown[];
  readonly description?: string;
}): string {
  const members = g.members ? ` (${g.members.length} members)` : "";
  const desc = g.description ? `\n  Description: ${g.description}` : "";
  return `${g.name}\n  Group ID: ${g.id}${members}${desc}`;
}

/** Handle signal_list_groups: enumerate Signal groups the account belongs to. */
async function executeSignalListGroups(
  ctx: SessionToolContext,
): Promise<string> {
  const adapterOrErr = resolveSignalAdapter(ctx);
  if (typeof adapterOrErr === "string") return adapterOrErr;

  if (!adapterOrErr.listGroups) {
    return "Signal adapter does not support listing groups.";
  }

  try {
    const result = await adapterOrErr.listGroups();
    if (!result.ok) return `Error listing groups: ${result.error}`;
    if (result.value.length === 0) return "No Signal groups found.";
    return result.value
      .filter((g) => g.isMember && !g.isBlocked)
      .map(formatSignalGroup)
      .join("\n\n");
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/** Format a Signal contact for display. */
function formatSignalContact(c: {
  readonly name?: string;
  readonly profileName?: string;
  readonly number?: string;
}): string {
  const displayName = c.name || c.profileName || "Unknown";
  return `${displayName}\n  Phone: ${c.number}`;
}

/** Handle signal_list_contacts: enumerate known Signal contacts. */
async function executeSignalListContacts(
  ctx: SessionToolContext,
): Promise<string> {
  const adapterOrErr = resolveSignalAdapter(ctx);
  if (typeof adapterOrErr === "string") return adapterOrErr;

  if (!adapterOrErr.listContacts) {
    return "Signal adapter does not support listing contacts.";
  }

  try {
    const result = await adapterOrErr.listContacts();
    if (!result.ok) return `Error listing contacts: ${result.error}`;
    if (result.value.length === 0) return "No Signal contacts found.";
    return result.value
      .filter((c) => !c.isBlocked && c.number)
      .map(formatSignalContact)
      .join("\n\n");
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/** Handle signal_generate_pairing: generate a pairing code for Signal. */
async function executeSignalGeneratePairing(
  ctx: SessionToolContext,
): Promise<string> {
  if (!ctx.pairingService) {
    return "Pairing service is not available. Signal may not be configured with pairing: true.";
  }
  try {
    const code = await ctx.pairingService.generateCode("signal");
    return `Pairing code generated: ${code.code}\n\nGive this code to the person who wants to chat. They should send it as a message to your Signal number. The code expires in 5 minutes.`;
  } catch (err) {
    return `Error generating pairing code: ${err instanceof Error ? err.message : String(err)}`;
  }
}

/**
 * Dispatch a Signal-specific tool call.
 *
 * Returns the tool result string, or null if the tool name is not recognized.
 */
export async function dispatchSignalTool(
  ctx: SessionToolContext,
  name: string,
  _input: Record<string, unknown>,
): Promise<string | null> {
  switch (name) {
    case "signal_list_groups":
      return executeSignalListGroups(ctx);
    case "signal_list_contacts":
      return executeSignalListContacts(ctx);
    case "signal_generate_pairing":
      return executeSignalGeneratePairing(ctx);
    default:
      return null;
  }
}
