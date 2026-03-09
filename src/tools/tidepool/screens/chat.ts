/**
 * Chat screen mount/unmount lifecycle.
 *
 * The chat screen is the default screen. It uses the main session's
 * existing chat panel and canvas, which are already rendered in the
 * HTML from tmpl_chat.html and tmpl_canvas.html.
 *
 * @module
 */

import type { ScreenLifecycle } from "../shell/screens.ts";

/** Chat screen configuration. */
export interface ChatScreenConfig {
  /** Main session ID (defaults to "main"). */
  readonly sessionId?: string;
}

/**
 * Create lifecycle hooks for the chat screen.
 *
 * The chat screen is special: it doesn't need to create a TidepoolChat
 * instance because the main chat UI is already wired up via
 * tmpl_chat_script.html. The lifecycle hooks are no-ops on the server
 * side — the client-side shell script handles focus management.
 */
export function createChatScreenLifecycle(): ScreenLifecycle {
  return {
    onMount() {
      // Client-side: focus input (handled by shell script)
    },
    onUnmount() {
      // Nothing to clean up — main chat stays alive
    },
  };
}
