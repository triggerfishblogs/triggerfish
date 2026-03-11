/**
 * Data lineage store — creates, persists, and traces lineage records
 * backed by a {@link StorageProvider}.
 *
 * All records are persisted under the `lineage:` key namespace. Session-based
 * lookups use a secondary index under `lineage-session:`.
 * Forward-trace uses a reverse index under `lineage-fwd:`.
 * Content-hash lookups use `lineage-hash:`.
 *
 * @module
 */

import type { StorageProvider } from "../storage/provider.ts";
import type { ClassificationLevel, Result } from "../types/classification.ts";
import { canFlowTo } from "../types/classification.ts";
import { createLogger } from "../logger/mod.ts";

const log = createLogger("lineage-store");
import type { SessionId } from "../types/session.ts";
import type {
  LineageCreateInput,
  LineageRecord,
  LineageRetentionConfig,
  LineageStore,
} from "./lineage_types.ts";
import {
  computeContentHash,
  deserialiseLineageRecord,
  lineageFwdIndexKey,
  lineageFwdPrefixKey,
  lineageHashIndexKey,
  lineageRecordKey,
  lineageSessionIndexKey,
  serialiseLineageRecord,
} from "./lineage_serde.ts";

/** Build a LineageRecord from creation input, computing content hash. */
async function buildLineageRecord(
  input: LineageCreateInput,
): Promise<LineageRecord> {
  const storeContent = input.classification.level === "PUBLIC";
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
    ...(storeContent ? { content: input.content } : {}),
  };
}

/** Persist a new lineage record and all its index entries. */
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
  // Hash index for getByHash() lookups
  await storage.set(
    lineageHashIndexKey(record.content_hash),
    record.lineage_id,
  );
  // Forward-trace reverse index entries
  if (record.inputLineageIds) {
    for (const parentId of record.inputLineageIds) {
      await storage.set(
        lineageFwdIndexKey(parentId, record.lineage_id),
        record.lineage_id,
      );
    }
  }
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

/** Find all records derived from a given record (forward trace — O(n) scan). */
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

/** Find all records derived from a given record using the reverse index — O(k). */
async function traceLineageForwardIndexed(
  storage: StorageProvider,
  id: string,
): Promise<LineageRecord[]> {
  const prefix = lineageFwdPrefixKey(id);
  const keys = await storage.list(prefix);
  const results: LineageRecord[] = [];
  for (const key of keys) {
    const childId = await storage.get(key);
    if (childId !== null) {
      const record = await fetchLineageRecord(storage, childId);
      if (record !== null) results.push(record);
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

/** Check whether a lineage record has exceeded the retention age. */
function isLineageRecordExpired(
  record: LineageRecord,
  referenceTime: Date,
  maxAgeMs: number,
): boolean {
  const accessedAt = new Date(record.origin.accessed_at).getTime();
  if (isNaN(accessedAt)) return false;
  return referenceTime.getTime() - accessedAt > maxAgeMs;
}

/** Delete a lineage record and all associated index entries. */
async function purgeLineageRecord(
  storage: StorageProvider,
  record: LineageRecord,
): Promise<void> {
  await storage.delete(lineageRecordKey(record.lineage_id));
  await storage.delete(
    lineageSessionIndexKey(record.sessionId, record.lineage_id),
  );
  await storage.delete(lineageHashIndexKey(record.content_hash));
  await purgeForwardIndexEntries(storage, record);
}

/** Delete forward-trace index entries where this record is a child. */
async function purgeForwardIndexEntries(
  storage: StorageProvider,
  record: LineageRecord,
): Promise<void> {
  if (!record.inputLineageIds) return;
  for (const parentId of record.inputLineageIds) {
    await storage.delete(lineageFwdIndexKey(parentId, record.lineage_id));
  }
}

/** Scan all lineage records and purge those exceeding the retention age. */
async function executeLineageRetention(
  storage: StorageProvider,
  config: LineageRetentionConfig,
  now: Date,
): Promise<Result<number, string>> {
  const maxAgeMs = config.maxAgeDays * 24 * 60 * 60 * 1000;
  try {
    const keys = await storage.list("lineage:");
    let deletedCount = 0;
    for (const key of keys) {
      deletedCount += await evaluateAndPurge(storage, key, now, maxAgeMs);
    }
    return { ok: true, value: deletedCount };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Lineage retention policy failed: ${message}` };
  }
}

/** Evaluate a single record key and purge if expired. Returns 1 if deleted, 0 otherwise. */
async function evaluateAndPurge(
  storage: StorageProvider,
  key: string,
  referenceTime: Date,
  maxAgeMs: number,
): Promise<number> {
  const json = await storage.get(key);
  if (json === null) return 0;
  try {
    const record = deserialiseLineageRecord(json);
    if (isLineageRecordExpired(record, referenceTime, maxAgeMs)) {
      await purgeLineageRecord(storage, record);
      return 1;
    }
    return 0;
  } catch (err: unknown) {
    log.warn("Lineage record evaluation failed during retention", { operation: "evaluateAndPurge", key, err });
    return 0;
  }
}

/** Look up content by SHA-256 hash with classification enforcement. */
async function lookupByHash(
  storage: StorageProvider,
  hash: string,
  taint: ClassificationLevel,
): Promise<{ content: string; record: LineageRecord } | null> {
  const lineageId = await storage.get(lineageHashIndexKey(hash));
  if (lineageId === null) return null;
  const record = await fetchLineageRecord(storage, lineageId);
  if (record === null) return null;
  if (!canFlowTo(record.classification.level, taint)) return null;
  if (record.content === undefined) return null;
  return { content: record.content, record };
}

/**
 * Create a new {@link LineageStore} backed by the given {@link StorageProvider}.
 *
 * All records are persisted under the `lineage:` key namespace. Session-based
 * lookups use a secondary index under `lineage-session:`.
 * Forward-trace uses a reverse index under `lineage-fwd:`.
 * Content-hash lookups use `lineage-hash:`.
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
    trace_forward_indexed: (id: string) =>
      traceLineageForwardIndexed(storage, id),
    trace_backward: (id: string) => traceLineageBackward(storage, id),
    getByHash: (hash: string, taint: ClassificationLevel) =>
      lookupByHash(storage, hash, taint),
    // deno-lint-ignore require-await
    async export(sessionId: SessionId): Promise<LineageRecord[]> {
      return fetchLineageRecordsBySession(storage, sessionId);
    },
    applyLineageRetention(
      config: LineageRetentionConfig,
      now?: Date,
    ): Promise<Result<number, string>> {
      return executeLineageRetention(storage, config, now ?? new Date());
    },
  };
}
