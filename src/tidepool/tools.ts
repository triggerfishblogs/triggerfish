/**
 * Tide Pool tools exposed to the agent as tool calls.
 *
 * Provides tidepool.push(html), tidepool.eval(js), tidepool.reset(),
 * and tidepool.snapshot() capabilities.
 * @module
 */

import type { TidepoolHost } from "./host.ts";

/** Tools interface for agent interaction with the Tide Pool. */
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

/** Create Tide Pool tools backed by a TidepoolHost. */
export function createTidepoolTools(host: TidepoolHost): TidepoolTools {
  return {
    async push(html: string): Promise<void> {
      host.push(html);
    },
    async eval(js: string): Promise<void> {
      host.eval(js);
    },
    async reset(): Promise<void> {
      host.reset();
    },
    async snapshot(): Promise<string | undefined> {
      return host.snapshot();
    },
  };
}
