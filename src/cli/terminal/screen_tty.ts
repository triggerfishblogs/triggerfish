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

// ─── Input bar composition helpers ──────────────────────────────

/** Layout dimensions for the input bar region. */
interface InputBarLayout {
  readonly topSepRow: number;
  readonly firstInputRow: number;
  readonly bottomSepRow: number;
}

/** Compute the row positions for the input bar. */
function computeInputBarLayout(
  totalRows: number,
  lineCount: number,
): InputBarLayout {
  const bottomSepRow = totalRows - 1;
  const firstInputRow = bottomSepRow - lineCount;
  const topSepRow = firstInputRow - 1;
  return { topSepRow, firstInputRow, bottomSepRow };
}

/** Draw ghost autocomplete suggestion after single-line input text. */
function renderGhostSuggestion(
  lines: readonly string[],
  suggestion: string,
): void {
  if (lines.length === 1 && suggestion.length > 0) {
    rawWrite(`${DIM}${suggestion}${RESET}`);
  }
}

/** Options for rendering input bar content. */
interface InputBarRenderOptions {
  readonly editor: LineEditor;
  readonly lines: readonly string[];
  readonly layout: VisualRowLayout;
  readonly bar: InputBarLayout;
  readonly taint: ClassificationLevel;
  readonly mcpConnected: number;
  readonly mcpConfigured: number;
  readonly columns: number;
}

/** Render the input bar contents: separators, editor lines, and ghost text. */
function renderInputBarContent(opts: InputBarRenderOptions): void {
  const color = taintColor(opts.taint);
  rawWrite(HIDE_CURSOR);
  renderTopSeparator(opts.bar.topSepRow, color, opts.columns);
  renderInputLines(opts.lines, opts.layout.perLine, opts.bar.firstInputRow);
  renderGhostSuggestion(opts.lines, opts.editor.suggestion);
  const mcp = formatMcpIndicator(opts.mcpConnected, opts.mcpConfigured);
  renderBottomSeparator(
    opts.bar.bottomSepRow,
    opts.taint,
    color,
    mcp,
    opts.columns,
  );
}

/** Position the terminal cursor at the editor's insertion point. */
function placeInputBarCursor(
  editor: LineEditor,
  prefixLen: number,
  firstInputRow: number,
  visualRowsPerLine: readonly number[],
  columns: number,
): CursorPosition {
  const cursor = computeCursorPosition(
    editor.text,
    editor.cursor,
    prefixLen,
    firstInputRow,
    visualRowsPerLine,
    columns,
  );
  rawWrite(moveTo(cursor.row, cursor.col));
  rawWrite(SHOW_CURSOR);
  return cursor;
}

/** Full render pass: draw content and position cursor, returning cursor position. */
function renderInputBarFrame(
  opts: InputBarRenderOptions,
  prefixLen: number,
): CursorPosition {
  renderInputBarContent(opts);
  return placeInputBarCursor(
    opts.editor,
    prefixLen,
    opts.bar.firstInputRow,
    opts.layout.perLine,
    opts.columns,
  );
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

// ─── TTY state container ─────────────────────────────────────────

/** Mutable state for the TTY screen manager. */
interface TtyState {
  size: { rows: number; columns: number };
  statusText: string;
  inputLineCount: number;
  currentTaint: ClassificationLevel;
  spinnerTimer: ReturnType<typeof setInterval> | null;
  spinnerFrame: number;
  spinnerLabel: string;
  spinnerVerbIdx: number;
  resizePollTimer: ReturnType<typeof setInterval> | null;
  mcpConnected: number;
  mcpConfigured: number;
  knownCursorRow: number;
  knownCursorCol: number;
  streamCursorRow: number;
  streamCursorCol: number;
}

/** Create the initial TTY state. */
function createTtyState(): TtyState {
  return {
    size: getTermSize(),
    statusText: "",
    inputLineCount: 1,
    currentTaint: "PUBLIC",
    spinnerTimer: null,
    spinnerFrame: 0,
    spinnerLabel: "",
    spinnerVerbIdx: 0,
    resizePollTimer: null,
    mcpConnected: -1,
    mcpConfigured: 0,
    knownCursorRow: 1,
    knownCursorCol: 1,
    streamCursorRow: 0,
    streamCursorCol: 1,
  };
}

// ─── TTY state operations ────────────────────────────────────────

/** Compute the bottom row of the scroll region. */
function computeScrollBottom(s: TtyState): number {
  return s.size.rows - s.inputLineCount - 3;
}

/** Apply the DECSTBM scroll region based on current state. */
function applyScrollRegion(s: TtyState): void {
  const bottom = computeScrollBottom(s);
  if (bottom >= 1) {
    rawWrite(setScrollRegion(1, bottom));
  }
}

/** Adjust the input line count and update scroll region if changed. */
function adjustInputLineCount(s: TtyState, newCount: number): void {
  if (newCount === s.inputLineCount) return;
  const oldCount = s.inputLineCount;
  s.inputLineCount = newCount;
  applyScrollRegion(s);
  if (newCount < oldCount) {
    clearStaleSeparatorRows(oldCount, newCount, s.size.rows);
  }
}

/** Draw the status bar at the bottom of the terminal. */
function drawStatusBar(s: TtyState): void {
  rawWrite(HIDE_CURSOR);
  rawWrite(moveTo(s.size.rows, 1));
  rawWrite(CLEAR_LINE);
  if (s.statusText.length > 0) {
    rawWrite(` ${s.statusText}${RESET}`);
  }
  rawWrite(moveTo(s.knownCursorRow, s.knownCursorCol));
  rawWrite(SHOW_CURSOR);
}

/** Draw the input bar and update the known cursor position. */
function drawInputBar(s: TtyState, editor: LineEditor): void {
  const lines = editor.text.split("\n");
  const prefixLen = 3;
  const layout = computeVisualRowLayout(lines, prefixLen, s.size.columns);
  adjustInputLineCount(s, Math.max(layout.total, 1));
  const bar = computeInputBarLayout(s.size.rows, s.inputLineCount);
  const opts: InputBarRenderOptions = {
    editor,
    lines,
    layout,
    bar,
    columns: s.size.columns,
    taint: s.currentTaint,
    mcpConnected: s.mcpConnected,
    mcpConfigured: s.mcpConfigured,
  };
  const cursor = renderInputBarFrame(opts, prefixLen);
  s.knownCursorRow = cursor.row;
  s.knownCursorCol = cursor.col;
}

/** Reset stream cursor and write text into the scroll region. */
function writeOutputToScrollRegion(s: TtyState, text: string): void {
  s.streamCursorRow = 0;
  s.streamCursorCol = 1;
  rawWrite(HIDE_CURSOR);
  rawWrite(moveTo(computeScrollBottom(s), 1));
  rawWrite("\n");
  for (const line of text.split("\n")) {
    rawWrite(`${line}${CLEAR_LINE}\n`);
  }
  rawWrite(moveTo(s.knownCursorRow, s.knownCursorCol));
  rawWrite(SHOW_CURSOR);
}

/** Initialize the stream cursor if not yet active. */
function initializeStreamCursor(s: TtyState): void {
  if (s.streamCursorRow === 0) {
    s.streamCursorRow = computeScrollBottom(s);
    s.streamCursorCol = 1;
  }
}

/** Write a streaming text chunk and advance the stream cursor. */
function writeStreamChunk(s: TtyState, text: string): void {
  if (text.length === 0) return;
  rawWrite(HIDE_CURSOR);
  const scrollBottom = computeScrollBottom(s);
  initializeStreamCursor(s);
  rawWrite(moveTo(s.streamCursorRow, s.streamCursorCol));
  rawWrite(text);
  const newPos = advanceStreamCursor(
    text,
    s.streamCursorRow,
    s.streamCursorCol,
    scrollBottom,
    s.size.columns,
  );
  s.streamCursorRow = newPos.row;
  s.streamCursorCol = newPos.col;
  rawWrite(moveTo(s.knownCursorRow, s.knownCursorCol));
  rawWrite(SHOW_CURSOR);
}

/** Initialize the screen: reset size, scroll region, and clear input area. */
function initializeScreen(s: TtyState): void {
  s.size = getTermSize();
  s.inputLineCount = 1;
  applyScrollRegion(s);
  const topSepRow = s.size.rows - 1 - s.inputLineCount - 1;
  clearRowRange(topSepRow, s.size.rows);
  rawWrite(moveTo(1, 1));
}

/** Clear stale input area rows during a terminal resize. */
function clearResizeInputArea(
  s: TtyState,
  oldRows: number,
): void {
  const oldTopSep = oldRows - s.inputLineCount - 2;
  for (let r = oldTopSep; r <= oldRows; r++) {
    if (r >= 1 && r <= s.size.rows) {
      rawWrite(moveTo(r, 1));
      rawWrite(CLEAR_LINE);
    }
  }
  const newTopSep = s.size.rows - s.inputLineCount - 2;
  clearRowRange(newTopSep, s.size.rows);
}

/** Handle terminal resize: refresh size, clear areas, reset scroll region. */
function handleTerminalResize(s: TtyState): void {
  const oldRows = s.size.rows;
  s.size = getTermSize();
  s.streamCursorRow = 0;
  s.streamCursorCol = 1;
  clearResizeInputArea(s, oldRows);
  applyScrollRegion(s);
  drawStatusBar(s);
}

/** Start the animated spinner timer. */
function startSpinnerTimer(s: TtyState, text: string): void {
  if (s.spinnerTimer !== null) {
    clearInterval(s.spinnerTimer);
  }
  s.spinnerLabel = text;
  s.spinnerFrame = 0;
  s.spinnerVerbIdx = Math.floor(Math.random() * THINKING_VERBS.length);
  const tick = () => advanceSpinnerFrame(s);
  tick();
  s.spinnerTimer = setInterval(tick, 80);
}

/** Advance spinner one frame, cycling the verb periodically. */
function advanceSpinnerFrame(s: TtyState): void {
  if (s.spinnerFrame > 0 && s.spinnerFrame % 30 === 0) {
    s.spinnerVerbIdx = (s.spinnerVerbIdx + 1) % THINKING_VERBS.length;
  }
  s.statusText = renderSpinnerStatusText(
    s.spinnerFrame,
    s.spinnerVerbIdx,
    s.spinnerLabel,
  );
  drawStatusBar(s);
  s.spinnerFrame++;
}

/** Stop the spinner and clear the status bar. */
function stopSpinnerTimer(s: TtyState): void {
  if (s.spinnerTimer !== null) {
    clearInterval(s.spinnerTimer);
    s.spinnerTimer = null;
  }
  s.statusText = "";
  drawStatusBar(s);
}

/** Clear all timers and reset scroll region for exit. */
function cleanupTtyState(s: TtyState): void {
  if (s.spinnerTimer !== null) {
    clearInterval(s.spinnerTimer);
    s.spinnerTimer = null;
  }
  if (s.resizePollTimer !== null) {
    clearInterval(s.resizePollTimer);
    s.resizePollTimer = null;
  }
  rawWrite(RESET_SCROLL);
  rawWrite(moveTo(s.size.rows, 1));
  rawWrite(SHOW_CURSOR);
  rawWrite("\n");
}

// ─── TTY screen manager ─────────────────────────────────────────

/** Create a TTY-aware screen manager with scroll regions. */
export function createTtyScreenManager(): ScreenManager {
  const s = createTtyState();

  return {
    isTty: true,
    init: () => initializeScreen(s),
    writeOutput: (text: string) => writeOutputToScrollRegion(s, text),
    writeChunk: (text: string) => writeStreamChunk(s, text),
    redrawInput: (editor: LineEditor) => drawInputBar(s, editor),
    setTaint: (level: ClassificationLevel) => {
      s.currentTaint = level;
    },
    getTaint: () => s.currentTaint,
    setMcpStatus: (connected: number, configured: number) => {
      s.mcpConnected = connected;
      s.mcpConfigured = configured;
    },
    setStatus: (text: string) => {
      s.statusText = `${DIM}${text}`;
      drawStatusBar(s);
    },
    clearStatus: () => {
      s.statusText = "";
      drawStatusBar(s);
    },
    startSpinner: (text: string) => startSpinnerTimer(s, text),
    stopSpinner: () => stopSpinnerTimer(s),
    handleResize: () => handleTerminalResize(s),
    startResizePolling: (onResize: () => void) => {
      if (s.resizePollTimer !== null) return;
      s.resizePollTimer = setInterval(() => {
        const newSize = getTermSize();
        if (
          newSize.columns !== s.size.columns ||
          newSize.rows !== s.size.rows
        ) {
          onResize();
        }
      }, 300);
    },
    stopResizePolling: () => {
      if (s.resizePollTimer !== null) {
        clearInterval(s.resizePollTimer);
        s.resizePollTimer = null;
      }
    },
    cleanup: () => cleanupTtyState(s),
  };
}
