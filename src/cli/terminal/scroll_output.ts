/**
 * Scroll region output writing for the TTY screen.
 *
 * Writes text into the DECSTBM scroll region, handling both
 * complete output lines and incremental streaming chunks.
 *
 * @module
 */

import type { CursorPosition } from "./cursor_position.ts";
import { advanceStreamCursor } from "./cursor_position.ts";
import { rawWrite } from "./screen.ts";
import {
  CLEAR_LINE,
  HIDE_CURSOR,
  moveTo,
  SHOW_CURSOR,
} from "./ansi_escape.ts";

/** Write complete text lines into the scroll region (auto-scrolls). */
export function writeLinesToScrollRegion(
  text: string,
  scrollBottom: number,
  knownCursorRow: number,
  knownCursorCol: number,
): void {
  rawWrite(HIDE_CURSOR);
  rawWrite(moveTo(scrollBottom, 1));
  rawWrite("\n");
  for (const line of text.split("\n")) {
    rawWrite(`${line}${CLEAR_LINE}\n`);
  }
  rawWrite(moveTo(knownCursorRow, knownCursorCol));
  rawWrite(SHOW_CURSOR);
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
