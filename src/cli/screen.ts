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

/** Save cursor position. */
const SAVE_CURSOR = `${ESC}7`;

/** Restore cursor position. */
const RESTORE_CURSOR = `${ESC}8`;

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
  /** Handle terminal resize. */
  handleResize(): void;
  /** Restore terminal to normal mode. */
  cleanup(): void;
  /** Whether running in TTY mode (vs dumb/piped). */
  readonly isTty: boolean;
}

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

  // Input row = last 2 rows (status + prompt)
  // Scroll region = rows 1 through (rows - 2)
  function getPromptRow(): number {
    return size.rows - 1;
  }

  function getStatusRow(): number {
    return size.rows;
  }

  function getScrollBottom(): number {
    return size.rows - 2;
  }

  function setupScrollRegion(): void {
    rawWrite(setScrollRegion(1, getScrollBottom()));
  }

  function drawInputBar(editor: LineEditor): void {
    const promptRow = getPromptRow();
    const prefix = `  ${CYAN}${BOLD}❯${RESET} `;
    const prefixLen = 4; // "  ❯ "

    // Hide cursor, move to prompt row, clear, draw
    rawWrite(HIDE_CURSOR);
    rawWrite(moveTo(promptRow, 1));
    rawWrite(CLEAR_LINE);
    rawWrite(prefix);

    // Draw text up to cursor
    rawWrite(editor.text);

    // Draw ghost suggestion in dim
    if (editor.suggestion.length > 0) {
      rawWrite(`${DIM}${editor.suggestion}${RESET}`);
    }

    // Position cursor at the correct column
    const cursorCol = prefixLen + editor.cursor + 1;
    rawWrite(moveTo(promptRow, cursorCol));
    rawWrite(SHOW_CURSOR);
  }

  function drawStatusBar(): void {
    const statusRow = getStatusRow();
    rawWrite(SAVE_CURSOR);
    rawWrite(moveTo(statusRow, 1));
    rawWrite(CLEAR_LINE);
    if (statusText.length > 0) {
      rawWrite(`  ${DIM}${statusText}${RESET}`);
    }
    rawWrite(RESTORE_CURSOR);
  }

  return {
    isTty: true,

    init(): void {
      size = getTermSize();
      setupScrollRegion();

      // Clear the input and status rows
      rawWrite(moveTo(getPromptRow(), 1));
      rawWrite(CLEAR_LINE);
      rawWrite(moveTo(getStatusRow(), 1));
      rawWrite(CLEAR_LINE);

      // Position cursor in scroll region
      rawWrite(moveTo(1, 1));
    },

    writeOutput(text: string): void {
      // Save cursor, move to bottom of scroll region, write output
      rawWrite(SAVE_CURSOR);

      // Move to the bottom of the scroll region — text will auto-scroll
      rawWrite(moveTo(getScrollBottom(), 1));
      rawWrite("\n"); // This scrolls the region if needed

      // Write each line
      for (const line of text.split("\n")) {
        rawWrite(`${line}${CLEAR_LINE}\n`);
      }

      rawWrite(RESTORE_CURSOR);
    },

    redrawInput(editor: LineEditor): void {
      drawInputBar(editor);
    },

    setStatus(text: string): void {
      statusText = text;
      drawStatusBar();
    },

    clearStatus(): void {
      statusText = "";
      drawStatusBar();
    },

    handleResize(): void {
      size = getTermSize();
      setupScrollRegion();
      drawStatusBar();
    },

    cleanup(): void {
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

    handleResize(): void {
      // No-op
    },

    cleanup(): void {
      // No-op
    },
  };
}
