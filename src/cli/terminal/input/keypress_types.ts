/**
 * Keypress type definitions and single-byte control character matching.
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
export interface ByteParseResult {
  readonly key: Keypress;
  readonly nextIndex: number;
}

/** Build a ByteParseResult for a special (non-printable) key at the given index. */
export function specialKeyResult(
  name: string,
  index: number,
  ctrl = false,
): ByteParseResult {
  return { key: { key: name, char: null, ctrl }, nextIndex: index + 1 };
}

/** Match single-byte control characters (enter, tab, backspace, ctrl+X). */
export function matchControlByte(
  byte: number,
  index: number,
): ByteParseResult | null {
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
