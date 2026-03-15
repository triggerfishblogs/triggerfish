/**
 * Conversation record serialisation — storage key helpers,
 * JSON serialisation/deserialisation, and token estimation.
 *
 * @module
 */

import type { ConversationRecord } from "./conversation_types.ts";

/** Maximum character length for stored tool_args JSON. */
const MAX_TOOL_ARGS_CHARS = 4096;

/** Zero-pad width for sequence numbers in storage keys. */
const SEQUENCE_PAD_WIDTH = 12;

/** Storage key for a conversation record. */
export function convRecordKey(sessionId: string, sequence: number): string {
  const padded = String(sequence).padStart(SEQUENCE_PAD_WIDTH, "0");
  return `conv:${sessionId}:${padded}`;
}

/** Storage key for a session's sequence counter. */
export function convSessionIndexKey(sessionId: string): string {
  return `conv-session:${sessionId}`;
}

/** Truncate tool args JSON to the storage limit. */
export function truncateToolArgs(
  args: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (args === undefined) return undefined;
  const json = JSON.stringify(args);
  if (json.length <= MAX_TOOL_ARGS_CHARS) return args;
  return {
    _truncated: true,
    _preview: json.slice(0, MAX_TOOL_ARGS_CHARS - 50),
  };
}

/** Serialise a ConversationRecord to a JSON string. */
export function serialiseConvRecord(record: ConversationRecord): string {
  return JSON.stringify(record);
}

/** Deserialise a JSON string to a ConversationRecord. */
export function deserialiseConvRecord(json: string): ConversationRecord {
  return JSON.parse(json) as ConversationRecord;
}

/**
 * Rough token estimate for a conversation record.
 * Uses ~4 chars per token heuristic.
 */
export function estimateRecordTokens(record: ConversationRecord): number {
  return Math.ceil(record.content.length / 4);
}
