/**
 * Conversation record serialisation — storage key helpers and
 * conversion between runtime ConversationRecord and JSON.
 *
 * @module
 */

import type {
  ConversationRecord,
  StoredConversationRecord,
} from "./conversation_types.ts";

/** Maximum character length for stored tool_args JSON. */
const MAX_TOOL_ARGS_CHARS = 4096;

/** Pad a sequence number to 12 digits for lexicographic ordering. */
export function padSequence(seq: number): string {
  return String(seq).padStart(12, "0");
}

/** Storage key for a conversation record. */
export function convRecordKey(sessionId: string, sequence: number): string {
  return `conv:${sessionId}:${padSequence(sequence)}`;
}

/** Storage key prefix for listing all records in a session. */
export function convSessionPrefix(sessionId: string): string {
  return `conv:${sessionId}:`;
}

/** Storage key for the session sequence counter. */
export function convSessionIndexKey(sessionId: string): string {
  return `conv-session:${sessionId}`;
}

/** Truncate tool_args to the storage cap. */
export function truncateToolArgs(
  args: Record<string, unknown>,
): Record<string, unknown> {
  const json = JSON.stringify(args);
  if (json.length <= MAX_TOOL_ARGS_CHARS) return args;
  return JSON.parse(json.slice(0, MAX_TOOL_ARGS_CHARS) + '"}');
}

/** Serialise a ConversationRecord to a JSON string for storage. */
export function serialiseConvRecord(record: ConversationRecord): string {
  const stored: StoredConversationRecord = {
    message_id: record.message_id,
    session_id: record.session_id,
    role: record.role,
    content: record.content,
    classification: record.classification,
    timestamp: record.timestamp,
    sequence: record.sequence,
    compacted: record.compacted,
    ...(record.lineage_id !== undefined
      ? { lineage_id: record.lineage_id }
      : {}),
    ...(record.tool_name !== undefined
      ? { tool_name: record.tool_name }
      : {}),
    ...(record.tool_args !== undefined
      ? { tool_args: record.tool_args }
      : {}),
    ...(record.expiresAt !== undefined
      ? { expiresAt: record.expiresAt }
      : {}),
    ...(record.token_count !== undefined
      ? { token_count: record.token_count }
      : {}),
  };
  return JSON.stringify(stored);
}

/** Deserialise a JSON string to a ConversationRecord. */
export function deserialiseConvRecord(json: string): ConversationRecord {
  const stored: StoredConversationRecord = JSON.parse(json);
  return {
    message_id: stored.message_id,
    session_id: stored.session_id,
    role: stored.role,
    content: stored.content,
    classification: stored.classification,
    timestamp: stored.timestamp,
    sequence: stored.sequence,
    compacted: stored.compacted,
    ...(stored.lineage_id !== undefined
      ? { lineage_id: stored.lineage_id }
      : {}),
    ...(stored.tool_name !== undefined
      ? { tool_name: stored.tool_name }
      : {}),
    ...(stored.tool_args !== undefined
      ? { tool_args: stored.tool_args }
      : {}),
    ...(stored.expiresAt !== undefined
      ? { expiresAt: stored.expiresAt }
      : {}),
    ...(stored.token_count !== undefined
      ? { token_count: stored.token_count }
      : {}),
  };
}

/** Estimate token count for a record's content (rough: 1 token per 4 chars). */
export function estimateRecordTokens(content: string): number {
  return Math.ceil(content.length / 4);
}
