/**
 * In-memory search provider — array-backed substring match for testing.
 *
 * Provides `createInMemorySearchProvider` which stores records in a
 * plain array and matches queries via case-insensitive substring search
 * on content and tags. Results are classification-gated and shadowed.
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";
import { canFlowTo } from "../../../core/types/classification.ts";
import type { MemoryRecord } from "../types.ts";
import type {
  MemorySearchOptions,
  MemorySearchProvider,
  MemorySearchResult,
} from "./search_types.ts";
import { applyShadowing } from "./search_serialise.ts";

/** Find the index of a record matching (agentId, classification, key), or -1. */
function findRecordIndex(
  records: readonly MemoryRecord[],
  agentId: string,
  classification: ClassificationLevel,
  key: string,
): number {
  return records.findIndex(
    (r) =>
      r.agentId === agentId &&
      r.classification === classification &&
      r.key === key,
  );
}

/** Filter records visible to the given session taint that match the query. */
function filterVisibleRecords(
  records: readonly MemoryRecord[],
  agentId: string,
  queryLower: string,
  sessionTaint: ClassificationLevel,
): MemoryRecord[] {
  return records.filter(
    (r) =>
      r.agentId === agentId &&
      !r.expired &&
      canFlowTo(r.classification, sessionTaint) &&
      (r.content.toLowerCase().includes(queryLower) ||
        r.tags.some((t) => t.toLowerCase().includes(queryLower))),
  );
}

/** Score and rank shadowed records by substring position. */
function scoreMemoryRecords(
  shadowed: readonly MemoryRecord[],
  queryLower: string,
  maxResults: number,
): readonly MemorySearchResult[] {
  const scored: MemorySearchResult[] = shadowed.map((record) => {
    const pos = record.content.toLowerCase().indexOf(queryLower);
    return { record, rank: pos === -1 ? 1000 : pos };
  });
  scored.sort((a, b) => a.rank - b.rank);
  return scored.slice(0, maxResults);
}

/** Upsert a record into the in-memory store by (agentId, classification, key). */
function upsertMemoryRecord(
  records: MemoryRecord[],
  record: MemoryRecord,
): void {
  const idx = findRecordIndex(
    records,
    record.agentId,
    record.classification,
    record.key,
  );
  if (idx !== -1) records.splice(idx, 1);
  records.push(record);
}

/** Remove a record from the in-memory store by (agentId, classification, key). */
function removeMemoryRecord(
  records: MemoryRecord[],
  agentId: string,
  classification: ClassificationLevel,
  key: string,
): void {
  const idx = findRecordIndex(records, agentId, classification, key);
  if (idx !== -1) records.splice(idx, 1);
}

/** Search the in-memory store with substring matching, shadowing, and scoring. */
function searchMemoryRecords(
  records: readonly MemoryRecord[],
  options: MemorySearchOptions,
): readonly MemorySearchResult[] {
  const { agentId, query, sessionTaint, maxResults = 20 } = options;
  const queryLower = query.toLowerCase();
  const visible = filterVisibleRecords(
    records,
    agentId,
    queryLower,
    sessionTaint,
  );
  return scoreMemoryRecords(applyShadowing(visible), queryLower, maxResults);
}

/** Build the MemorySearchProvider method object backed by the given records array. */
function buildInMemoryProviderMethods(
  records: MemoryRecord[],
): MemorySearchProvider {
  return {
    index(record: MemoryRecord): Promise<void> {
      upsertMemoryRecord(records, record);
      return Promise.resolve();
    },
    remove(agentId: string, cl: ClassificationLevel, key: string): Promise<void> {
      removeMemoryRecord(records, agentId, cl, key);
      return Promise.resolve();
    },
    search(options: MemorySearchOptions): Promise<readonly MemorySearchResult[]> {
      return Promise.resolve(searchMemoryRecords(records, options));
    },
    close(): Promise<void> {
      records.length = 0;
      return Promise.resolve();
    },
  };
}

/**
 * Create an in-memory search provider for testing.
 *
 * Uses simple substring matching on content and tags.
 */
export function createInMemorySearchProvider(): MemorySearchProvider {
  return buildInMemoryProviderMethods([]);
}
