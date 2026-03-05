/**
 * Scroll region output writing for the TTY screen.
 *
 * Writes text into the DECSTBM scroll region, handling both
 * complete output lines and incremental streaming chunks.
 *
 * @module
 */

import type { CursorPosition } from "../layout/cursor_position.ts";
import { advanceStreamCursor } from "../layout/cursor_position.ts";
import { rawWrite } from "../screen.ts";
import {
  CLEAR_LINE,
  HIDE_CURSOR,
  moveTo,
  SHOW_CURSOR,
} from "../layout/ansi_escape.ts";

/** Write complete text lines into the scroll region (auto-scrolls). Returns line count. */
export function writeLinesToScrollRegion(
  text: string,
  scrollBottom: number,
  knownCursorRow: number,
  knownCursorCol: number,
): number {
  const lines = text.split("\n");
  rawWrite(HIDE_CURSOR);
  rawWrite(moveTo(scrollBottom, 1));
  rawWrite("\n");
  for (const line of lines) {
    rawWrite(`${line}${CLEAR_LINE}\n`);
  }
  rawWrite(moveTo(knownCursorRow, knownCursorCol));
  rawWrite(SHOW_CURSOR);
  return lines.length;
}

/**
 * Replace the last N lines written to the scroll region with new content.
 *
 * Only works when the new content has the same line count as the previous
 * output — the lines sit at fixed positions relative to scrollBottom.
 * Falls back to a normal scrolling write when heights differ.
 */
export function replaceInScrollRegion(
  text: string,
  previousLineCount: number,
  scrollBottom: number,
  knownCursorRow: number,
  knownCursorCol: number,
): number {
  const newLines = text.split("\n");
  if (previousLineCount === 0 || newLines.length !== previousLineCount) {
    return writeLinesToScrollRegion(
      text,
      scrollBottom,
      knownCursorRow,
      knownCursorCol,
    );
  }
  // Previous content occupies rows (scrollBottom - N) through (scrollBottom - 1)
  const startRow = scrollBottom - previousLineCount;
  rawWrite(HIDE_CURSOR);
  for (let i = 0; i < newLines.length; i++) {
    rawWrite(moveTo(startRow + i, 1));
    rawWrite(`${newLines[i]}${CLEAR_LINE}`);
  }
  rawWrite(moveTo(knownCursorRow, knownCursorCol));
  rawWrite(SHOW_CURSOR);
  return newLines.length;
}

/** Options for writing a streaming text chunk. */
interface StreamChunkOptions {
  readonly text: string;
  readonly streamRow: number;
  readonly streamCol: number;
  readonly scrollBottom: number;
  readonly columns: number;
  readonly knownCursorRow: number;
  readonly knownCursorCol: number;
}

/** Write a streaming text chunk, returning the updated stream cursor. */
export function writeStreamingChunk(
  opts: StreamChunkOptions,
): CursorPosition | null {
  if (opts.text.length === 0) return null;
  rawWrite(HIDE_CURSOR);
  const row = opts.streamRow === 0 ? opts.scrollBottom : opts.streamRow;
  const col = opts.streamRow === 0 ? 1 : opts.streamCol;
  rawWrite(moveTo(row, col));
  rawWrite(opts.text);
  const newPos = advanceStreamCursor(
    opts.text,
    row,
    col,
    opts.scrollBottom,
    opts.columns,
  );
  rawWrite(moveTo(opts.knownCursorRow, opts.knownCursorCol));
  rawWrite(SHOW_CURSOR);
  return newPos;
}
