/**
 * CSI (Control Sequence Introducer) escape sequence parsing.
 *
 * Handles arrow keys, home, end, delete, paste brackets, and
 * Kitty keyboard protocol sequences.
 *
 * @module
 */

import type { Keypress } from "./keypress_types.ts";

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
      return {
        key: { key: "home", char: null, ctrl: false },
        nextIndex: endIndex + 1,
      };
    case 3:
      return {
        key: { key: "delete", char: null, ctrl: false },
        nextIndex: endIndex + 1,
      };
    case 4:
      return {
        key: { key: "end", char: null, ctrl: false },
        nextIndex: endIndex + 1,
      };
    case 200:
      return {
        key: { key: "paste_start", char: null, ctrl: false },
        nextIndex: endIndex + 1,
      };
    case 201:
      return {
        key: { key: "paste_end", char: null, ctrl: false },
        nextIndex: endIndex + 1,
      };
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
export function parseCSI(
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
