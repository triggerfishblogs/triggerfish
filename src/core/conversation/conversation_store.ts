/**
 * Conversation store — creates, persists, and queries conversation records
 * backed by a {@link StorageProvider}.
 *
 * Records are persisted under the `conv:` key namespace. Session sequence
 * counters live under `conv-session:`.
 *
 * @module
 */

import type { StorageProvider } from "../storage/provider.ts";
import type {
  ConversationAppendInput,
  ConversationRecord,
  LoadActiveOptions,
  MessageRetentionConfig,
  MessageStore,
} from "./conversation_types.ts";
import type { Result } from "../types/classification.ts";
import {
  convRecordKey,
  convSessionIndexKey,
  convSessionPrefix,
  deserialiseConvRecord,
  estimateRecordTokens,
  serialiseConvRecord,
  truncateToolArgs,
} from "./conversation_serde.ts";

/** Default resume window in days. */
const DEFAULT_RESUME_WINDOW_DAYS = 7;

/** Read and increment the sequence counter for a session. */
async function nextSequence(
  storage: StorageProvider,
  sessionId: string,
): Promise<number> {
  const indexKey = convSessionIndexKey(sessionId);
  const raw = await storage.get(indexKey);
  const lastSequence = raw !== null
    ? (JSON.parse(raw) as { lastSequence: number }).lastSequence
    : -1;
  const next = lastSequence + 1;
  await storage.set(indexKey, JSON.stringify({ lastSequence: next }));
  return next;
}

/** Build a ConversationRecord from input, assigning IDs and sequence. */
function buildConversationRecord(
  input: ConversationAppendInput,
  sequence: number,
): ConversationRecord {
  return {
    message_id: crypto.randomUUID(),
    session_id: input.session_id,
    role: input.role,
    content: input.content,
    classification: input.classification,
    timestamp: new Date().toISOString(),
    sequence,
    compacted: false,
    ...(input.lineage_id !== undefined
      ? { lineage_id: input.lineage_id }
      : {}),
    ...(input.tool_name !== undefined
      ? { tool_name: input.tool_name }
      : {}),
    ...(input.tool_args !== undefined
      ? { tool_args: truncateToolArgs(input.tool_args) }
      : {}),
    ...(input.token_count !== undefined
      ? { token_count: input.token_count }
      : { token_count: estimateRecordTokens(input.content) }),
  };
}

/** Persist a conversation record to storage. */
async function persistRecord(
  storage: StorageProvider,
  record: ConversationRecord,
): Promise<void> {
  const key = convRecordKey(record.session_id, record.sequence);
  await storage.set(key, serialiseConvRecord(record));
}

/** Load all records for a session from storage. */
async function fetchAllSessionRecords(
  storage: StorageProvider,
  sessionId: string,
): Promise<ConversationRecord[]> {
  const prefix = convSessionPrefix(sessionId);
  const keys = await storage.list(prefix);
  const records: ConversationRecord[] = [];
  for (const key of keys) {
    const json = await storage.get(key);
    if (json !== null) {
      records.push(deserialiseConvRecord(json));
    }
  }
  return records;
}

/** Check if a record is within the resume window. */
function isWithinResumeWindow(
  record: ConversationRecord,
  resumeWindowDays: number,
  now: Date,
): boolean {
  const recordTime = new Date(record.timestamp).getTime();
  const cutoff = now.getTime() - resumeWindowDays * 24 * 60 * 60 * 1000;
  return recordTime >= cutoff;
}

/** Check if a record has expired. */
function isExpired(record: ConversationRecord, now: Date): boolean {
  if (record.expiresAt === undefined) return false;
  return new Date(record.expiresAt).getTime() <= now.getTime();
}

/**
 * Create a new {@link MessageStore} backed by the given {@link StorageProvider}.
 *
 * Records are stored under the `conv:{session_id}:{sequence_padded}` key
 * namespace. Sequence counters under `conv-session:{session_id}`.
 */
export function createMessageStore(storage: StorageProvider): MessageStore {
  return {
    async append(
      input: ConversationAppendInput,
    ): Promise<ConversationRecord> {
      const sequence = await nextSequence(storage, input.session_id);
      const record = buildConversationRecord(input, sequence);
      await persistRecord(storage, record);
      return record;
    },

    async loadSession(sessionId: string): Promise<ConversationRecord[]> {
      return fetchAllSessionRecords(storage, sessionId);
    },

    async loadActive(
      sessionId: string,
      options?: LoadActiveOptions,
    ): Promise<ConversationRecord[]> {
      const resumeWindowDays = options?.resumeWindowDays ??
        DEFAULT_RESUME_WINDOW_DAYS;
      const excludeCompacted = options?.excludeCompacted ?? true;
      const now = new Date();
      const all = await fetchAllSessionRecords(storage, sessionId);
      return all.filter((record) => {
        if (excludeCompacted && record.compacted) return false;
        if (isExpired(record, now)) return false;
        if (!isWithinResumeWindow(record, resumeWindowDays, now)) return false;
        return true;
      });
    },

    async markCompacted(
      sessionId: string,
      fromSequence: number,
      toSequence: number,
    ): Promise<void> {
      for (let seq = fromSequence; seq <= toSequence; seq++) {
        const key = convRecordKey(sessionId, seq);
        const json = await storage.get(key);
        if (json === null) continue;
        const record = deserialiseConvRecord(json);
        const updated: ConversationRecord = { ...record, compacted: true };
        await storage.set(key, serialiseConvRecord(updated));
      }
    },

    async export(sessionId: string): Promise<ConversationRecord[]> {
      return fetchAllSessionRecords(storage, sessionId);
    },

    async applyRetention(
      config: MessageRetentionConfig,
      now?: Date,
    ): Promise<Result<number, string>> {
      const referenceTime = now ?? new Date();
      const maxAgeMs = config.maxAgeDays * 24 * 60 * 60 * 1000;

      try {
        const keys = await storage.list("conv:");
        // Exclude conv-session: index keys
        const recordKeys = keys.filter((k) => !k.startsWith("conv-session:"));
        let deletedCount = 0;

        for (const key of recordKeys) {
          const json = await storage.get(key);
          if (json === null) continue;
          const record = deserialiseConvRecord(json);
          const ageMs = referenceTime.getTime() -
            new Date(record.timestamp).getTime();
          if (ageMs > maxAgeMs) {
            await storage.delete(key);
            deletedCount++;
          }
        }

        return { ok: true, value: deletedCount };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          ok: false,
          error: `Message retention failed: ${message}`,
        };
      }
    },
  };
}
