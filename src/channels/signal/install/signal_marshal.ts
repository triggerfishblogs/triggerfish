/**
 * Signal entity marshaling.
 *
 * Converts raw signal-cli JSON records into typed SignalGroupEntry
 * and SignalContactEntry objects.
 *
 * @module
 */

import type { SignalContactEntry, SignalGroupEntry } from "../types.ts";

/** Map a raw signal-cli group record to a typed SignalGroupEntry. */
export function marshalSignalGroupEntry(
  g: Record<string, unknown>,
): SignalGroupEntry {
  return {
    id: String(g.id ?? ""),
    name: String(g.name ?? ""),
    description: g.description ? String(g.description) : undefined,
    isMember: Boolean(g.isMember),
    isBlocked: Boolean(g.isBlocked),
    members: Array.isArray(g.members) ? g.members.map(String) : undefined,
  };
}

/** Map a raw signal-cli contact record to a typed SignalContactEntry. */
export function marshalSignalContactEntry(
  c: Record<string, unknown>,
): SignalContactEntry {
  return {
    number: String(c.number ?? ""),
    name: c.name ? String(c.name) : undefined,
    profileName: c.profileName ? String(c.profileName) : undefined,
    isBlocked: Boolean(c.isBlocked),
  };
}
