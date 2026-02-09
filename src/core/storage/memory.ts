/**
 * In-memory StorageProvider implementation.
 *
 * Backed by a plain `Map<string, string>`. Suitable for tests and
 * short-lived processes where persistence across restarts is not required.
 *
 * @module
 */

import type { StorageProvider } from "./provider.ts";

/** Create an in-memory StorageProvider. */
export function createMemoryStorage(): StorageProvider {
  const data = new Map<string, string>();

  return {
    async set(key: string, value: string): Promise<void> {
      data.set(key, value);
    },

    async get(key: string): Promise<string | null> {
      return data.get(key) ?? null;
    },

    async delete(key: string): Promise<void> {
      data.delete(key);
    },

    async list(prefix?: string): Promise<string[]> {
      if (prefix === undefined) {
        return [...data.keys()];
      }
      return [...data.keys()].filter((k) => k.startsWith(prefix));
    },

    async close(): Promise<void> {
      data.clear();
    },
  };
}
