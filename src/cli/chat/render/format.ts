/**
 * Text formatting utilities for the chat UI — truncation,
 * byte formatting, thinking-tag stripping, and response rendering.
 * @module
 */

import { BOLD, CYAN, GREEN, RED, RESET, write, writeln } from "./ansi.ts";

/** Truncate text for compact preview display. */
export function truncate(text: string, max: number): string {
  const oneLine = text.replace(/\n/g, " ↵ ").replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return oneLine.slice(0, max) + "\u2026";
}

/** Extract the primary argument value from a tool call for compact display. */
export function extractLeadToolArgument(args: Record<string, unknown>): string {
  const values = Object.values(args);
  if (values.length === 0) return "";
  const first = values[0];
  const str = typeof first === "string" ? first : JSON.stringify(first);
  return truncate(str, 50);
}

/** Format a human-readable byte size. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}b`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}kb`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}mb`;
}

/** Strip `<think>`/`<thinking>` blocks from display text. */
export function stripThinkingTags(text: string): string {
  let result = text;
  // Matched pairs
  result = result.replace(/<think>[\s\S]*?<\/think>/gi, "");
  result = result.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "");
  // Opening tag with no close (truncated mid-thought)
  result = result.replace(/<think(?:ing)?>[\s\S]*$/gi, "");
  // Bare closing tag with no opener — strip everything up to and including it
  result = result.replace(/^[\s\S]*?<\/think(?:ing)?>/gi, "");
  return result.trim();
}

/** Render the assistant's final response. */
export function renderResponse(text: string): void {
  const display = stripThinkingTags(text);
  writeln(`  ${GREEN}${BOLD}triggerfish${RESET}`);
  writeln();
  for (const line of display.split("\n")) {
    writeln(`  ${line}`);
  }
  writeln();
}

/** Format the assistant's response as a string. */
export function formatResponse(text: string): string {
  const display = stripThinkingTags(text);
  const lines: string[] = [];
  lines.push(`  ${GREEN}${BOLD}triggerfish${RESET}`);
  lines.push("");
  for (const line of display.split("\n")) {
    lines.push(`  ${line}`);
  }
  lines.push("");
  return lines.join("\n");
}

/** Render an error message. */
export function renderError(text: string): void {
  writeln(`  ${RED}${BOLD}error${RESET} ${text}`);
  writeln();
}

/** Format an error message as a string. */
export function formatError(text: string): string {
  return `  ${RED}${BOLD}error${RESET} ${text}\n`;
}

/** Write the user input prompt (legacy, for non-screen-manager mode). */
export function renderPrompt(): void {
  write(` ${CYAN}${BOLD}\u276f${RESET} `);
}
