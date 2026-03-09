/**
 * Memory RPC handler for Tidepool.
 *
 * Forwards memory operations to the MemoryStore with
 * session taint enforcement. The actual MemoryStore already
 * enforces canFlowTo on reads and forces taint on writes.
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";
import { OWNER_MEMORY_AGENT_ID } from "../../../core/types/session.ts";
import type { MemorySearchFilter } from "../screens/memory.ts";

/** Memory RPC handler interface. */
export interface TidepoolMemoryHandler {
  /** Search memories with taint-gated filtering. */
  readonly search: (
    filter: MemorySearchFilter,
    sessionTaint: string,
  ) => Promise<Record<string, unknown>>;
  /** Get a single memory by ID. */
  readonly get: (
    id: string,
    sessionTaint: string,
  ) => Promise<Record<string, unknown> | null>;
  /** Delete a memory with taint-gated access. */
  readonly delete: (id: string, sessionTaint: string) => Promise<boolean>;
  /** List all tags visible at the given taint level. */
  readonly tags: (sessionTaint: string) => Promise<readonly string[]>;
}

/** Minimal store interface — avoids importing from tools/memory (Layer 1 sibling). */
interface MinimalMemoryStore {
  readonly list: (options: {
    readonly agentId: string;
    readonly sessionTaint: ClassificationLevel;
    readonly tag?: string;
  }) => Promise<readonly MemoryRecordShape[]>;
  readonly get: (options: {
    readonly agentId: string;
    readonly sessionTaint: ClassificationLevel;
    readonly key: string;
  }) => Promise<MemoryRecordShape | null>;
  readonly delete: (options: {
    readonly agentId: string;
    readonly sessionTaint: ClassificationLevel;
    readonly key: string;
    readonly sourceSessionId: string;
  }) => Promise<{ readonly ok: boolean }>;
}

/** Minimal search provider interface. */
interface MinimalSearchProvider {
  readonly search: (options: {
    readonly agentId: string;
    readonly query: string;
    readonly sessionTaint: ClassificationLevel;
    readonly maxResults?: number;
  }) => Promise<readonly { readonly record: MemoryRecordShape; readonly rank: number }[]>;
}

/** Shape of a MemoryRecord without importing the concrete type. */
interface MemoryRecordShape {
  readonly key: string;
  readonly agentId: string;
  readonly classification: string;
  readonly content: string;
  readonly tags: readonly string[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly sourceSessionId?: string;
}

/** Convert a memory record to a client-friendly entry object. */
function recordToEntry(r: MemoryRecordShape): Record<string, unknown> {
  return {
    id: r.key,
    classification: r.classification,
    content: r.content,
    tags: r.tags,
    createdAt: r.createdAt?.toISOString?.() ?? "",
    updatedAt: r.updatedAt?.toISOString?.() ?? "",
    sessionId: r.sourceSessionId,
  };
}

/** Extract unique tags from a list of memory records. */
function extractUniqueTags(
  records: readonly MemoryRecordShape[],
): readonly string[] {
  const tagSet = new Set<string>();
  for (const r of records) {
    for (const t of r.tags) tagSet.add(t);
  }
  return [...tagSet].sort();
}

/**
 * Create a memory handler that delegates to an external MemoryStore
 * and optional MemorySearchProvider.
 *
 * Both parameters are typed as `unknown` to avoid importing from
 * tools/memory (which is a Layer 1 sibling). The gateway wiring layer
 * will provide the concrete store and search provider.
 */
export function createTidepoolMemoryHandler(
  store: unknown,
  searchProvider: unknown,
): TidepoolMemoryHandler {
  const memStore = store as MinimalMemoryStore;
  const memSearch = searchProvider as MinimalSearchProvider | undefined;

  return {
    search(
      filter: MemorySearchFilter,
      sessionTaint: string,
    ): Promise<Record<string, unknown>> {
      const taint = sessionTaint as ClassificationLevel;
      return searchMemories(memStore, memSearch, filter, taint);
    },

    get(
      id: string,
      sessionTaint: string,
    ): Promise<Record<string, unknown> | null> {
      const taint = sessionTaint as ClassificationLevel;
      return fetchSingleMemory(memStore, id, taint);
    },

    delete(id: string, sessionTaint: string): Promise<boolean> {
      const taint = sessionTaint as ClassificationLevel;
      return deleteMemoryRecord(memStore, id, taint);
    },

    tags(sessionTaint: string): Promise<readonly string[]> {
      const taint = sessionTaint as ClassificationLevel;
      return listMemoryTags(memStore, taint);
    },
  };
}

/** Search memories via FTS5 search provider or fall back to store.list. */
async function searchMemories(
  memStore: MinimalMemoryStore,
  memSearch: MinimalSearchProvider | undefined,
  filter: MemorySearchFilter,
  sessionTaint: ClassificationLevel,
): Promise<Record<string, unknown>> {
  const query = filter.query ?? "";
  if (query.length > 0 && memSearch) {
    const results = await memSearch.search({
      agentId: OWNER_MEMORY_AGENT_ID,
      query,
      sessionTaint,
    });
    return {
      entries: results.map((r) => recordToEntry(r.record)),
      total: results.length,
    };
  }
  const records = await memStore.list({
    agentId: OWNER_MEMORY_AGENT_ID,
    sessionTaint,
    tag: filter.tags?.[0],
  });
  return {
    entries: records.map(recordToEntry),
    total: records.length,
  };
}

/** Fetch a single memory record by key. */
async function fetchSingleMemory(
  memStore: MinimalMemoryStore,
  id: string,
  sessionTaint: ClassificationLevel,
): Promise<Record<string, unknown> | null> {
  const record = await memStore.get({
    agentId: OWNER_MEMORY_AGENT_ID,
    sessionTaint,
    key: id,
  });
  if (!record) return null;
  return recordToEntry(record);
}

/** Delete a memory record gated by session taint. */
async function deleteMemoryRecord(
  memStore: MinimalMemoryStore,
  id: string,
  sessionTaint: ClassificationLevel,
): Promise<boolean> {
  const result = await memStore.delete({
    agentId: OWNER_MEMORY_AGENT_ID,
    sessionTaint,
    key: id,
    sourceSessionId: "tidepool-ui",
  });
  return result.ok;
}

/** List unique tags from records visible at the given taint level. */
async function listMemoryTags(
  memStore: MinimalMemoryStore,
  sessionTaint: ClassificationLevel,
): Promise<readonly string[]> {
  const records = await memStore.list({
    agentId: OWNER_MEMORY_AGENT_ID,
    sessionTaint,
  });
  return extractUniqueTags(records);
}
