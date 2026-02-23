/**
 * Shared mutable state and helpers for screen-based event handlers.
 *
 * Contains the ScreenHandlerState interface and low-level helpers
 * for spinner lifecycle, streaming header, and indented chunk writing.
 * @module
 */

import type { ScreenManager } from "../terminal/screen.ts";
import { BOLD, GREEN, RESET } from "./ansi.ts";
import type { Spinner } from "./spinner.ts";
import { createThinkingFilter } from "./think_filter.ts";

// ─── State ───────────────────────────────────────────────────────────────────

/** Mutable state shared across screen event handler callbacks. */
export interface ScreenHandlerState {
  spinner: Spinner | null;
  pendingToolCall: { name: string; args: Record<string, unknown> } | null;
  isStreaming: boolean;
  headerWritten: boolean;
  atLineStart: boolean;
  thinkingHeaderWritten: boolean;
  readonly thinkFilter: ReturnType<typeof createThinkingFilter>;
}

/** Build fresh ScreenHandlerState with default values. */
export function buildScreenHandlerState(): ScreenHandlerState {
  return {
    spinner: null,
    pendingToolCall: null,
    isStreaming: false,
    headerWritten: false,
    atLineStart: true,
    thinkingHeaderWritten: false,
    thinkFilter: createThinkingFilter(),
  };
}

// ─── Spinner helpers ─────────────────────────────────────────────────────────

/** Stop spinner via screen manager (TTY) or fallback state spinner. */
export function stopSpinnerFallback(
  state: ScreenHandlerState,
  screen: ScreenManager,
): void {
  if (screen.isTty) {
    screen.stopSpinner();
  } else if (state.spinner) {
    state.spinner.stop();
    state.spinner = null;
  }
}

// ─── Streaming helpers ───────────────────────────────────────────────────────

/** Ensure streaming mode is active and spinner is stopped. */
export function ensureStreamingActive(
  state: ScreenHandlerState,
  screen: ScreenManager,
): void {
  if (state.isStreaming) return;
  state.isStreaming = true;
  stopSpinnerFallback(state, screen);
}

/** Write the triggerfish response header if not yet written. */
export function writeStreamingHeader(
  state: ScreenHandlerState,
  screen: ScreenManager,
): void {
  if (state.headerWritten) return;
  screen.writeOutput(`  ${GREEN}${BOLD}triggerfish${RESET}`);
  screen.writeOutput("");
  state.headerWritten = true;
}

/** Write text with 2-space indent at line starts. Returns updated atLineStart. */
export function writeIndentedChunk(
  screen: ScreenManager,
  text: string,
  atLineStart: boolean,
): boolean {
  let output = "";
  let lineStart = atLineStart;
  for (const ch of text) {
    if (lineStart) {
      output += "  ";
      lineStart = false;
    }
    output += ch;
    if (ch === "\n") lineStart = true;
  }
  screen.writeChunk(output);
  return lineStart;
}

/** Reset all streaming-related state fields. */
export function resetScreenStreamingState(state: ScreenHandlerState): void {
  state.isStreaming = false;
  state.headerWritten = false;
  state.atLineStart = true;
  state.thinkingHeaderWritten = false;
  state.thinkFilter.reset();
}
