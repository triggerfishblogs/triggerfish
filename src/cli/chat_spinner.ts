/**
 * Animated terminal spinner for the chat UI.
 * @module
 */

import { RESET, DIM, CYAN, write, SPINNER_FRAMES } from "./chat_ansi.ts";

/** An animated terminal spinner. */
export interface Spinner {
  /** Update the spinner label text. */
  update(label: string): void;
  /** Stop and clear the spinner line. */
  stop(): void;
}

/** Create an animated spinner that displays a label. */
export function createSpinner(label: string): Spinner {
  let currentLabel = label;
  let frame = 0;

  const render = () => {
    const ch = SPINNER_FRAMES[frame % SPINNER_FRAMES.length];
    write(`\r\x1b[K ${CYAN}${ch}${RESET} ${DIM}${currentLabel}${RESET}`);
    frame++;
  };

  render();
  const id = setInterval(render, 80);

  return {
    update(newLabel: string) {
      currentLabel = newLabel;
    },
    stop() {
      clearInterval(id);
      write("\r\x1b[K");
    },
  };
}
