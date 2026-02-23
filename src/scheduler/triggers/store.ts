/**
 * TriggerStore — persists the most recent trigger result per source.
 *
 * Stores one entry per trigger source keyed as `trigger:last:<source>`.
 * Each new result for a source overwrites the previous one, keeping
 * storage bounded. Results carry the classification level at which the
 * trigger executed.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { StorageProvider } from "../../core/storage/provider.ts";

/** A persisted trigger execution result. */
export interface TriggerResult {
  /** Unique identifier for this result (random UUID). */
  readonly id: string;
  /**
   * Trigger source identifier.
   * Examples: "trigger" (periodic), "cron:job-id", "webhook:src".
   */
  readonly source: string;
  /** The orchestrator response text. */
  readonly message: string;
  /** Classification level at which the trigger ran. */
  readonly classification: ClassificationLevel;
  /** When the trigger fired. */
  readonly firedAt: string; // ISO-8601 string for serialisation round-trips
}

/** Interface for storing and retrieving trigger results. */
export interface TriggerStore {
  /**
   * Save the latest result for a source.
   * Overwrites any previous result for the same source.
   */
  save(result: TriggerResult): Promise<void>;
  /**
   * Get the most recent result for a source.
   * Returns null if no result has been stored for that source.
   */
  getLast(source: string): Promise<TriggerResult | null>;
  /** List all stored results (one per source). */
  listAll(): Promise<TriggerResult[]>;
}

/** Storage key prefix for trigger results. */
const KEY_PREFIX = "trigger:last:";

/** Deserialize a raw JSON string into a TriggerResult, or null if corrupted. */
function deserializeTriggerResult(raw: string | null): TriggerResult | null {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as TriggerResult;
  } catch {
    return null;
  }
}

/** Collect all stored trigger results from the given keys. */
async function collectTriggerResults(
  storage: StorageProvider,
  keys: string[],
): Promise<TriggerResult[]> {
  const results: TriggerResult[] = [];
  for (const key of keys) {
    const result = deserializeTriggerResult(await storage.get(key));
    if (result !== null) results.push(result);
  }
  return results;
}

/**
 * Create a TriggerStore backed by the given StorageProvider.
 *
 * Results are serialised as JSON strings. One entry per source;
 * each call to `save` overwrites the previous entry for that source.
 *
 * @param storage - The underlying storage provider
 * @returns A TriggerStore instance
 */
export function createTriggerStore(storage: StorageProvider): TriggerStore {
  return {
    async save(result: TriggerResult): Promise<void> {
      await storage.set(
        `${KEY_PREFIX}${result.source}`,
        JSON.stringify(result),
      );
    },
    async getLast(source: string): Promise<TriggerResult | null> {
      return deserializeTriggerResult(
        await storage.get(`${KEY_PREFIX}${source}`),
      );
    },
    async listAll(): Promise<TriggerResult[]> {
      return collectTriggerResults(storage, await storage.list(KEY_PREFIX));
    },
  };
}
