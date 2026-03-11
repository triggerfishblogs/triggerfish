/**
 * Data lineage serialisation — conversion between runtime LineageRecord
 * and the JSON shape persisted via StorageProvider.
 *
 * Also provides storage key helpers and the SHA-256 content hashing
 * function used when creating new lineage records.
 *
 * @module
 */

import type { SessionId } from "../types/session.ts";
import type {
  LineageRecord,
  LineageTransformation,
  StoredLineageRecord,
  StoredTransformation,
} from "./lineage_types.ts";

/**
 * Compute a SHA-256 hex digest of the given content string.
 */
export async function computeContentHash(content: string): Promise<string> {
  const data = new TextEncoder().encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Serialise a single transformation to its stored shape. */
function serialiseTransformation(
  t: LineageTransformation,
): StoredTransformation {
  return {
    type: t.type,
    description: t.description,
    timestamp: t.timestamp.toISOString(),
    ...(t.agent_id !== undefined ? { agent_id: t.agent_id } : {}),
    ...(t.input_lineage_ids !== undefined
      ? { input_lineage_ids: t.input_lineage_ids }
      : {}),
  };
}

/** Convert a LineageRecord to its serialisable JSON string. */
export function serialiseLineageRecord(record: LineageRecord): string {
  const stored: StoredLineageRecord = {
    lineage_id: record.lineage_id,
    content_hash: record.content_hash,
    origin: record.origin,
    classification: record.classification,
    sessionId: record.sessionId as string,
    ...(record.inputLineageIds !== undefined
      ? { inputLineageIds: record.inputLineageIds }
      : {}),
    ...(record.transformations !== undefined
      ? { transformations: record.transformations.map(serialiseTransformation) }
      : {}),
    ...(record.current_location !== undefined
      ? { current_location: record.current_location }
      : {}),
    ...(record.content !== undefined ? { content: record.content } : {}),
  };
  return JSON.stringify(stored);
}

/** Deserialise a single stored transformation back to its runtime shape. */
function deserialiseTransformation(
  t: StoredTransformation,
): LineageTransformation {
  return {
    type: t.type,
    description: t.description,
    timestamp: new Date(t.timestamp),
    ...(t.agent_id !== undefined ? { agent_id: t.agent_id } : {}),
    ...(t.input_lineage_ids !== undefined
      ? { input_lineage_ids: t.input_lineage_ids }
      : {}),
  };
}

/** Deserialise a stored JSON string back to a LineageRecord. */
export function deserialiseLineageRecord(json: string): LineageRecord {
  const stored: StoredLineageRecord = JSON.parse(json);
  return {
    lineage_id: stored.lineage_id,
    content_hash: stored.content_hash,
    origin: stored.origin,
    classification: stored.classification,
    sessionId: stored.sessionId as SessionId,
    ...(stored.inputLineageIds !== undefined
      ? { inputLineageIds: stored.inputLineageIds }
      : {}),
    ...(stored.transformations !== undefined
      ? {
        transformations: stored.transformations.map(deserialiseTransformation),
      }
      : {}),
    ...(stored.current_location !== undefined
      ? { current_location: stored.current_location }
      : {}),
    ...(stored.content !== undefined ? { content: stored.content } : {}),
  };
}

/** Storage key for a lineage record. */
export function lineageRecordKey(id: string): string {
  return `lineage:${id}`;
}

/** Storage key for a session-to-lineage index entry. */
export function lineageSessionIndexKey(
  sessionId: SessionId,
  lineageId: string,
): string {
  return `lineage-session:${sessionId as string}:${lineageId}`;
}

/** Storage key for a forward-trace reverse index entry. */
export function lineageFwdIndexKey(parentId: string, childId: string): string {
  return `lineage-fwd:${parentId}:${childId}`;
}

/** Storage key prefix for listing all children of a parent record. */
export function lineageFwdPrefixKey(parentId: string): string {
  return `lineage-fwd:${parentId}:`;
}

/** Storage key for the content-hash-to-lineage-id index. */
export function lineageHashIndexKey(hash: string): string {
  return `lineage-hash:${hash}`;
}
