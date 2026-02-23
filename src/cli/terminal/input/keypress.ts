/**
 * Keypress type and byte-level parsing of raw terminal input.
 *
 * Handles printable ASCII, control keys, ANSI CSI escape sequences,
 * and multi-byte UTF-8 characters.
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

// ─── Control byte matching ──────────────────────────────────────

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

// ─── CSI sequence parsing ───────────────────────────────────────

/** Result of parsing a CSI escape sequence. */
interface CSIParseResult {
  readonly key: Keypress;
  readonly nextIndex: number;
}

/** Parse single-byte CSI finals (arrow keys, home, end). */
function matchSimpleCSIFinal(
  byte: number,
  start: number,
): CSIParseResult | null {
  switch (byte) {
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
    default:
      return null;
  }
}

/** Parse CSI <number> ~ sequences (e.g. ESC [3~ = Delete). */
function matchTildeSequence(
  paramStr: string,
  endIndex: number,
): CSIParseResult | null {
  const num = parseInt(paramStr, 10);
  switch (num) {
    case 1:
      return { key: { key: "home", char: null, ctrl: false }, nextIndex: endIndex + 1 };
    case 3:
      return { key: { key: "delete", char: null, ctrl: false }, nextIndex: endIndex + 1 };
    case 4:
      return { key: { key: "end", char: null, ctrl: false }, nextIndex: endIndex + 1 };
    default:
      return {
        key: { key: `unknown_csi_${paramStr}`, char: null, ctrl: false },
        nextIndex: endIndex + 1,
      };
  }
}

/** Parse Kitty keyboard protocol: CSI <keycode> ; <modifiers> u. */
function matchKittySequence(
  paramStr: string,
  endIndex: number,
): CSIParseResult {
  const parts = paramStr.split(";");
  const keycode = parseInt(parts[0], 10);
  const mods = parts.length > 1 ? parseInt(parts[1], 10) : 1;
  const shift = (mods - 1) & 1;
  if (keycode === 13 && shift) {
    return {
      key: { key: "shift+enter", char: "\n", ctrl: false },
      nextIndex: endIndex + 1,
    };
  }
  return {
    key: { key: `csi_u_${keycode}_${mods}`, char: null, ctrl: false },
    nextIndex: endIndex + 1,
  };
}

/** Scan parameter bytes (digits and semicolons) and return the end index. */
function scanCSIParameters(bytes: Uint8Array, start: number): number {
  let j = start;
  while (
    j < bytes.length &&
    ((bytes[j] >= 0x30 && bytes[j] <= 0x39) || bytes[j] === 0x3B)
  ) {
    j++;
  }
  return j;
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
  const simple = matchSimpleCSIFinal(b, start);
  if (simple) return simple;

  if (b >= 0x30 && b <= 0x39) {
    const j = scanCSIParameters(bytes, start);
    if (j >= bytes.length) return null;
    const final = bytes[j];
    const paramStr = new TextDecoder().decode(bytes.subarray(start, j));

    if (final === 0x7E) return matchTildeSequence(paramStr, j);
    if (final === 0x75) return matchKittySequence(paramStr, j);
  }

  return null;
}

// ─── UTF-8 parsing ──────────────────────────────────────────────

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

// ─── Escape sequence matching ───────────────────────────────────

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

// ─── Printable character matching ───────────────────────────────

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

// ─── Public API ─────────────────────────────────────────────────

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
