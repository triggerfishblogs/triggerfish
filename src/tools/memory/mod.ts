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
} from "./search/mod.ts";

export {
  createInMemorySearchProvider,
  createFts5SearchProvider,
  serialiseRecord,
  deserialiseRecord,
} from "./search/mod.ts";

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

export type { MemoryToolContext } from "./tools/mod.ts";

export {
  getMemoryToolDefinitions,
  MEMORY_SYSTEM_PROMPT,
} from "./tools/mod.ts";

export { createMemoryToolExecutor } from "./tools/mod.ts";
