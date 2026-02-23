/**
 * TTY-aware screen manager with ANSI scroll regions.
 *
 * Uses DECSTBM scroll regions to keep the input prompt fixed at
 * the bottom while output scrolls in the upper region. Provides
 * animated spinner, MCP status indicator, and taint-colored separators.
 *
 * @module
 */

import type { LineEditor } from "./terminal.ts";
import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { ScreenManager } from "./screen.ts";
import {
  BOLD,
  CYAN,
  DIM,
  getTermSize,
  GREEN,
  rawWrite,
  RED,
  RESET,
  SPINNER_FRAMES,
  taintColor,
  THINKING_VERBS,
  YELLOW,
} from "./screen.ts";

// ─── ANSI escape sequences ─────────────────────────────────────

const CSI = "\x1b[";

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

// ─── Layout helpers ─────────────────────────────────────────────

/** Calculate how many visual (wrapped) rows a single logical line occupies. */
function computeVisualRowCount(
  lineText: string,
  prefixLen: number,
  columns: number,
): number {
  const usable = columns - prefixLen;
  if (usable <= 0) return 1;
  if (lineText.length === 0) return 1;
  return Math.ceil((prefixLen + lineText.length) / columns) || 1;
}

/** Visual row metadata for a set of logical lines. */
interface VisualRowLayout {
  readonly perLine: readonly number[];
  readonly total: number;
}

/** Compute visual row counts for every logical line. */
function computeVisualRowLayout(
  lines: readonly string[],
  prefixLen: number,
  columns: number,
): VisualRowLayout {
  const perLine: number[] = [];
  let total = 0;
  for (const line of lines) {
    const vr = computeVisualRowCount(line, prefixLen, columns);
    perLine.push(vr);
    total += vr;
  }
  return { perLine, total };
}

/** Clear a range of terminal rows (inclusive). */
function clearRowRange(fromRow: number, toRow: number): void {
  for (let r = fromRow; r <= toRow; r++) {
    if (r >= 1) {
      rawWrite(moveTo(r, 1));
      rawWrite(CLEAR_LINE);
    }
  }
}

/**
 * Clear rows released when the input bar shrinks, so stale separator
 * lines don't persist in the scrollback.
 */
function clearStaleSeparatorRows(
  oldLineCount: number,
  newLineCount: number,
  totalRows: number,
): void {
  const oldTopSepRow = totalRows - 1 - oldLineCount - 1;
  const newTopSepRow = totalRows - 1 - newLineCount - 1;
  for (let r = oldTopSepRow; r < newTopSepRow; r++) {
    rawWrite(moveTo(r, 1));
    rawWrite(CLEAR_LINE);
  }
}

// ─── Rendering helpers ──────────────────────────────────────────

/** Draw the top taint-colored separator line spanning the full width. */
function renderTopSeparator(
  topSepRow: number,
  color: string,
  columns: number,
): void {
  rawWrite(moveTo(topSepRow, 1));
  rawWrite(CLEAR_LINE);
  rawWrite(`${color}${"─".repeat(columns)}${RESET}`);
}

/** Draw editor text lines with prompt prefixes, handling visual row wrapping. */
function renderInputLines(
  lines: readonly string[],
  visualRowsPerLine: readonly number[],
  firstInputRow: number,
): void {
  const prefix = ` ${CYAN}${BOLD}❯${RESET} `;
  const contPrefix = ` ${DIM}·${RESET} `;

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
}

/** MCP indicator color + text pair. */
interface McpIndicator {
  readonly color: string;
  readonly text: string;
}

/** Determine the MCP status indicator color and text. */
function formatMcpIndicator(
  connected: number,
  configured: number,
): McpIndicator {
  if (connected < 0 || configured <= 0) {
    return { color: "", text: "" };
  }
  let color: string;
  if (connected === configured) {
    color = GREEN;
  } else if (connected === 0) {
    color = RED;
  } else {
    color = YELLOW;
  }
  return { color, text: `MCP ${connected}/${configured}` };
}

/** Draw the bottom separator with taint label and optional MCP indicator. */
function renderBottomSeparator(
  bottomSepRow: number,
  taint: ClassificationLevel,
  taintColorCode: string,
  mcp: McpIndicator,
  columns: number,
): void {
  const rightSuffix = mcp.text
    ? ` ${mcp.color}${BOLD}${mcp.text}${RESET}${taintColorCode} ─`
    : "";
  // Visible length of rightSuffix (strip ANSI codes for length calc)
  const rightVisLen = mcp.text ? 1 + mcp.text.length + 2 : 0;
  const fillLen = Math.max(columns - 3 - taint.length - 1 - rightVisLen, 1);

  rawWrite(moveTo(bottomSepRow, 1));
  rawWrite(CLEAR_LINE);
  rawWrite(
    `${taintColorCode}${
      "─".repeat(2)
    } ${BOLD}${taint}${RESET}${taintColorCode} ${
      "─".repeat(fillLen)
    }${rightSuffix}${RESET}`,
  );
}

/** Cursor position within the terminal. */
interface CursorPosition {
  readonly row: number;
  readonly col: number;
}

/** Compute the cursor's visual row and column from editor state. */
function computeCursorPosition(
  editorText: string,
  editorCursor: number,
  prefixLen: number,
  firstInputRow: number,
  visualRowsPerLine: readonly number[],
  columns: number,
): CursorPosition {
  const textBeforeCursor = editorText.slice(0, editorCursor);
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
  const wrappedRowsBeforeCursor = Math.floor(absoluteCol / columns);
  cursorVisualRow += wrappedRowsBeforeCursor;
  const cursorCol = (absoluteCol % columns) + 1;

  return { row: cursorVisualRow, col: cursorCol };
}

// ─── Streaming helpers ──────────────────────────────────────────

/** Advance a stream cursor position after writing text. */
function advanceStreamCursor(
  text: string,
  startRow: number,
  startCol: number,
  scrollBottom: number,
  columns: number,
): CursorPosition {
  let row = startRow;
  let col = startCol;

  for (const ch of text) {
    if (ch === "\n") {
      if (row < scrollBottom) {
        row++;
      }
      // At scrollBottom, \n scrolls the region; row stays
      col = 1;
    } else {
      col++;
      if (col > columns) {
        // Line wraps to next row
        if (row < scrollBottom) {
          row++;
        }
        col = 1;
      }
    }
  }

  return { row, col };
}

// ─── Spinner helpers ────────────────────────────────────────────

/** Format a spinner status text from the current frame and verb state. */
function renderSpinnerStatusText(
  frame: number,
  verbIdx: number,
  label: string,
): string {
  const ch = SPINNER_FRAMES[frame % SPINNER_FRAMES.length];
  const verb = THINKING_VERBS[verbIdx];
  const labelSuffix = label ? `${verb}… ${DIM}(${label})${RESET}` : `${verb}…`;
  return `${CYAN}${ch}${RESET} ${labelSuffix}`;
}

// ─── TTY screen manager ─────────────────────────────────────────

/** Create a TTY-aware screen manager with scroll regions. */
export function createTtyScreenManager(): ScreenManager {
  let size = getTermSize();
  let statusText = "";
  let inputLineCount = 1;
  let currentTaint: ClassificationLevel = "PUBLIC";
  let spinnerTimer: ReturnType<typeof setInterval> | null = null;
  let spinnerFrame = 0;
  let spinnerLabel = "";
  let spinnerVerbIdx = 0;
  let resizePollTimer: ReturnType<typeof setInterval> | null = null;
  // MCP server connection indicator
  let mcpConnected = -1; // -1 = not configured (hidden)
  let mcpConfigured = 0;

  // Track the last known cursor position so we never rely on
  // the terminal's single-slot SAVE_CURSOR / RESTORE_CURSOR,
  // which breaks when scroll region scrolling invalidates it.
  let knownCursorRow = 1;
  let knownCursorCol = 1;

  // Track cursor position during active streaming (writeChunk).
  // streamCursorRow=0 means "not actively streaming".
  let streamCursorRow = 0;
  let streamCursorCol = 1;

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

  function drawInputBar(editor: LineEditor): void {
    const lines = editor.text.split("\n");
    const prefixLen = 3; // " ❯ " or " · "
    const layout = computeVisualRowLayout(lines, prefixLen, size.columns);
    const newLineCount = Math.max(layout.total, 1);

    // If line count changed, adjust scroll region
    if (newLineCount !== inputLineCount) {
      const oldLineCount = inputLineCount;
      inputLineCount = newLineCount;
      setupScrollRegion();

      if (newLineCount < oldLineCount) {
        clearStaleSeparatorRows(oldLineCount, newLineCount, size.rows);
      }
    }

    const color = taintColor(currentTaint);
    // Layout: topSep(1) + input(inputLineCount) + bottomSep(1) + status(1)
    const bottomSepRow = size.rows - 1;
    const firstInputRow = bottomSepRow - inputLineCount;
    const topSepRow = firstInputRow - 1;

    rawWrite(HIDE_CURSOR);
    renderTopSeparator(topSepRow, color, size.columns);
    renderInputLines(lines, layout.perLine, firstInputRow);

    // Draw ghost suggestion on the last line (only for single-line input)
    if (lines.length === 1 && editor.suggestion.length > 0) {
      rawWrite(`${DIM}${editor.suggestion}${RESET}`);
    }

    const mcp = formatMcpIndicator(mcpConnected, mcpConfigured);
    renderBottomSeparator(bottomSepRow, currentTaint, color, mcp, size.columns);

    const cursor = computeCursorPosition(
      editor.text,
      editor.cursor,
      prefixLen,
      firstInputRow,
      layout.perLine,
      size.columns,
    );
    knownCursorRow = cursor.row;
    knownCursorCol = cursor.col;
    rawWrite(moveTo(cursor.row, cursor.col));
    rawWrite(SHOW_CURSOR);
  }

  function drawStatusBar(): void {
    rawWrite(HIDE_CURSOR);
    rawWrite(moveTo(size.rows, 1));
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
      const topSepRow = size.rows - 1 - inputLineCount - 1;
      clearRowRange(topSepRow, size.rows);

      // Position cursor in scroll region
      rawWrite(moveTo(1, 1));
    },

    writeOutput(text: string): void {
      streamCursorRow = 0;
      streamCursorCol = 1;

      rawWrite(HIDE_CURSOR);
      rawWrite(moveTo(getScrollBottom(), 1));
      rawWrite("\n");

      for (const line of text.split("\n")) {
        rawWrite(`${line}${CLEAR_LINE}\n`);
      }

      rawWrite(moveTo(knownCursorRow, knownCursorCol));
      rawWrite(SHOW_CURSOR);
    },

    writeChunk(text: string): void {
      if (text.length === 0) return;

      rawWrite(HIDE_CURSOR);

      const scrollBottom = getScrollBottom();

      if (streamCursorRow === 0) {
        streamCursorRow = scrollBottom;
        streamCursorCol = 1;
      }

      rawWrite(moveTo(streamCursorRow, streamCursorCol));
      rawWrite(text);

      const newPos = advanceStreamCursor(
        text,
        streamCursorRow,
        streamCursorCol,
        scrollBottom,
        size.columns,
      );
      streamCursorRow = newPos.row;
      streamCursorCol = newPos.col;

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

    setMcpStatus(connected: number, configured: number): void {
      mcpConnected = connected;
      mcpConfigured = configured;
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
      if (spinnerTimer !== null) {
        clearInterval(spinnerTimer);
      }
      spinnerLabel = text;
      spinnerFrame = 0;
      spinnerVerbIdx = Math.floor(Math.random() * THINKING_VERBS.length);

      const render = () => {
        if (spinnerFrame > 0 && spinnerFrame % 30 === 0) {
          spinnerVerbIdx = (spinnerVerbIdx + 1) % THINKING_VERBS.length;
        }
        statusText = renderSpinnerStatusText(
          spinnerFrame,
          spinnerVerbIdx,
          spinnerLabel,
        );
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

      streamCursorRow = 0;
      streamCursorCol = 1;

      // Clear old input area, clamped to current screen bounds
      const oldTopSep = oldRows - inputLineCount - 2;
      for (let r = oldTopSep; r <= oldRows; r++) {
        if (r >= 1 && r <= size.rows) {
          rawWrite(moveTo(r, 1));
          rawWrite(CLEAR_LINE);
        }
      }

      // Clear new input area in case terminal shrunk
      const newTopSep = size.rows - inputLineCount - 2;
      clearRowRange(newTopSep, size.rows);

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
      rawWrite(RESET_SCROLL);
      rawWrite(moveTo(size.rows, 1));
      rawWrite(SHOW_CURSOR);
      rawWrite("\n");
    },
  };
}
