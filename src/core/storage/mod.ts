/**
 * Storage module — unified persistence abstraction.
 *
 * @module
 */

export type { StorageProvider } from "./provider.ts";
export { createMemoryStorage } from "./memory.ts";
export { createSqliteStorage } from "./sqlite.ts";
