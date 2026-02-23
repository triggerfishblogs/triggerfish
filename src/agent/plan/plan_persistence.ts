/**
 * Plan file persistence — writes plan markdown to disk.
 *
 * Non-fatal: logs a warning on failure instead of throwing.
 *
 * @module
 */

import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("plan");

/** Options for persisting a plan file. */
interface PersistPlanOptions {
  readonly plansDir: string;
  readonly planId: string;
  readonly markdown: string;
}

/** Persist a plan markdown file to disk (non-fatal on failure). */
export async function persistPlanFile(
  options: PersistPlanOptions,
): Promise<void> {
  try {
    await Deno.mkdir(options.plansDir, { recursive: true });
    const path = `${options.plansDir}/${options.planId}.md`;
    await Deno.writeTextFile(path, options.markdown);
  } catch (err: unknown) {
    log.warn("Plan persistence failed", {
      planId: options.planId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
