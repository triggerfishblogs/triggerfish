/**
 * Memory search types — shared interfaces for search backends.
 *
 * Defines the `MemorySearchProvider` interface and supporting types
 * used by both FTS5 and in-memory implementations.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { MemoryRecord } from "./types.ts";

/** A search result with relevance rank. */
export interface MemorySearchResult {
  readonly record: MemoryRecord;
  readonly rank: number;
}

/** Options for searching memory. */
export interface MemorySearchOptions {
  readonly agentId: string;
  readonly query: string;
  readonly sessionTaint: ClassificationLevel;
  readonly maxResults?: number;
}

/** Interface for memory search backends. */
export interface MemorySearchProvider {
  /** Index a record for search. Upserts by (agentId, classification, key). */
  index(record: MemoryRecord): Promise<void>;

  /** Remove a record from the search index. */
  remove(
    agentId: string,
    classification: ClassificationLevel,
    key: string,
  ): Promise<void>;

  /** Search for records matching a query, filtered by classification. */
  search(options: MemorySearchOptions): Promise<readonly MemorySearchResult[]>;

  /** Release resources. */
  close(): Promise<void>;
}
