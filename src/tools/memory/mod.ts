/**
 * Cross-session memory system — classification-gated persistent recall.
 *
 * @module
 */

export type {
  MemoryRecord,
  StoredMemoryRecord,
  MemoryError,
} from "./types.ts";

export type {
  MemorySearchProvider,
  MemorySearchResult,
  MemorySearchOptions,
} from "./search.ts";

export {
  createInMemorySearchProvider,
  createFts5SearchProvider,
  serialiseRecord,
  deserialiseRecord,
} from "./search.ts";

export type {
  MemoryStore,
  CreateMemoryStoreOptions,
  MemorySaveOptions,
  MemoryGetOptions,
  MemoryListOptions,
  MemoryDeleteOptions,
  MemoryPurgeOptions,
} from "./store.ts";

export { createMemoryStore } from "./store.ts";

export type { MemoryToolContext } from "./tools.ts";

export {
  getMemoryToolDefinitions,
  createMemoryToolExecutor,
  MEMORY_SYSTEM_PROMPT,
} from "./tools.ts";
