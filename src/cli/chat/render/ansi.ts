/**
 * ANSI escape codes and low-level write helpers for the chat UI.
 * @module
 */

export const RESET = "\x1b[0m";
export const BOLD = "\x1b[1m";
export const DIM = "\x1b[2m";
export const CYAN = "\x1b[36m";
export const GREEN = "\x1b[32m";
export const YELLOW = "\x1b[33m";
export const RED = "\x1b[31m";
export const BLUE = "\x1b[34m";

export const SPINNER_FRAMES = [
  "⠋",
  "⠙",
  "⠹",
  "⠸",
  "⠼",
  "⠴",
  "⠦",
  "⠧",
  "⠇",
  "⠏",
];

export const enc = new TextEncoder();

/** Write raw text to stdout synchronously (no newline). */
export function write(text: string): void {
  Deno.stdout.writeSync(enc.encode(text));
}

/** Write text with newline to stdout synchronously. */
export function writeln(text: string = ""): void {
  Deno.stdout.writeSync(enc.encode(text + "\n"));
}

/** Tool display verbosity level. */
export type ToolDisplayMode = "compact" | "expanded";
