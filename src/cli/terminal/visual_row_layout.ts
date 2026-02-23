/**
 * Visual row calculation for terminal line wrapping.
 *
 * Computes how many physical terminal rows a set of logical lines
 * occupy when displayed with a given prefix, and provides helpers
 * for clearing row ranges when the layout changes.
 *
 * @module
 */

import { rawWrite } from "./screen.ts";
import { CLEAR_LINE, moveTo } from "./ansi_escape.ts";

/** Visual row metadata for a set of logical lines. */
export interface VisualRowLayout {
  readonly perLine: readonly number[];
  readonly total: number;
}

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

/** Compute visual row counts for every logical line. */
export function computeVisualRowLayout(
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
export function clearRowRange(fromRow: number, toRow: number): void {
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
export function clearStaleSeparatorRows(
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
