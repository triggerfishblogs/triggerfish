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
import type { ClassificationLevel } from "../core/types/classification.ts";

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
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const ORANGE = "\x1b[38;5;208m";

/** ANSI color code for a classification level. */
export function taintColor(level: ClassificationLevel): string {
  switch (level) {
    case "PUBLIC":
      return GREEN;
    case "INTERNAL":
      return YELLOW;
    case "CONFIDENTIAL":
      return ORANGE;
    case "RESTRICTED":
      return RED;
  }
}

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
  /**
   * Write streaming text at the current scroll position without forced newline.
   * Handles embedded newlines by scrolling as needed.
   */
  writeChunk(text: string): void;
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
  /** Set the current session taint level (updates separator colors). */
  setTaint(level: ClassificationLevel): void;
  /** Get the current session taint level. */
  getTaint(): ClassificationLevel;
  /** Handle terminal resize. */
  handleResize(): void;
  /**
   * Start polling for terminal resize changes.
   * Used as a fallback on platforms without SIGWINCH (e.g. Windows).
   * The callback is invoked whenever a size change is detected.
   */
  startResizePolling(onResize: () => void): void;
  /** Stop resize polling (called during cleanup). */
  stopResizePolling(): void;
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
  let currentTaint: ClassificationLevel = "PUBLIC";
  let spinnerTimer: ReturnType<typeof setInterval> | null = null;
  let spinnerFrame = 0;
  let spinnerLabel = "";
  let spinnerVerbIdx = 0;
  let resizePollTimer: ReturnType<typeof setInterval> | null = null;

  // Track the last known cursor position so we never rely on
  // the terminal's single-slot SAVE_CURSOR / RESTORE_CURSOR,
  // which breaks when scroll region scrolling invalidates it.
  let knownCursorRow = 1;
  let knownCursorCol = 1;

  // Track cursor position during active streaming (writeChunk).
  // streamCursorRow=0 means "not actively streaming".
  let streamCursorRow = 0;
  let streamCursorCol = 1;

  function getStatusRow(): number {
    return size.rows;
  }

  function getScrollBottom(): number {
    // Reserve: top separator + input lines + bottom separator + status bar
    return size.rows - inputLineCount - 3;
  }

  function setupScrollRegion(): void {
    const bottom = getScrollBottom();
    if (bottom >= 1) {
      rawWrite(setScrollRegion(1, bottom));
    }
  }

  /** Calculate how many visual (wrapped) rows a logical line occupies. */
  function visualRowCount(lineText: string, prefixLen: number): number {
    const usable = size.columns - prefixLen;
    if (usable <= 0) return 1;
    if (lineText.length === 0) return 1;
    return Math.ceil((prefixLen + lineText.length) / size.columns) || 1;
  }

  function drawInputBar(editor: LineEditor): void {
    const lines = editor.text.split("\n");
    const prefixLen = 3; // " ❯ " or " · "

    // Count total visual rows including wrapping
    let totalVisualRows = 0;
    const visualRowsPerLine: number[] = [];
    for (const line of lines) {
      const vr = visualRowCount(line, prefixLen);
      visualRowsPerLine.push(vr);
      totalVisualRows += vr;
    }
    const newLineCount = Math.max(totalVisualRows, 1);

    // If line count changed, adjust scroll region
    if (newLineCount !== inputLineCount) {
      const oldLineCount = inputLineCount;
      inputLineCount = newLineCount;
      setupScrollRegion();

      // When the input bar shrinks, clear the old rows that are being
      // released back into the scroll region so stale separator lines
      // don't persist in the scrollback.
      if (newLineCount < oldLineCount) {
        const oldTopSepRow = size.rows - 1 - oldLineCount - 1;
        const newTopSepRow = size.rows - 1 - newLineCount - 1;
        for (let r = oldTopSepRow; r < newTopSepRow; r++) {
          rawWrite(moveTo(r, 1));
          rawWrite(CLEAR_LINE);
        }
      }
    }

    const color = taintColor(currentTaint);
    // Layout: topSep(1) + input(inputLineCount) + bottomSep(1) + status(1)
    const bottomSepRow = size.rows - 1;
    const firstInputRow = bottomSepRow - inputLineCount;
    const topSepRow = firstInputRow - 1;

    const prefix = ` ${CYAN}${BOLD}❯${RESET} `;
    const contPrefix = ` ${DIM}·${RESET} `;

    rawWrite(HIDE_CURSOR);

    // ── Top separator (taint-colored, edge-to-edge) ──
    rawWrite(moveTo(topSepRow, 1));
    rawWrite(CLEAR_LINE);
    rawWrite(`${color}${"─".repeat(size.columns)}${RESET}`);

    // ── Input lines ──
    let row = firstInputRow;
    for (let i = 0; i < lines.length; i++) {
      for (let vr = 0; vr < visualRowsPerLine[i]; vr++) {
        rawWrite(moveTo(row + vr, 1));
        rawWrite(CLEAR_LINE);
      }
      rawWrite(moveTo(row, 1));
      rawWrite(i === 0 ? prefix : contPrefix);
      rawWrite(lines[i]);
      row += visualRowsPerLine[i];
    }

    // Draw ghost suggestion on the last line (only for single-line input)
    if (lines.length === 1 && editor.suggestion.length > 0) {
      rawWrite(`${DIM}${editor.suggestion}${RESET}`);
    }

    // ── Bottom separator with taint label inline (edge-to-edge) ──
    const label = currentTaint;
    // "── LABEL ──────..." — 3 chars before label, 1 after, rest is fill
    const fillLen = Math.max(size.columns - 3 - label.length - 1, 1);
    rawWrite(moveTo(bottomSepRow, 1));
    rawWrite(CLEAR_LINE);
    rawWrite(
      `${color}${"─".repeat(2)} ${BOLD}${label}${RESET}${color} ${"─".repeat(fillLen)}${RESET}`,
    );

    // Calculate cursor position accounting for line wrapping
    const textBeforeCursor = editor.text.slice(0, editor.cursor);
    const cursorLines = textBeforeCursor.split("\n");
    const cursorLineIdx = cursorLines.length - 1;
    const cursorColInLine = cursorLines[cursorLineIdx].length;

    // Sum visual rows of all logical lines before the cursor's line
    let cursorVisualRow = firstInputRow;
    for (let i = 0; i < cursorLineIdx; i++) {
      cursorVisualRow += visualRowsPerLine[i];
    }

    // Add wrapped rows within the cursor's logical line
    const absoluteCol = prefixLen + cursorColInLine;
    const wrappedRowsBeforeCursor = Math.floor(absoluteCol / size.columns);
    cursorVisualRow += wrappedRowsBeforeCursor;
    const cursorCol = (absoluteCol % size.columns) + 1;

    knownCursorRow = cursorVisualRow;
    knownCursorCol = cursorCol;
    rawWrite(moveTo(cursorVisualRow, cursorCol));
    rawWrite(SHOW_CURSOR);
  }

  function drawStatusBar(): void {
    const statusRow = getStatusRow();
    rawWrite(HIDE_CURSOR);
    rawWrite(moveTo(statusRow, 1));
    rawWrite(CLEAR_LINE);
    if (statusText.length > 0) {
      rawWrite(` ${statusText}${RESET}`);
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

      // Clear the top separator, input, bottom separator, and status rows
      const bottomSepRow = size.rows - 1;
      const firstInputRow = bottomSepRow - inputLineCount;
      const topSepRow = firstInputRow - 1;
      for (let r = topSepRow; r <= size.rows; r++) {
        rawWrite(moveTo(r, 1));
        rawWrite(CLEAR_LINE);
      }

      // Position cursor in scroll region
      rawWrite(moveTo(1, 1));
    },

    writeOutput(text: string): void {
      // Reset stream cursor — switching back to non-streaming output
      streamCursorRow = 0;
      streamCursorCol = 1;

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

    writeChunk(text: string): void {
      if (text.length === 0) return;

      rawWrite(HIDE_CURSOR);

      const scrollBottom = getScrollBottom();

      if (streamCursorRow === 0) {
        // First chunk — position at bottom of scroll region.
        // writeOutput already scrolled to leave this row blank.
        streamCursorRow = scrollBottom;
        streamCursorCol = 1;
      }

      // Move to tracked stream position and write
      rawWrite(moveTo(streamCursorRow, streamCursorCol));
      rawWrite(text);

      // Update tracked position based on characters written
      for (const ch of text) {
        if (ch === "\n") {
          if (streamCursorRow < scrollBottom) {
            streamCursorRow++;
          }
          // At scrollBottom, \n scrolls the region; row stays
          streamCursorCol = 1;
        } else {
          streamCursorCol++;
          if (streamCursorCol > size.columns) {
            // Line wraps to next row
            if (streamCursorRow < scrollBottom) {
              streamCursorRow++;
            }
            streamCursorCol = 1;
          }
        }
      }

      // Restore cursor to input position
      rawWrite(moveTo(knownCursorRow, knownCursorCol));
      rawWrite(SHOW_CURSOR);
    },

    redrawInput(editor: LineEditor): void {
      drawInputBar(editor);
    },

    setTaint(level: ClassificationLevel): void {
      currentTaint = level;
    },

    getTaint(): ClassificationLevel {
      return currentTaint;
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

      // Reset stream cursor — any active streaming must reposition
      streamCursorRow = 0;
      streamCursorCol = 1;

      // Clear old input area (top sep + input + bottom sep + status)
      const oldTopSep = oldRows - inputLineCount - 2;
      for (let r = oldTopSep; r <= oldRows; r++) {
        if (r >= 1 && r <= size.rows) {
          rawWrite(moveTo(r, 1));
          rawWrite(CLEAR_LINE);
        }
      }

      // Also clear the new input area in case terminal shrunk
      const newTopSep = size.rows - inputLineCount - 2;
      for (let r = newTopSep; r <= size.rows; r++) {
        if (r >= 1) {
          rawWrite(moveTo(r, 1));
          rawWrite(CLEAR_LINE);
        }
      }

      setupScrollRegion();
      drawStatusBar();
    },

    startResizePolling(onResize: () => void): void {
      if (resizePollTimer !== null) return;
      resizePollTimer = setInterval(() => {
        const newSize = getTermSize();
        if (newSize.columns !== size.columns || newSize.rows !== size.rows) {
          onResize();
        }
      }, 300);
    },

    stopResizePolling(): void {
      if (resizePollTimer !== null) {
        clearInterval(resizePollTimer);
        resizePollTimer = null;
      }
    },

    cleanup(): void {
      if (spinnerTimer !== null) {
        clearInterval(spinnerTimer);
        spinnerTimer = null;
      }
      if (resizePollTimer !== null) {
        clearInterval(resizePollTimer);
        resizePollTimer = null;
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

    writeChunk(text: string): void {
      rawWrite(text);
    },

    redrawInput(_editor: LineEditor): void {
      // In dumb mode, just write the prompt character
      rawWrite(" ❯ ");
    },

    setTaint(_level: ClassificationLevel): void {
      // No visual taint indicator in dumb mode
    },

    getTaint(): ClassificationLevel {
      return "PUBLIC";
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

    startResizePolling(_onResize: () => void): void {
      // No-op — no resize handling in dumb mode
    },

    stopResizePolling(): void {
      // No-op
    },

    cleanup(): void {
      // No-op
    },
  };
}
