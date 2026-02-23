/**
 * Legacy callback-based Tide Pool host.
 *
 * Retained for backward compatibility. New code should use the A2UI
 * WebSocket host from `./host.ts` instead.
 *
 * @module
 */

// ---------------------------------------------------------------------------
// Legacy callback-based TidepoolHost (retained for backward compatibility)
// ---------------------------------------------------------------------------

/** Options for creating a TidepoolHost. */
export interface TidepoolHostOptions {
  /** Called when HTML content is pushed to the tide pool. */
  readonly onPush: (html: string) => void;
  /** Called when the tide pool is reset. */
  readonly onReset?: () => void;
  /** Called when JS is evaluated in the tide pool. */
  readonly onEval?: (js: string) => void;
  /** Called when a snapshot is requested. */
  readonly onSnapshot?: () => string | undefined;
}

/** Tide Pool host instance managing content and state. */
export interface TidepoolHost {
  /** Push HTML content to the tide pool. */
  push(html: string): void;
  /** Evaluate JavaScript in the tide pool sandbox. */
  eval(js: string): void;
  /** Reset the tide pool, clearing all content. */
  reset(): void;
  /** Take a snapshot of the current tide pool state. */
  snapshot(): string | undefined;
}

/** Create a new Tide Pool host. */
export function createTidepoolHost(options: TidepoolHostOptions): TidepoolHost {
  return {
    push(html: string): void {
      options.onPush(html);
    },
    eval(js: string): void {
      if (options.onEval) {
        options.onEval(js);
      }
    },
    reset(): void {
      if (options.onReset) {
        options.onReset();
      }
    },
    snapshot(): string | undefined {
      if (options.onSnapshot) {
        return options.onSnapshot();
      }
      return undefined;
    },
  };
}
