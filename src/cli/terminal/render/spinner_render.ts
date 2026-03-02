/**
 * Spinner animation rendering for the TTY status bar.
 *
 * Formats animated spinner frames with cycling thinking verbs
 * and optional labels for the terminal status line.
 *
 * @module
 */

import { CYAN, DIM, RESET, SPINNER_FRAMES, THINKING_VERBS } from "../screen.ts";

/** Format a spinner status text from the current frame and verb state. */
export function renderSpinnerStatusText(
  frame: number,
  verbIdx: number,
  label: string,
): string {
  const ch = SPINNER_FRAMES[frame % SPINNER_FRAMES.length];
  const verb = THINKING_VERBS[verbIdx];
  const labelSuffix = label ? `${verb}… ${DIM}(${label})${RESET}` : `${verb}…`;
  return `${CYAN}${ch}${RESET} ${labelSuffix}`;
}
