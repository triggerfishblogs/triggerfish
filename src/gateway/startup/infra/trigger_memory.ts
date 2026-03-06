/**
 * Wire trigger memory check into the scheduler config.
 *
 * Provides a lightweight memory lookup callback so the scheduler can
 * check for agent-managed trigger instructions without creating an
 * orchestrator session.
 *
 * @module
 */

import type { SchedulerServiceConfig } from "../../../scheduler/service_types.ts";
import type { MemoryStore } from "../../../tools/memory/store.ts";
import { TRIGGER_INSTRUCTIONS_MEMORY_KEY } from "../../../core/security/constants.ts";
import { createLogger } from "../../../core/logger/logger.ts";

const log = createLogger("trigger-memory");

/**
 * Inject a `checkMemoryInstructions` callback into the scheduler config.
 *
 * Must be called after the memory store is initialized but before the
 * scheduler starts processing triggers. Mutates `config` in place.
 */
export function wireTriggerMemoryCheck(
  config: SchedulerServiceConfig,
  memoryStore: MemoryStore,
): void {
  const mutableConfig = config as { checkMemoryInstructions?: () => Promise<string | null> };
  mutableConfig.checkMemoryInstructions = async () => {
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
      log.debug("Trigger memory instructions check failed", {
        operation: "checkMemoryInstructions",
        err,
      });
      return null;
    }
  };
}
