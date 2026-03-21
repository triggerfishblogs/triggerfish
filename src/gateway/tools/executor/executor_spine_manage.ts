/**
 * SPINE.md management executor.
 *
 * Handles view and append actions for the spine_manage tool.
 * SPINE.md is the agent's identity file — persona, mission, guidelines.
 *
 * @module
 */

import { createLogger } from "../../../core/logger/mod.ts";

const log = createLogger("spine-manage");

/** Context required by the spine_manage executor. */
export interface SpineManageContext {
  /** Absolute path to SPINE.md. */
  readonly spinePath: string;
}

/** Handle the view action. */
async function executeView(ctx: SpineManageContext): Promise<string> {
  try {
    const content = await Deno.readTextFile(ctx.spinePath);
    return JSON.stringify({ path: ctx.spinePath, content });
  } catch (err: unknown) {
    if (err instanceof Deno.errors.NotFound) {
      return JSON.stringify({
        path: ctx.spinePath,
        content: null,
        message: "SPINE.md does not exist yet. Use append to create it.",
      });
    }
    log.error("SPINE.md read failed", {
      operation: "spineManageView",
      err,
    });
    return `Error: Failed to read SPINE.md: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }
}

/** Handle the append action. */
async function executeAppend(
  ctx: SpineManageContext,
  content: string,
): Promise<string> {
  try {
    let existing = "";
    try {
      existing = await Deno.readTextFile(ctx.spinePath);
    } catch (err: unknown) {
      if (!(err instanceof Deno.errors.NotFound)) throw err;
    }

    const separator = existing.length > 0 && !existing.endsWith("\n\n")
      ? (existing.endsWith("\n") ? "\n" : "\n\n")
      : "";
    const updated = existing + separator + content + "\n";

    await Deno.writeTextFile(ctx.spinePath, updated);

    log.info("SPINE.md updated via spine_manage", {
      operation: "spineManageAppend",
      appendedLength: content.length,
    });

    return JSON.stringify({
      success: true,
      message: "SPINE.md updated.",
      total_length: updated.length,
    });
  } catch (err: unknown) {
    log.error("SPINE.md append failed", {
      operation: "spineManageAppend",
      err,
    });
    return `Error: Failed to update SPINE.md: ${
      err instanceof Error ? err.message : String(err)
    }`;
  }
}

/**
 * Create a SubsystemExecutor for spine_manage.
 *
 * Returns null for non-matching tool names so the dispatch chain
 * continues to the next executor.
 */
export function createSpineManageExecutor(
  ctx: SpineManageContext,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (name !== "spine_manage") return null;

    const action = input.action as string | undefined;
    if (!action) {
      return "Error: spine_manage requires an 'action' parameter (view, append).";
    }

    switch (action) {
      case "view":
        return await executeView(ctx);
      case "append": {
        const content = input.content as string | undefined;
        if (!content || content.trim().length === 0) {
          return "Error: spine_manage(append) requires a non-empty 'content' parameter.";
        }
        return await executeAppend(ctx, content);
      }
      default:
        return `Error: Unknown action "${action}". Valid actions: view, append.`;
    }
  };
}
