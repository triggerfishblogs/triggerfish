/**
 * Memory search — FTS5 full-text search and in-memory fallback.
 *
 * Re-exports from split modules:
 * - `search_types.ts` — shared interfaces (MemorySearchProvider, etc.)
 * - `search_serialise.ts` — record marshalling and classification shadowing
 * - `search_memory.ts` — in-memory substring match provider (tests)
 * - `search_fts5.ts` — SQLite FTS5 virtual table provider (production)
 *
 * @module
 */

export type {
  MemorySearchOptions,
  MemorySearchProvider,
  MemorySearchResult,
} from "./search_types.ts";

export {
  applyShadowing,
  deserialiseRecord,
  serialiseRecord,
} from "./search_serialise.ts";

export { createInMemorySearchProvider } from "./search_memory.ts";

export { createFts5SearchProvider } from "./search_fts5.ts";
