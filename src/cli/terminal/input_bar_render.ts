/**
 * Input bar rendering for the TTY screen layout.
 *
 * Draws the fixed input region at the bottom of the terminal:
 * taint-colored separators, editor text lines with prompt prefixes,
 * ghost autocomplete suggestions, and MCP status indicators.
 *
 * @module
 */

import type { LineEditor } from "./terminal.ts";
import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { VisualRowLayout } from "./visual_row_layout.ts";
import type { CursorPosition } from "./cursor_position.ts";
import { computeCursorPosition } from "./cursor_position.ts";
import {
  BOLD,
  CYAN,
  DIM,
  GREEN,
  rawWrite,
  RED,
  RESET,
  taintColor,
  YELLOW,
} from "./screen.ts";
import {
  CLEAR_LINE,
  HIDE_CURSOR,
  moveTo,
  SHOW_CURSOR,
} from "./ansi_escape.ts";

// ─── Layout dimensions ──────────────────────────────────────────

/** Layout dimensions for the input bar region. */
export interface InputBarLayout {
  readonly topSepRow: number;
  readonly firstInputRow: number;
  readonly bottomSepRow: number;
}

/** Compute the row positions for the input bar. */
export function computeInputBarLayout(
  totalRows: number,
  lineCount: number,
): InputBarLayout {
  const bottomSepRow = totalRows - 1;
  const firstInputRow = bottomSepRow - lineCount;
  const topSepRow = firstInputRow - 1;
  return { topSepRow, firstInputRow, bottomSepRow };
}

// ─── MCP indicator ──────────────────────────────────────────────

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

// ─── Separator rendering ────────────────────────────────────────

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

// ─── Editor line rendering ──────────────────────────────────────

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

/** Draw ghost autocomplete suggestion after single-line input text. */
function renderGhostSuggestion(
  lines: readonly string[],
  suggestion: string,
): void {
  if (lines.length === 1 && suggestion.length > 0) {
    rawWrite(`${DIM}${suggestion}${RESET}`);
  }
}

// ─── Full input bar composition ─────────────────────────────────

/** Options for rendering input bar content. */
export interface InputBarRenderOptions {
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
export function renderInputBarFrame(
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
