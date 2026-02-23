/**
 * Legacy Tide Pool tools (callback-based).
 *
 * Retained for backward compatibility. New code should use
 * the A2UI TidePoolTools from `tools_canvas.ts` instead.
 *
 * @module
 */

import type { TidepoolHost } from "../host/host.ts";

// ─── Barrel re-exports from tools_defs.ts ───────────────────────────────────

export {
  getTidepoolToolDefinitions,
  TIDEPOOL_SYSTEM_PROMPT,
} from "./tools_defs.ts";

// ---------------------------------------------------------------------------
// Legacy TidepoolTools
// ---------------------------------------------------------------------------

/** Legacy tools interface for agent interaction with the Tide Pool. */
export interface TidepoolTools {
  /** Push HTML content to the tide pool. */
  push(html: string): Promise<void>;
  /** Evaluate JavaScript in the tide pool sandbox. */
  eval(js: string): Promise<void>;
  /** Reset the tide pool, clearing all content. */
  reset(): Promise<void>;
  /** Take a snapshot of the current tide pool state. */
  snapshot(): Promise<string | undefined>;
}

/** Create legacy Tide Pool tools backed by a TidepoolHost. */
export function createTidepoolTools(host: TidepoolHost): TidepoolTools {
  return {
    // deno-lint-ignore require-await
    async push(html: string): Promise<void> {
      host.push(html);
    },
    // deno-lint-ignore require-await
    async eval(js: string): Promise<void> {
      host.eval(js);
    },
    // deno-lint-ignore require-await
    async reset(): Promise<void> {
      host.reset();
    },
    // deno-lint-ignore require-await
    async snapshot(): Promise<string | undefined> {
      return host.snapshot();
    },
  };
}
