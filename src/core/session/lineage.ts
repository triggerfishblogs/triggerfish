/**
 * Data lineage tracking — provenance metadata for all data flowing through
 * the system.
 *
 * Every data element carries origin, classification, transformations, and
 * current location. The lineage graph supports forward trace (what happened
 * to this data?) and backward trace (what sources contributed?).
 *
 * Persisted via {@link StorageProvider} under the `lineage:` namespace.
 *
 * @module
 */

import type { StorageProvider } from "../storage/provider.ts";
import type { ClassificationLevel } from "../types/classification.ts";
import type { SessionId } from "../types/session.ts";

/** Origin metadata describing where data came from. */
export interface LineageOrigin {
  readonly source_type: string;
  readonly source_name: string;
  readonly accessed_at: string;
  readonly accessed_by: string;
  readonly access_method: string;
}

/** Classification metadata attached to a lineage record. */
export interface LineageClassification {
  readonly level: ClassificationLevel;
  readonly reason: string;
}

/** A transformation applied to data. */
export interface LineageTransformation {
  readonly type: string;
  readonly description: string;
  readonly timestamp: Date;
  readonly agent_id?: string;
  readonly input_lineage_ids?: readonly string[];
}

/** Current location of data in the system. */
export interface LineageLocation {
  readonly session_id: string;
  readonly context_position: string;
}

/** Immutable record tracking provenance of a piece of data. */
export interface LineageRecord {
  readonly lineage_id: string;
  readonly content_hash: string;
  readonly origin: LineageOrigin;
  readonly classification: LineageClassification;
  readonly sessionId: SessionId;
  readonly inputLineageIds?: readonly string[];
  readonly transformations?: readonly LineageTransformation[];
  readonly current_location?: LineageLocation;
}

/** Input for creating a new lineage record. */
export interface LineageCreateInput {
  readonly content: string;
  readonly origin: LineageOrigin;
  readonly classification: LineageClassification;
  readonly sessionId: SessionId;
  readonly inputLineageIds?: readonly string[];
  readonly transformations?: readonly LineageTransformation[];
  readonly current_location?: LineageLocation;
}

/** Store for creating, querying, and tracing data lineage records. */
export interface LineageStore {
  /** Create a new lineage record. Computes content_hash and generates lineage_id. */
  create(input: LineageCreateInput): Promise<LineageRecord>;

  /** Retrieve a record by its lineage_id. Returns null if not found. */
  get(id: string): Promise<LineageRecord | null>;

  /** Get all lineage records associated with a session. */
  getBySession(sessionId: SessionId): Promise<LineageRecord[]>;

  /** Forward trace: find all records that were derived from this record. */
  trace_forward(id: string): Promise<LineageRecord[]>;

  /** Backward trace: find all source records that contributed to this record. */
  trace_backward(id: string): Promise<LineageRecord[]>;

  /** Export the full lineage chain for a session (compliance). */
  export(sessionId: SessionId): Promise<LineageRecord[]>;
}

/** Stored shape for a single transformation (timestamp as ISO string). */
interface StoredTransformation {
  readonly type: string;
  readonly description: string;
  readonly timestamp: string;
  readonly agent_id?: string;
  readonly input_lineage_ids?: readonly string[];
}

/** Serialisable shape stored in the StorageProvider. */
interface StoredLineageRecord {
  readonly lineage_id: string;
  readonly content_hash: string;
  readonly origin: LineageOrigin;
  readonly classification: LineageClassification;
  readonly sessionId: string;
  readonly inputLineageIds?: readonly string[];
  readonly transformations?: readonly StoredTransformation[];
  readonly current_location?: LineageLocation;
}

/**
 * Compute a SHA-256 hex digest of the given content string.
 */
async function sha256(content: string): Promise<string> {
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

/** Convert a LineageRecord to its serialisable form. */
function serialise(record: LineageRecord): string {
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
function deserialise(json: string): LineageRecord {
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
  };
}

/** Storage key for a lineage record. */
function recordKey(id: string): string {
  return `lineage:${id}`;
}

/** Storage key for a session-to-lineage index entry. */
function sessionIndexKey(sessionId: SessionId, lineageId: string): string {
  return `lineage-session:${sessionId as string}:${lineageId}`;
}

/** Build a LineageRecord from creation input, computing content hash. */
async function buildLineageRecord(
  input: LineageCreateInput,
): Promise<LineageRecord> {
  return {
    lineage_id: crypto.randomUUID(),
    content_hash: await sha256(input.content),
    origin: input.origin,
    classification: input.classification,
    sessionId: input.sessionId,
    ...(input.inputLineageIds !== undefined
      ? { inputLineageIds: input.inputLineageIds }
      : {}),
    ...(input.transformations !== undefined
      ? { transformations: input.transformations }
      : {}),
    ...(input.current_location !== undefined
      ? { current_location: input.current_location }
      : {}),
  };
}

/** Persist a new lineage record and its session index entry. */
async function persistLineageRecord(
  storage: StorageProvider,
  record: LineageRecord,
): Promise<void> {
  await storage.set(recordKey(record.lineage_id), serialise(record));
  await storage.set(
    sessionIndexKey(record.sessionId, record.lineage_id),
    record.lineage_id,
  );
}

/** Fetch a single lineage record by ID from storage. */
async function fetchLineageRecord(
  storage: StorageProvider,
  id: string,
): Promise<LineageRecord | null> {
  const json = await storage.get(recordKey(id));
  if (json === null) return null;
  return deserialise(json);
}

/** Fetch all lineage records for a session via the secondary index. */
async function fetchLineageRecordsBySession(
  storage: StorageProvider,
  sessionId: SessionId,
): Promise<LineageRecord[]> {
  const prefix = `lineage-session:${sessionId as string}:`;
  const keys = await storage.list(prefix);
  const records: LineageRecord[] = [];
  for (const key of keys) {
    const lineageId = await storage.get(key);
    if (lineageId !== null) {
      const record = await fetchLineageRecord(storage, lineageId);
      if (record !== null) records.push(record);
    }
  }
  return records;
}

/** Find all records that were derived from a given record (forward trace). */
async function traceLineageForward(
  storage: StorageProvider,
  id: string,
): Promise<LineageRecord[]> {
  const allKeys = await storage.list("lineage:");
  const results: LineageRecord[] = [];
  for (const key of allKeys) {
    const json = await storage.get(key);
    if (json === null) continue;
    const record = deserialise(json);
    if (record.inputLineageIds?.includes(id)) {
      results.push(record);
    }
  }
  return results;
}

/** Find all source records that contributed to a given record (backward trace). */
async function traceLineageBackward(
  storage: StorageProvider,
  id: string,
): Promise<LineageRecord[]> {
  const record = await fetchLineageRecord(storage, id);
  if (record === null || record.inputLineageIds === undefined) return [];
  const results: LineageRecord[] = [];
  for (const inputId of record.inputLineageIds) {
    const source = await fetchLineageRecord(storage, inputId);
    if (source !== null) results.push(source);
  }
  return results;
}

/**
 * Create a new {@link LineageStore} backed by the given {@link StorageProvider}.
 *
 * All records are persisted under the `lineage:` key namespace. Session-based
 * lookups use a secondary index under `lineage-session:`.
 */
export function createLineageStore(
  storage: StorageProvider,
): LineageStore {
  return {
    async create(input: LineageCreateInput): Promise<LineageRecord> {
      const record = await buildLineageRecord(input);
      await persistLineageRecord(storage, record);
      return record;
    },
    get: (id: string) => fetchLineageRecord(storage, id),
    getBySession: (sessionId: SessionId) =>
      fetchLineageRecordsBySession(storage, sessionId),
    trace_forward: (id: string) => traceLineageForward(storage, id),
    trace_backward: (id: string) => traceLineageBackward(storage, id),
    // deno-lint-ignore require-await
    async export(sessionId: SessionId): Promise<LineageRecord[]> {
      return fetchLineageRecordsBySession(storage, sessionId);
    },
  };
}
