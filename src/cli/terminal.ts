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
  0x17: "ctrl+w",
};

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
    const byte = bytes[i];

    // Enter (CR or LF)
    if (byte === 0x0D || byte === 0x0A) {
      keys.push({ key: "enter", char: null, ctrl: false });
      i++;
      continue;
    }

    // Tab
    if (byte === 0x09) {
      keys.push({ key: "tab", char: null, ctrl: false });
      i++;
      continue;
    }

    // Backspace
    if (byte === 0x7F || byte === 0x08) {
      keys.push({ key: "backspace", char: null, ctrl: false });
      i++;
      continue;
    }

    // Named control keys
    if (CTRL_KEYS[byte] !== undefined) {
      keys.push({ key: CTRL_KEYS[byte], char: null, ctrl: true });
      i++;
      continue;
    }

    // ESC sequences
    if (byte === 0x1B) {
      // Check if followed by [ (CSI sequence)
      if (i + 1 < bytes.length && bytes[i + 1] === 0x5B) {
        // CSI sequence: ESC [ ...
        const parsed = parseCSI(bytes, i + 2);
        if (parsed) {
          keys.push(parsed.key);
          i = parsed.nextIndex;
          continue;
        }
      }
      // Standalone ESC (no bracket follows in this buffer)
      keys.push({ key: "esc", char: null, ctrl: false });
      i++;
      continue;
    }

    // Printable ASCII (0x20-0x7E)
    if (byte >= 0x20 && byte <= 0x7E) {
      const char = String.fromCharCode(byte);
      keys.push({ key: char, char, ctrl: false });
      i++;
      continue;
    }

    // Multi-byte UTF-8 sequences
    const utf8Result = parseUtf8(bytes, i);
    if (utf8Result) {
      keys.push({ key: utf8Result.char, char: utf8Result.char, ctrl: false });
      i = utf8Result.nextIndex;
      continue;
    }

    // Unknown byte — skip
    i++;
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
      return { key: { key: "up", char: null, ctrl: false }, nextIndex: start + 1 };
    case 0x42: // B = Down
      return { key: { key: "down", char: null, ctrl: false }, nextIndex: start + 1 };
    case 0x43: // C = Right
      return { key: { key: "right", char: null, ctrl: false }, nextIndex: start + 1 };
    case 0x44: // D = Left
      return { key: { key: "left", char: null, ctrl: false }, nextIndex: start + 1 };
    case 0x48: // H = Home
      return { key: { key: "home", char: null, ctrl: false }, nextIndex: start + 1 };
    case 0x46: // F = End
      return { key: { key: "end", char: null, ctrl: false }, nextIndex: start + 1 };
  }

  // Extended sequences: ESC [ <number> ~
  if (b >= 0x30 && b <= 0x39 && start + 1 < bytes.length && bytes[start + 1] === 0x7E) {
    const num = b - 0x30;
    switch (num) {
      case 1: // Home
        return { key: { key: "home", char: null, ctrl: false }, nextIndex: start + 2 };
      case 3: // Delete
        return { key: { key: "delete", char: null, ctrl: false }, nextIndex: start + 2 };
      case 4: // End
        return { key: { key: "end", char: null, ctrl: false }, nextIndex: start + 2 };
    }
    // Other number~ sequences — skip
    return { key: { key: `unknown_csi_${num}`, char: null, ctrl: false }, nextIndex: start + 2 };
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

/**
 * Create an async keypress reader.
 *
 * Puts stdin into raw mode and yields individual keypresses.
 * On stop(), restores the terminal to cooked mode.
 *
 * For standalone ESC detection: in raw mode, a real ESC key sends
 * just 0x1B with no follow-up, while an escape sequence sends
 * 0x1B followed by more bytes in the same read(). Since
 * Deno.stdin.read() buffers multiple bytes from a single terminal
 * event, this works reliably without timers in most cases.
 *
 * @returns A KeypressReader instance
 */
export function createKeypressReader(): KeypressReader {
  let running = false;
  let resolveNext: ((value: IteratorResult<Keypress>) => void) | null = null;
  const queue: Keypress[] = [];

  function enqueue(key: Keypress): void {
    if (resolveNext) {
      const resolve = resolveNext;
      resolveNext = null;
      resolve({ value: key, done: false });
    } else {
      queue.push(key);
    }
  }

  async function readLoop(): Promise<void> {
    const buf = new Uint8Array(256);
    while (running) {
      const n = await Deno.stdin.read(buf);
      if (n === null) {
        // EOF — signal done
        if (resolveNext) {
          const resolve = resolveNext;
          resolveNext = null;
          resolve({ value: undefined as unknown as Keypress, done: true });
        }
        break;
      }
      const keys = parseKeypresses(buf.subarray(0, n));
      for (const key of keys) {
        enqueue(key);
      }
    }
  }

  return {
    start() {
      if (running) return;
      running = true;
      if (Deno.stdin.isTerminal()) {
        Deno.stdin.setRaw(true);
      }
      readLoop();
    },

    stop() {
      running = false;
      if (Deno.stdin.isTerminal()) {
        Deno.stdin.setRaw(false);
      }
      // Flush any waiting consumers
      if (resolveNext) {
        const resolve = resolveNext;
        resolveNext = null;
        resolve({ value: undefined as unknown as Keypress, done: true });
      }
    },

    [Symbol.asyncIterator](): AsyncIterableIterator<Keypress> {
      return {
        next(): Promise<IteratorResult<Keypress>> {
          if (queue.length > 0) {
            return Promise.resolve({ value: queue.shift()!, done: false });
          }
          if (!running) {
            return Promise.resolve({ value: undefined as unknown as Keypress, done: true });
          }
          return new Promise((resolve) => {
            resolveNext = resolve;
          });
        },
        [Symbol.asyncIterator]() {
          return this;
        },
      };
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

/** Internal factory for immutable editor instances. */
function makeEditor(text: string, cursor: number, suggestion: string): LineEditor {
  return {
    text,
    cursor,
    suggestion,

    insert(str: string): LineEditor {
      const before = text.slice(0, cursor);
      const after = text.slice(cursor);
      return makeEditor(before + str + after, cursor + str.length, "");
    },

    backspace(): LineEditor {
      if (cursor === 0) return this;
      const before = text.slice(0, cursor - 1);
      const after = text.slice(cursor);
      return makeEditor(before + after, cursor - 1, suggestion);
    },

    deleteChar(): LineEditor {
      if (cursor >= text.length) return this;
      const before = text.slice(0, cursor);
      const after = text.slice(cursor + 1);
      return makeEditor(before + after, cursor, suggestion);
    },

    moveCursor(direction: "left" | "right" | "home" | "end"): LineEditor {
      switch (direction) {
        case "left":
          return cursor > 0 ? makeEditor(text, cursor - 1, suggestion) : this;
        case "right":
          return cursor < text.length ? makeEditor(text, cursor + 1, suggestion) : this;
        case "home":
          return makeEditor(text, 0, suggestion);
        case "end":
          return makeEditor(text, text.length, suggestion);
      }
    },

    setText(newText: string): LineEditor {
      return makeEditor(newText, newText.length, "");
    },

    setSuggestion(newSuggestion: string): LineEditor {
      return makeEditor(text, cursor, newSuggestion);
    },

    acceptSuggestion(): LineEditor {
      if (suggestion.length === 0) return this;
      const newText = text + suggestion;
      return makeEditor(newText, newText.length, "");
    },

    clear(): LineEditor {
      return makeEditor("", 0, "");
    },
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
