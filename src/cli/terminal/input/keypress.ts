/**
 * Keypress type and byte-level parsing of raw terminal input.
 *
 * Handles printable ASCII, control keys, ANSI CSI escape sequences,
 * and multi-byte UTF-8 characters.
 *
 * @module
 */

export type { Keypress } from "./keypress_types.ts";
import type { ByteParseResult, Keypress } from "./keypress_types.ts";
import { matchControlByte } from "./keypress_types.ts";
import { parseCSI } from "./keypress_csi.ts";

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
