/**
 * Trigger management tool executor.
 *
 * Handles view, status, and update actions for the trigger_manage tool.
 * Instructions are stored in memory at PUBLIC classification to prevent
 * write-down from classified sessions into the trigger context.
 *
 * Uses MemoryStore directly (not tool executor) to avoid circular
 * dependency with the tool executor construction.
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";
import type { TriggerStore } from "../../../scheduler/triggers/store.ts";
import type { MemoryStore } from "../../../tools/memory/store.ts";
import { canFlowTo } from "../../../core/types/classification.ts";
import { createLogger } from "../../../core/logger/mod.ts";
import type { SessionId } from "../../../core/types/session.ts";

const log = createLogger("trigger-manage");

/** Memory key for agent-managed trigger instructions. */
export const TRIGGER_INSTRUCTIONS_MEMORY_KEY = "trigger:instructions";

/** Context required by the trigger_manage executor. */
export interface TriggerManageContext {
  /** Path to the TRIGGER.md file (for view fallback). */
  readonly triggerMdPath: string;
  /** Trigger config from scheduler. */
  readonly triggerConfig: {
    readonly enabled: boolean;
    readonly intervalMinutes: number;
    readonly classificationCeiling: ClassificationLevel;
  };
  /** Trigger store for last-run results. */
  readonly triggerStore?: TriggerStore;
  /** Memory store for reading/writing trigger instructions. */
  readonly memoryStore: MemoryStore;
  /** Agent ID for memory operations. */
  readonly agentId: string;
  /** Current session taint getter. */
  readonly getSessionTaint: () => ClassificationLevel;
  /** Current session ID getter (for memory save). */
  readonly getSessionId: () => SessionId;
}

/** Load instructions from memory store. */
async function loadMemoryInstructions(
  store: MemoryStore,
  agentId: string,
): Promise<string | null> {
  try {
    const record = await store.get({
      key: TRIGGER_INSTRUCTIONS_MEMORY_KEY,
      agentId,
      sessionTaint: "PUBLIC",
    });
    if (!record || !record.content || record.content.trim().length === 0) {
      return null;
    }
    return record.content;
  } catch {
    return null;
  }
}

/** Load instructions from the TRIGGER.md file. */
async function loadFileInstructions(path: string): Promise<string | null> {
  try {
    return await Deno.readTextFile(path);
  } catch {
    return null;
  }
}

/** Handle the view action. */
async function executeView(ctx: TriggerManageContext): Promise<string> {
  const memoryInstructions = await loadMemoryInstructions(
    ctx.memoryStore,
    ctx.agentId,
  );
  if (memoryInstructions) {
    return JSON.stringify({ source: "memory", instructions: memoryInstructions });
  }
  const fileInstructions = await loadFileInstructions(ctx.triggerMdPath);
  if (fileInstructions) {
    return JSON.stringify({ source: "file", instructions: fileInstructions });
  }
  return JSON.stringify({
    source: "none",
    instructions: null,
    message:
      "No trigger instructions found. Use trigger_manage(action: 'update') to set them.",
  });
}

/** Handle the status action. */
async function executeStatus(ctx: TriggerManageContext): Promise<string> {
  const lastResult = ctx.triggerStore
    ? await ctx.triggerStore.getLast("trigger")
    : null;
  const hasMemoryOverride =
    (await loadMemoryInstructions(ctx.memoryStore, ctx.agentId)) !== null;
  const hasFileInstructions =
    (await loadFileInstructions(ctx.triggerMdPath)) !== null;

  return JSON.stringify({
    enabled: ctx.triggerConfig.enabled,
    intervalMinutes: ctx.triggerConfig.intervalMinutes,
    classificationCeiling: ctx.triggerConfig.classificationCeiling,
    instructionSource: hasMemoryOverride
      ? "memory"
      : hasFileInstructions
      ? "file"
      : "none",
    lastRun: lastResult
      ? {
          firedAt: lastResult.firedAt,
          classification: lastResult.classification,
          messagePreview: lastResult.message.length > 200
            ? lastResult.message.slice(0, 200) + "..."
            : lastResult.message,
        }
      : null,
  });
}

/** Handle the update action. */
async function executeUpdate(
  ctx: TriggerManageContext,
  instructions: string,
): Promise<string> {
  const sessionTaint = ctx.getSessionTaint();
  if (!canFlowTo(sessionTaint, "PUBLIC")) {
    log.warn("Trigger instruction update blocked by write-down", {
      operation: "triggerManageUpdate",
      sessionTaint,
    });
    return `Error: Write-down blocked — your session taint is ${sessionTaint}, ` +
      `but trigger instructions are PUBLIC (triggers start at PUBLIC taint). ` +
      `Use /clear to reset your session before updating trigger instructions.`;
  }

  try {
    await ctx.memoryStore.save({
      key: TRIGGER_INSTRUCTIONS_MEMORY_KEY,
      agentId: ctx.agentId,
      sessionTaint: "PUBLIC",
      content: instructions,
      tags: ["trigger", "instructions"],
      sourceSessionId: ctx.getSessionId(),
    });
    log.info("Trigger instructions updated via trigger_manage", {
      operation: "triggerManageUpdate",
      contentLength: instructions.length,
    });
    return JSON.stringify({
      success: true,
      message:
        "Trigger instructions updated. Changes take effect on the next trigger run.",
      contentLength: instructions.length,
    });
  } catch (err) {
    log.error("Trigger instruction update failed", {
      operation: "triggerManageUpdate",
      err,
    });
    return `Error: Failed to save trigger instructions: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }
}

/**
 * Create a SubsystemExecutor for trigger_manage.
 *
 * Returns null for non-matching tool names so the dispatch chain
 * continues to the next executor.
 */
export function createTriggerManageExecutor(
  ctx: TriggerManageContext,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (name !== "trigger_manage") return null;

    const action = input.action as string | undefined;
    if (!action) {
      return "Error: trigger_manage requires an 'action' parameter (view, status, update).";
    }

    switch (action) {
      case "view":
        return await executeView(ctx);
      case "status":
        return await executeStatus(ctx);
      case "update": {
        const instructions = input.instructions as string | undefined;
        if (!instructions || instructions.trim().length === 0) {
          return "Error: trigger_manage(update) requires a non-empty 'instructions' parameter.";
        }
        return await executeUpdate(ctx, instructions);
      }
      default:
        return `Error: Unknown action "${action}". Use view, status, or update.`;
    }
  };
}
