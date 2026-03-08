/**
 * Data lineage store — creates, persists, and traces lineage records
 * backed by a {@link StorageProvider}.
 *
 * All records are persisted under the `lineage:` key namespace. Session-based
 * lookups use a secondary index under `lineage-session:`. Forward trace uses
 * a reverse index under `lineage-fwd:`. Content-addressed lookups use
 * `lineage-hash:`.
 *
 * @module
 */

import type { StorageProvider } from "../storage/provider.ts";
import type { ClassificationLevel, Result } from "../types/classification.ts";
import { canFlowTo } from "../types/classification.ts";
import type { SessionId } from "../types/session.ts";
import type {
  LineageCreateInput,
  LineageHashResult,
  LineageRecord,
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
  const contentHash = await computeContentHash(input.content);
  const storeContent = input.classification.level === "PUBLIC";
  return {
    lineage_id: crypto.randomUUID(),
    content_hash: contentHash,
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

/** Persist a new lineage record, session index, forward index, and hash index. */
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
  // Forward trace reverse index
  if (record.inputLineageIds !== undefined) {
    for (const parentId of record.inputLineageIds) {
      await storage.set(
        lineageFwdIndexKey(parentId, record.lineage_id),
        record.lineage_id,
      );
    }
  }
  // Hash-to-lineage index
  await storage.set(
    lineageHashIndexKey(record.content_hash),
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

/** Forward trace using reverse index — O(k) where k = direct children. */
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

/** Look up content by hash with classification gate. */
async function lookupByHash(
  storage: StorageProvider,
  hash: string,
  taint: ClassificationLevel,
): Promise<LineageHashResult | null> {
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
 * Records are stored under `lineage:`. Session index under `lineage-session:`.
 * Forward trace index under `lineage-fwd:`. Hash index under `lineage-hash:`.
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
    async applyLineageRetention(
      config: { readonly maxAgeDays: number },
      now?: Date,
    ): Promise<Result<number, string>> {
      const referenceTime = now ?? new Date();
      const maxAgeMs = config.maxAgeDays * 24 * 60 * 60 * 1000;
      try {
        const keys = await storage.list("lineage:");
        // Only process primary record keys, not index keys
        const recordKeys = keys.filter((k) =>
          k.startsWith("lineage:") &&
          !k.startsWith("lineage-session:") &&
          !k.startsWith("lineage-fwd:") &&
          !k.startsWith("lineage-hash:")
        );
        let deletedCount = 0;
        for (const key of recordKeys) {
          const json = await storage.get(key);
          if (json === null) continue;
          const record = deserialiseLineageRecord(json);
          const accessedAt = new Date(record.origin.accessed_at).getTime();
          const ageMs = referenceTime.getTime() - accessedAt;
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
          error: `Lineage retention failed: ${message}`,
        };
      }
    },
  };
}
