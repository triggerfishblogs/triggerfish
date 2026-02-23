/**
 * Immutable line editor for terminal input.
 *
 * Each mutation returns a new editor instance, preserving immutability.
 * Supports insert, delete, cursor movement, ghost suggestions, and clear.
 *
 * @module
 */

// ─── Types ──────────────────────────────────────────────────────

/** Immutable line editor state. */
export interface LineEditor {
  /** Current text content. */
  readonly text: string;
  /** Cursor position within text (0-based). */
  readonly cursor: number;
  /** Ghost suggestion text shown after cursor (greyed out). */
  readonly suggestion: string;

  /** Insert text at cursor position. Clears suggestion. */
  insert(str: string): LineEditor;
  /** Delete character before cursor. */
  backspace(): LineEditor;
  /** Delete character at cursor. */
  deleteChar(): LineEditor;
  /** Move cursor in a direction. */
  moveCursor(direction: "left" | "right" | "home" | "end"): LineEditor;
  /** Replace entire text content. Cursor moves to end. */
  setText(text: string): LineEditor;
  /** Set suggestion text (shown as ghost after cursor). */
  setSuggestion(suggestion: string): LineEditor;
  /** Accept suggestion: append suggestion text to input. */
  acceptSuggestion(): LineEditor;
  /** Clear all state. */
  clear(): LineEditor;
}

// ─── Internal helpers ───────────────────────────────────────────

/** Splice `str` into `text` at `cursor`, returning a new editor. */
function spliceEditorText(
  text: string,
  cursor: number,
  str: string,
): LineEditor {
  const before = text.slice(0, cursor);
  const after = text.slice(cursor);
  return makeEditor(before + str + after, cursor + str.length, "");
}

/** Remove one character before the cursor position. */
function removeCharBeforeCursor(
  text: string,
  cursor: number,
  suggestion: string,
): LineEditor {
  if (cursor === 0) return makeEditor(text, cursor, suggestion);
  return makeEditor(
    text.slice(0, cursor - 1) + text.slice(cursor),
    cursor - 1,
    suggestion,
  );
}

/** Remove one character at the cursor position. */
function removeCharAtCursor(
  text: string,
  cursor: number,
  suggestion: string,
): LineEditor {
  if (cursor >= text.length) return makeEditor(text, cursor, suggestion);
  return makeEditor(
    text.slice(0, cursor) + text.slice(cursor + 1),
    cursor,
    suggestion,
  );
}

/** Resolve the new cursor position for a directional move. */
function resolveEditorCursorPosition(
  direction: "left" | "right" | "home" | "end",
  cursor: number,
  textLength: number,
): number {
  switch (direction) {
    case "left":
      return Math.max(0, cursor - 1);
    case "right":
      return Math.min(textLength, cursor + 1);
    case "home":
      return 0;
    case "end":
      return textLength;
  }
}

/** Internal factory for immutable editor instances. */
function makeEditor(
  text: string,
  cursor: number,
  suggestion: string,
): LineEditor {
  return {
    text,
    cursor,
    suggestion,
    insert: (str: string) => spliceEditorText(text, cursor, str),
    backspace: () => removeCharBeforeCursor(text, cursor, suggestion),
    deleteChar: () => removeCharAtCursor(text, cursor, suggestion),
    moveCursor: (dir: "left" | "right" | "home" | "end") =>
      makeEditor(
        text,
        resolveEditorCursorPosition(dir, cursor, text.length),
        suggestion,
      ),
    setText: (t: string) => makeEditor(t, t.length, ""),
    setSuggestion: (s: string) => makeEditor(text, cursor, s),
    acceptSuggestion: () =>
      suggestion.length === 0
        ? makeEditor(text, cursor, suggestion)
        : makeEditor(text + suggestion, (text + suggestion).length, ""),
    clear: () => makeEditor("", 0, ""),
  };
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Create a new line editor with empty state.
 *
 * @returns An immutable LineEditor instance
 */
export function createLineEditor(): LineEditor {
  return makeEditor("", 0, "");
}
