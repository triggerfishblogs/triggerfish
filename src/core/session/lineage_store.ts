/**
 * Data lineage store — creates, persists, and traces lineage records
 * backed by a {@link StorageProvider}.
 *
 * All records are persisted under the `lineage:` key namespace. Session-based
 * lookups use a secondary index under `lineage-session:`.
 *
 * @module
 */

import type { StorageProvider } from "../storage/provider.ts";
import type { SessionId } from "../types/session.ts";
import type {
  LineageCreateInput,
  LineageRecord,
  LineageStore,
} from "./lineage_types.ts";
import {
  computeContentHash,
  deserialiseLineageRecord,
  lineageRecordKey,
  lineageSessionIndexKey,
  serialiseLineageRecord,
} from "./lineage_serde.ts";

/** Build a LineageRecord from creation input, computing content hash. */
async function buildLineageRecord(
  input: LineageCreateInput,
): Promise<LineageRecord> {
  return {
    lineage_id: crypto.randomUUID(),
    content_hash: await computeContentHash(input.content),
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
  await storage.set(
    lineageRecordKey(record.lineage_id),
    serialiseLineageRecord(record),
  );
  await storage.set(
    lineageSessionIndexKey(record.sessionId, record.lineage_id),
    record.lineage_id,
  );
}

/** Fetch a single lineage record by ID from storage. */
async function fetchLineageRecord(
  storage: StorageProvider,
  id: string,
): Promise<LineageRecord | null> {
  const json = await storage.get(lineageRecordKey(id));
  if (json === null) return null;
  return deserialiseLineageRecord(json);
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

/** Find all records derived from a given record (forward trace). */
async function traceLineageForward(
  storage: StorageProvider,
  id: string,
): Promise<LineageRecord[]> {
  const allKeys = await storage.list("lineage:");
  const results: LineageRecord[] = [];
  for (const key of allKeys) {
    const json = await storage.get(key);
    if (json === null) continue;
    const record = deserialiseLineageRecord(json);
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
