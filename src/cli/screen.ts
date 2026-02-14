/**
 * Screen layout manager with ANSI scroll regions.
 *
 * Manages a terminal layout where output scrolls in the upper region
 * while the input prompt stays fixed at the bottom. Uses DECSTBM
 * escape sequences for scroll region control.
 *
 * Falls back to simple line-by-line output for non-TTY environments.
 *
 * @module
 */

import type { LineEditor } from "./terminal.ts";

// ─── ANSI escape sequences ─────────────────────────────────────

const ESC = "\x1b";
const CSI = `${ESC}[`;

/** Move cursor to an absolute row and column (1-based). */
function moveTo(row: number, col: number): string {
  return `${CSI}${row};${col}H`;
}

/** Clear from cursor to end of line. */
const CLEAR_LINE = `${CSI}K`;

/** Set scroll region from top to bottom row (1-based, inclusive). */
function setScrollRegion(top: number, bottom: number): string {
  return `${CSI}${top};${bottom}r`;
}

/** Reset scroll region to full screen. */
const RESET_SCROLL = `${CSI}r`;

/** Show cursor. */
const SHOW_CURSOR = `${CSI}?25h`;

/** Hide cursor. */
const HIDE_CURSOR = `${CSI}?25l`;

// ─── ANSI color codes ───────────────────────────────────────────

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";

// ─── Screen manager ─────────────────────────────────────────────

const enc = new TextEncoder();

/** Write raw text to stdout synchronously. */
function rawWrite(text: string): void {
  Deno.stdout.writeSync(enc.encode(text));
}

/** Screen manager interface for managing terminal layout. */
export interface ScreenManager {
  /** Initialize scroll region and draw initial layout. */
  init(): void;
  /** Write a line of text into the scroll region (auto-scrolls). */
  writeOutput(text: string): void;
  /** Redraw the input line at the bottom with current editor state. */
  redrawInput(editor: LineEditor): void;
  /** Show a status message in the status bar. */
  setStatus(text: string): void;
  /** Clear status bar. */
  clearStatus(): void;
  /** Start an animated spinner in the status bar. */
  startSpinner(text: string): void;
  /** Stop the animated spinner and clear the status bar. */
  stopSpinner(): void;
  /** Handle terminal resize. */
  handleResize(): void;
  /** Restore terminal to normal mode. */
  cleanup(): void;
  /** Whether running in TTY mode (vs dumb/piped). */
  readonly isTty: boolean;
}

// ─── Spinner frames and thinking messages ────────────────────

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const THINKING_VERBS: readonly string[] = [
  "Thinking",
  "Reasoning",
  "Considering",
  "Analyzing",
  "Pondering",
  "Evaluating",
  "Processing",
  "Synthesizing",
  "Reflecting",
  "Deliberating",
  "Formulating",
  "Examining",
  "Contemplating",
  "Computing",
  "Assembling",
];

/** Terminal dimensions. */
interface TermSize {
  columns: number;
  rows: number;
}

/** Get current terminal dimensions. */
function getTermSize(): TermSize {
  try {
    return Deno.consoleSize();
  } catch {
    return { columns: 80, rows: 24 };
  }
}

/**
 * Create a screen manager.
 *
 * If stdin is a TTY, uses ANSI scroll regions to keep the input
 * prompt fixed at the bottom. Otherwise, falls back to simple
 * line-by-line output.
 *
 * @returns A ScreenManager instance
 */
export function createScreenManager(): ScreenManager {
  const isTty = Deno.stdin.isTerminal();

  if (!isTty) {
    return createDumbScreenManager();
  }

  return createTtyScreenManager();
}

/** Create a TTY-aware screen manager with scroll regions. */
function createTtyScreenManager(): ScreenManager {
  let size = getTermSize();
  let statusText = "";
  let inputLineCount = 1;
  let spinnerTimer: ReturnType<typeof setInterval> | null = null;
  let spinnerFrame = 0;
  let spinnerLabel = "";
  let spinnerVerbIdx = 0;

  // Track the last known cursor position so we never rely on
  // the terminal's single-slot SAVE_CURSOR / RESTORE_CURSOR,
  // which breaks when scroll region scrolling invalidates it.
  let knownCursorRow = 1;
  let knownCursorCol = 1;

  function getStatusRow(): number {
    return size.rows;
  }

  function getScrollBottom(): number {
    return size.rows - inputLineCount - 1;
  }

  function setupScrollRegion(): void {
    const bottom = getScrollBottom();
    if (bottom >= 1) {
      rawWrite(setScrollRegion(1, bottom));
    }
  }

  function drawInputBar(editor: LineEditor): void {
    const lines = editor.text.split("\n");
    const newLineCount = Math.max(lines.length, 1);

    // If line count changed, adjust scroll region
    if (newLineCount !== inputLineCount) {
      inputLineCount = newLineCount;
      setupScrollRegion();
    }

    const firstInputRow = size.rows - inputLineCount;
    const prefix = `  ${CYAN}${BOLD}❯${RESET} `;
    const contPrefix = `  ${DIM}·${RESET} `;
    const prefixLen = 4; // "  ❯ " or "  · "

    rawWrite(HIDE_CURSOR);

    // Draw each input line
    for (let i = 0; i < lines.length; i++) {
      const row = firstInputRow + i;
      rawWrite(moveTo(row, 1));
      rawWrite(CLEAR_LINE);
      rawWrite(i === 0 ? prefix : contPrefix);
      rawWrite(lines[i]);
    }

    // Draw ghost suggestion on the last line (only for single-line input)
    if (lines.length === 1 && editor.suggestion.length > 0) {
      rawWrite(`${DIM}${editor.suggestion}${RESET}`);
    }

    // Calculate cursor position within multi-line text
    const textBeforeCursor = editor.text.slice(0, editor.cursor);
    const cursorLines = textBeforeCursor.split("\n");
    const cursorLineIdx = cursorLines.length - 1;
    const cursorColInLine = cursorLines[cursorLineIdx].length;

    const cursorRow = firstInputRow + cursorLineIdx;
    const cursorCol = prefixLen + cursorColInLine + 1;
    knownCursorRow = cursorRow;
    knownCursorCol = cursorCol;
    rawWrite(moveTo(cursorRow, cursorCol));
    rawWrite(SHOW_CURSOR);
  }

  function drawStatusBar(): void {
    const statusRow = getStatusRow();
    rawWrite(HIDE_CURSOR);
    rawWrite(moveTo(statusRow, 1));
    rawWrite(CLEAR_LINE);
    if (statusText.length > 0) {
      rawWrite(`  ${statusText}${RESET}`);
    }
    // Return cursor to its known position instead of using
    // SAVE/RESTORE which is a single slot and breaks during scrolling
    rawWrite(moveTo(knownCursorRow, knownCursorCol));
    rawWrite(SHOW_CURSOR);
  }

  return {
    isTty: true,

    init(): void {
      size = getTermSize();
      inputLineCount = 1;
      setupScrollRegion();

      // Clear the input and status rows
      const firstInputRow = size.rows - inputLineCount;
      rawWrite(moveTo(firstInputRow, 1));
      rawWrite(CLEAR_LINE);
      rawWrite(moveTo(getStatusRow(), 1));
      rawWrite(CLEAR_LINE);

      // Position cursor in scroll region
      rawWrite(moveTo(1, 1));
    },

    writeOutput(text: string): void {
      rawWrite(HIDE_CURSOR);

      // Move to the bottom of the scroll region — text will auto-scroll
      rawWrite(moveTo(getScrollBottom(), 1));
      rawWrite("\n"); // This scrolls the region if needed

      // Write each line
      for (const line of text.split("\n")) {
        rawWrite(`${line}${CLEAR_LINE}\n`);
      }

      // Return cursor to its known position instead of using
      // SAVE/RESTORE which gets corrupted when the scroll region scrolls
      rawWrite(moveTo(knownCursorRow, knownCursorCol));
      rawWrite(SHOW_CURSOR);
    },

    redrawInput(editor: LineEditor): void {
      drawInputBar(editor);
    },

    setStatus(text: string): void {
      statusText = `${DIM}${text}`;
      drawStatusBar();
    },

    clearStatus(): void {
      statusText = "";
      drawStatusBar();
    },

    startSpinner(text: string): void {
      // Stop any existing spinner
      if (spinnerTimer !== null) {
        clearInterval(spinnerTimer);
      }
      spinnerLabel = text;
      spinnerFrame = 0;
      spinnerVerbIdx = Math.floor(Math.random() * THINKING_VERBS.length);

      const render = () => {
        const ch = SPINNER_FRAMES[spinnerFrame % SPINNER_FRAMES.length];
        // Rotate the verb every ~2.5 seconds (30 frames at 80ms)
        if (spinnerFrame > 0 && spinnerFrame % 30 === 0) {
          spinnerVerbIdx = (spinnerVerbIdx + 1) % THINKING_VERBS.length;
        }
        const verb = THINKING_VERBS[spinnerVerbIdx];
        const label = spinnerLabel
          ? `${verb}… ${DIM}(${spinnerLabel})${RESET}`
          : `${verb}…`;
        statusText = `${CYAN}${ch}${RESET} ${label}`;
        drawStatusBar();
        spinnerFrame++;
      };

      render();
      spinnerTimer = setInterval(render, 80);
    },

    stopSpinner(): void {
      if (spinnerTimer !== null) {
        clearInterval(spinnerTimer);
        spinnerTimer = null;
      }
      statusText = "";
      drawStatusBar();
    },

    handleResize(): void {
      const oldRows = size.rows;
      size = getTermSize();
      // Clear old input/status rows that are now mispositioned
      const oldFirstInput = oldRows - inputLineCount;
      for (let r = oldFirstInput; r <= oldRows; r++) {
        if (r >= 1 && r <= size.rows) {
          rawWrite(moveTo(r, 1));
          rawWrite(CLEAR_LINE);
        }
      }
      setupScrollRegion();
      drawStatusBar();
    },

    cleanup(): void {
      if (spinnerTimer !== null) {
        clearInterval(spinnerTimer);
        spinnerTimer = null;
      }
      // Reset scroll region to full screen
      rawWrite(RESET_SCROLL);
      // Move cursor to bottom
      rawWrite(moveTo(size.rows, 1));
      rawWrite(SHOW_CURSOR);
      rawWrite("\n");
    },
  };
}

/** Create a dumb screen manager for non-TTY environments. */
function createDumbScreenManager(): ScreenManager {
  return {
    isTty: false,

    init(): void {
      // No-op for dumb mode
    },

    writeOutput(text: string): void {
      console.log(text);
    },

    redrawInput(_editor: LineEditor): void {
      // In dumb mode, just write the prompt character
      rawWrite("  ❯ ");
    },

    setStatus(_text: string): void {
      // No status bar in dumb mode
    },

    clearStatus(): void {
      // No-op
    },

    startSpinner(_text: string): void {
      // No-op — legacy handler uses its own spinner
    },

    stopSpinner(): void {
      // No-op
    },

    handleResize(): void {
      // No-op
    },

    cleanup(): void {
      // No-op
    },
  };
}
