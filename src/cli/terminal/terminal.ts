/**
 * Raw terminal input system: keypress parsing, line editing, suggestions.
 *
 * Provides character-at-a-time input via Deno.stdin.setRaw(), ANSI
 * escape sequence parsing, an immutable line editor, and a suggestion
 * engine for tab-completion.
 *
 * @module
 */

// ─── Keypress types ─────────────────────────────────────────────

/** A parsed keypress event. */
export interface Keypress {
  /** Key identifier: "a", "enter", "up", "esc", "tab", "ctrl+o", etc. */
  readonly key: string;
  /** Printable character or null for control/special keys. */
  readonly char: string | null;
  /** Whether Ctrl was held. */
  readonly ctrl: boolean;
}

// ─── Keypress parsing ───────────────────────────────────────────

/** Control key names indexed by byte value. */
const CTRL_KEYS: Readonly<Record<number, string>> = {
  0x01: "ctrl+a",
  0x02: "ctrl+b",
  0x03: "ctrl+c",
  0x04: "ctrl+d",
  0x05: "ctrl+e",
  0x06: "ctrl+f",
  0x0F: "ctrl+o",
  0x12: "ctrl+r",
  0x15: "ctrl+u",
  0x16: "ctrl+v",
  0x17: "ctrl+w",
};

/** Result of matching a single keypress: the event and next byte index. */
interface ByteParseResult {
  readonly key: Keypress;
  readonly nextIndex: number;
}

/** Build a ByteParseResult for a special (non-printable) key at the given index. */
function specialKeyResult(
  name: string,
  index: number,
  ctrl = false,
): ByteParseResult {
  return { key: { key: name, char: null, ctrl }, nextIndex: index + 1 };
}

/** Match single-byte control characters (enter, tab, backspace, ctrl+X). */
function matchControlByte(byte: number, index: number): ByteParseResult | null {
  if (byte === 0x0D || byte === 0x0A) return specialKeyResult("enter", index);
  if (byte === 0x09) return specialKeyResult("tab", index);
  if (byte === 0x7F || byte === 0x08) {
    return specialKeyResult("backspace", index);
  }
  if (CTRL_KEYS[byte] !== undefined) {
    return specialKeyResult(CTRL_KEYS[byte], index, true);
  }
  return null;
}

/** Match ESC-prefixed sequences (CSI, Alt+Enter, standalone ESC). */
function matchEscapeSequence(
  bytes: Uint8Array,
  index: number,
): ByteParseResult | null {
  if (bytes[index] !== 0x1B) return null;

  if (index + 1 < bytes.length) {
    const next = bytes[index + 1];
    if (next === 0x5B) {
      const parsed = parseCSI(bytes, index + 2);
      if (parsed) return { key: parsed.key, nextIndex: parsed.nextIndex };
    }
    if (next === 0x0D || next === 0x0A) {
      return {
        key: { key: "shift+enter", char: "\n", ctrl: false },
        nextIndex: index + 2,
      };
    }
  }
  return { key: { key: "esc", char: null, ctrl: false }, nextIndex: index + 1 };
}

/** Match printable ASCII (0x20-0x7E) or multi-byte UTF-8 characters. */
function matchPrintableChar(
  bytes: Uint8Array,
  index: number,
): ByteParseResult | null {
  const byte = bytes[index];
  if (byte >= 0x20 && byte <= 0x7E) {
    const char = String.fromCharCode(byte);
    return { key: { key: char, char, ctrl: false }, nextIndex: index + 1 };
  }
  const utf8Result = parseUtf8(bytes, index);
  if (utf8Result) {
    return {
      key: { key: utf8Result.char, char: utf8Result.char, ctrl: false },
      nextIndex: utf8Result.nextIndex,
    };
  }
  return null;
}

/**
 * Parse raw bytes into keypress events.
 *
 * Handles printable ASCII, control keys, and ANSI escape sequences
 * for arrow keys, home, end, and delete. A standalone ESC byte (not
 * followed by `[`) is treated as the ESC key.
 *
 * @param bytes - Raw bytes read from stdin
 * @returns Array of parsed keypress events
 */
export function parseKeypresses(bytes: Uint8Array): readonly Keypress[] {
  const keys: Keypress[] = [];
  let i = 0;

  while (i < bytes.length) {
    const result = matchControlByte(bytes[i], i) ??
      matchEscapeSequence(bytes, i) ??
      matchPrintableChar(bytes, i);

    if (result) {
      keys.push(result.key);
      i = result.nextIndex;
    } else {
      i++;
    }
  }

  return keys;
}

/** Result of parsing a CSI escape sequence. */
interface CSIParseResult {
  readonly key: Keypress;
  readonly nextIndex: number;
}

/**
 * Parse a CSI (Control Sequence Introducer) sequence starting after ESC [.
 *
 * @param bytes - Full byte buffer
 * @param start - Index of first byte after ESC [
 * @returns Parsed key and next index, or null if unrecognized
 */
function parseCSI(
  bytes: Uint8Array,
  start: number,
): CSIParseResult | null {
  if (start >= bytes.length) return null;

  const b = bytes[start];

  // Simple single-byte CSI finals
  switch (b) {
    case 0x41: // A = Up
      return {
        key: { key: "up", char: null, ctrl: false },
        nextIndex: start + 1,
      };
    case 0x42: // B = Down
      return {
        key: { key: "down", char: null, ctrl: false },
        nextIndex: start + 1,
      };
    case 0x43: // C = Right
      return {
        key: { key: "right", char: null, ctrl: false },
        nextIndex: start + 1,
      };
    case 0x44: // D = Left
      return {
        key: { key: "left", char: null, ctrl: false },
        nextIndex: start + 1,
      };
    case 0x48: // H = Home
      return {
        key: { key: "home", char: null, ctrl: false },
        nextIndex: start + 1,
      };
    case 0x46: // F = End
      return {
        key: { key: "end", char: null, ctrl: false },
        nextIndex: start + 1,
      };
  }

  // Multi-byte CSI sequences: collect digits, semicolons, then final byte
  if (b >= 0x30 && b <= 0x39) {
    // Parse parameter bytes until we hit a final byte (0x40-0x7E)
    let j = start;
    while (
      j < bytes.length &&
      ((bytes[j] >= 0x30 && bytes[j] <= 0x39) || bytes[j] === 0x3B)
    ) {
      j++;
    }
    if (j >= bytes.length) return null;
    const final = bytes[j];
    const paramStr = new TextDecoder().decode(bytes.subarray(start, j));

    // CSI <number> ~ sequences (e.g. ESC [3~ = Delete)
    if (final === 0x7E) {
      const num = parseInt(paramStr, 10);
      switch (num) {
        case 1:
          return {
            key: { key: "home", char: null, ctrl: false },
            nextIndex: j + 1,
          };
        case 3:
          return {
            key: { key: "delete", char: null, ctrl: false },
            nextIndex: j + 1,
          };
        case 4:
          return {
            key: { key: "end", char: null, ctrl: false },
            nextIndex: j + 1,
          };
      }
      return {
        key: { key: `unknown_csi_${paramStr}`, char: null, ctrl: false },
        nextIndex: j + 1,
      };
    }

    // Kitty keyboard protocol: CSI <keycode> ; <modifiers> u
    if (final === 0x75) { // 'u'
      const parts = paramStr.split(";");
      const keycode = parseInt(parts[0], 10);
      const mods = parts.length > 1 ? parseInt(parts[1], 10) : 1;
      const shift = (mods - 1) & 1;
      if (keycode === 13 && shift) {
        return {
          key: { key: "shift+enter", char: "\n", ctrl: false },
          nextIndex: j + 1,
        };
      }
      return {
        key: { key: `csi_u_${keycode}_${mods}`, char: null, ctrl: false },
        nextIndex: j + 1,
      };
    }
  }

  return null;
}

/** Result of parsing a UTF-8 multi-byte character. */
interface Utf8ParseResult {
  readonly char: string;
  readonly nextIndex: number;
}

/**
 * Parse a multi-byte UTF-8 character.
 *
 * @param bytes - Full byte buffer
 * @param start - Index of the leading byte
 * @returns Parsed character and next index, or null if invalid
 */
function parseUtf8(bytes: Uint8Array, start: number): Utf8ParseResult | null {
  const b = bytes[start];
  let byteCount: number;

  if ((b & 0xE0) === 0xC0) byteCount = 2;
  else if ((b & 0xF0) === 0xE0) byteCount = 3;
  else if ((b & 0xF8) === 0xF0) byteCount = 4;
  else return null;

  if (start + byteCount > bytes.length) return null;

  const slice = bytes.subarray(start, start + byteCount);
  const char = new TextDecoder().decode(slice);
  if (char.length === 0 || char === "\uFFFD") return null;

  return { char, nextIndex: start + byteCount };
}

// ─── Keypress reader ────────────────────────────────────────────

/** Async keypress reader that yields parsed keypresses from raw stdin. */
export interface KeypressReader {
  /** Start reading keypresses in raw mode. */
  start(): void;
  /** Stop reading and restore terminal to cooked mode. */
  stop(): void;
  /** Async iterator of keypress events. */
  [Symbol.asyncIterator](): AsyncIterableIterator<Keypress>;
}

/** Mutable state shared between keypress reader methods. */
interface ReaderState {
  running: boolean;
  resolveNext: ((value: IteratorResult<Keypress>) => void) | null;
  readonly queue: Keypress[];
}

/** Resolve the pending iterator consumer with a done signal. */
function signalReaderDone(state: ReaderState): void {
  if (state.resolveNext) {
    const resolve = state.resolveNext;
    state.resolveNext = null;
    resolve({ value: undefined as unknown as Keypress, done: true });
  }
}

/** Deliver a keypress to a waiting consumer or buffer it. */
function enqueueKeypress(state: ReaderState, key: Keypress): void {
  if (state.resolveNext) {
    const resolve = state.resolveNext;
    state.resolveNext = null;
    resolve({ value: key, done: false });
  } else {
    state.queue.push(key);
  }
}

/** Continuously read from stdin and parse keypresses until stopped. */
async function runStdinReadLoop(state: ReaderState): Promise<void> {
  const buf = new Uint8Array(256);
  while (state.running) {
    const n = await Deno.stdin.read(buf);
    if (n === null) {
      signalReaderDone(state);
      break;
    }
    for (const key of parseKeypresses(buf.subarray(0, n))) {
      enqueueKeypress(state, key);
    }
  }
}

/** Build the async iterator that yields keypresses from the queue. */
function buildKeypressIterator(
  state: ReaderState,
): AsyncIterableIterator<Keypress> {
  return {
    next(): Promise<IteratorResult<Keypress>> {
      if (state.queue.length > 0) {
        return Promise.resolve({ value: state.queue.shift()!, done: false });
      }
      if (!state.running) {
        return Promise.resolve({
          value: undefined as unknown as Keypress,
          done: true,
        });
      }
      return new Promise((resolve) => {
        state.resolveNext = resolve;
      });
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}

/**
 * Create an async keypress reader.
 *
 * Puts stdin into raw mode and yields individual keypresses.
 * On stop(), restores the terminal to cooked mode.
 *
 * @returns A KeypressReader instance
 */
export function createKeypressReader(): KeypressReader {
  const state: ReaderState = { running: false, resolveNext: null, queue: [] };

  return {
    start() {
      if (state.running) return;
      state.running = true;
      if (Deno.stdin.isTerminal()) Deno.stdin.setRaw(true);
      runStdinReadLoop(state);
    },
    stop() {
      state.running = false;
      if (Deno.stdin.isTerminal()) Deno.stdin.setRaw(false);
      signalReaderDone(state);
    },
    [Symbol.asyncIterator](): AsyncIterableIterator<Keypress> {
      return buildKeypressIterator(state);
    },
  };
}

// ─── Line editor ────────────────────────────────────────────────

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

/**
 * Create a new line editor with empty state.
 *
 * @returns An immutable LineEditor instance
 */
export function createLineEditor(): LineEditor {
  return makeEditor("", 0, "");
}

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

// ─── Suggestion engine ──────────────────────────────────────────

/** Slash commands available for tab-completion. */
const SLASH_COMMANDS: readonly string[] = [
  "/clear",
  "/compact",
  "/exit",
  "/help",
  "/quit",
  "/verbose",
];

/** Suggestion engine interface. */
export interface SuggestionEngine {
  /** Get the best suggestion for the given input prefix. */
  suggest(input: string, history: readonly string[]): string | null;
}

/**
 * Create a suggestion engine for tab-completion.
 *
 * Checks slash commands first, then history (most recent match wins).
 *
 * @returns A SuggestionEngine instance
 */
export function createSuggestionEngine(): SuggestionEngine {
  return {
    suggest(input: string, history: readonly string[]): string | null {
      if (input.length === 0) return null;

      // Slash commands take priority
      if (input.startsWith("/")) {
        for (const cmd of SLASH_COMMANDS) {
          if (cmd.startsWith(input) && cmd !== input) {
            return cmd;
          }
        }
      }

      // History match (most recent first)
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].startsWith(input) && history[i] !== input) {
          return history[i];
        }
      }

      return null;
    },
  };
}
