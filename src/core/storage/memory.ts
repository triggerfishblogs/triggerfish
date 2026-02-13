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
    // deno-lint-ignore require-await
    async set(key: string, value: string): Promise<void> {
      data.set(key, value);
    },

    // deno-lint-ignore require-await
    async get(key: string): Promise<string | null> {
      return data.get(key) ?? null;
    },

    // deno-lint-ignore require-await
    async delete(key: string): Promise<void> {
      data.delete(key);
    },

    // deno-lint-ignore require-await
    async list(prefix?: string): Promise<string[]> {
      if (prefix === undefined) {
        return [...data.keys()];
      }
      return [...data.keys()].filter((k) => k.startsWith(prefix));
    },

    // deno-lint-ignore require-await
    async close(): Promise<void> {
      data.clear();
    },
  };
}
