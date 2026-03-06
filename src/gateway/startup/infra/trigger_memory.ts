/**
 * Deferred trigger memory check for the scheduler.
 *
 * Creates a callback that the scheduler can call to check for
 * agent-managed trigger instructions. The memory store is bound
 * after tool infrastructure is initialized.
 *
 * @module
 */

import type { MemoryStore } from "../../../tools/memory/store.ts";
import { TRIGGER_INSTRUCTIONS_MEMORY_KEY } from "../../../core/security/constants.ts";
import { createLogger } from "../../../core/logger/logger.ts";

const log = createLogger("trigger-memory");

/** A deferred memory check whose backing store is bound after creation. */
export interface DeferredMemoryCheck {
  /** Callback to pass into scheduler config at construction time. */
  readonly check: () => Promise<string | null>;
  /** Bind the memory store once tool infrastructure is ready. */
  readonly bind: (store: MemoryStore) => void;
}

/**
 * Create a deferred trigger memory check.
 *
 * Returns a `check` callback safe to pass into the scheduler config
 * before the memory store exists. Call `bind(memoryStore)` once the
 * store is available — before that, `check` returns null.
 */
export function createDeferredMemoryCheck(): DeferredMemoryCheck {
  let memoryStore: MemoryStore | null = null;

  const check = async (): Promise<string | null> => {
    if (!memoryStore) return null;
    try {
      const record = await memoryStore.get({
        key: TRIGGER_INSTRUCTIONS_MEMORY_KEY,
        agentId: "main-session",
        sessionTaint: "PUBLIC",
      });
      if (!record || !record.content || record.content.trim().length === 0) {
        return null;
      }
      return record.content;
    } catch (err) {
      log.warn("Trigger memory instructions check failed", {
        operation: "checkMemoryInstructions",
        err,
      });
      return null;
    }
  };

  const bind = (store: MemoryStore): void => {
    memoryStore = store;
  };

  return { check, bind };
}
