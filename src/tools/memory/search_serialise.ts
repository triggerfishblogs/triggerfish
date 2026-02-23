/**
 * Memory search serialisation — record marshalling and classification shadowing.
 *
 * Converts between rich `MemoryRecord` (with Date objects) and
 * `StoredMemoryRecord` (with ISO strings) for storage. Also provides
 * the shadowing logic shared by all search backends.
 *
 * @module
 */

import { CLASSIFICATION_ORDER } from "../../core/types/classification.ts";
import type { MemoryRecord, StoredMemoryRecord } from "./types.ts";
import type { SessionId } from "../../core/types/session.ts";

/** Deserialise a StoredMemoryRecord JSON string back to a MemoryRecord. */
export function deserialiseRecord(json: string): MemoryRecord {
  const stored: StoredMemoryRecord = JSON.parse(json);
  return {
    key: stored.key,
    agentId: stored.agentId,
    classification: stored.classification,
    content: stored.content,
    tags: stored.tags,
    createdAt: new Date(stored.createdAt),
    updatedAt: new Date(stored.updatedAt),
    ...(stored.expiresAt !== undefined
      ? { expiresAt: new Date(stored.expiresAt) }
      : {}),
    expired: stored.expired,
    sourceSessionId: stored.sourceSessionId as SessionId,
    ...(stored.lineageId !== undefined ? { lineageId: stored.lineageId } : {}),
  };
}

/** Serialise a MemoryRecord to a JSON string for storage. */
export function serialiseRecord(record: MemoryRecord): string {
  const stored: StoredMemoryRecord = {
    key: record.key,
    agentId: record.agentId,
    classification: record.classification,
    content: record.content,
    tags: [...record.tags],
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    ...(record.expiresAt !== undefined
      ? { expiresAt: record.expiresAt.toISOString() }
      : {}),
    expired: record.expired,
    sourceSessionId: record.sourceSessionId as string,
    ...(record.lineageId !== undefined ? { lineageId: record.lineageId } : {}),
  };
  return JSON.stringify(stored);
}

/**
 * Apply shadowing: for records sharing the same key, keep only
 * the one at the highest visible classification level.
 */
export function applyShadowing(records: MemoryRecord[]): MemoryRecord[] {
  const byKey = new Map<string, MemoryRecord>();
  for (const record of records) {
    const existing = byKey.get(record.key);
    if (
      !existing ||
      CLASSIFICATION_ORDER[record.classification] >
        CLASSIFICATION_ORDER[existing.classification]
    ) {
      byKey.set(record.key, record);
    }
  }
  return [...byKey.values()];
}
