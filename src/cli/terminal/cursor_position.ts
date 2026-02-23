/**
 * Cursor position computation for terminal input and streaming.
 *
 * Calculates the visual row and column of the cursor within the
 * terminal grid, accounting for line wrapping and multi-line input.
 *
 * @module
 */

/** Cursor position within the terminal. */
export interface CursorPosition {
  readonly row: number;
  readonly col: number;
}

/** Compute the cursor's visual row and column from editor state. */
export function computeCursorPosition(
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

  let cursorVisualRow = firstInputRow;
  for (let i = 0; i < cursorLineIdx; i++) {
    cursorVisualRow += visualRowsPerLine[i];
  }

  const absoluteCol = prefixLen + cursorColInLine;
  const wrappedRowsBeforeCursor = Math.floor(absoluteCol / columns);
  cursorVisualRow += wrappedRowsBeforeCursor;
  const cursorCol = (absoluteCol % columns) + 1;

  return { row: cursorVisualRow, col: cursorCol };
}

/** Advance a stream cursor position after writing text. */
export function advanceStreamCursor(
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
      col = 1;
    } else {
      col++;
      if (col > columns) {
        if (row < scrollBottom) {
          row++;
        }
        col = 1;
      }
    }
  }

  return { row, col };
}
