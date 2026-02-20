/**
 * Tool call and result rendering for compact and expanded display modes.
 * @module
 */

import type { OrchestratorEvent } from "../agent/orchestrator.ts";
import {
  RESET, BOLD, DIM, CYAN, GREEN, YELLOW, RED, writeln, enc,
} from "./chat_ansi.ts";
import { truncate, extractLeadToolArgument, formatBytes } from "./chat_format.ts";

/** Event callback type matching orchestrator. */
export type EventCallback = (event: OrchestratorEvent) => void;

/** Check whether a tool name is a todo tool. */
export function isTodoTool(name: string): boolean {
  return name === "todo_read" || name === "todo_write";
}

/** Check whether a tool name is plan_exit (requires full display). */
export function isPlanExitTool(name: string): boolean {
  return name === "plan_exit";
}

/** Human-readable display names for known tools. */
const TOOL_DISPLAY_NAMES: Readonly<Record<string, string>> = {
  web_search: "Web Search",
  web_fetch: "Fetch",
  read_file: "Read",
  write_file: "Write",
  list_directory: "List",
  run_command: "Run",
};

/** Render a tool call with its arguments in a box-drawn block. */
export function renderToolCall(
  name: string,
  args: Record<string, unknown>,
): void {
  writeln(`  ${YELLOW}\u250c\u2500${RESET} ${BOLD}${name}${RESET}`);
  for (const [key, value] of Object.entries(args)) {
    const display = typeof value === "string"
      ? truncate(value, 60)
      : JSON.stringify(value);
    writeln(`  ${YELLOW}\u2502${RESET}  ${DIM}${key}:${RESET} ${display}`);
  }
}

/** Render a tool result with a truncated preview. */
export function renderToolResult(
  _name: string,
  result: string,
  blocked: boolean,
): void {
  if (blocked) {
    writeln(`  ${YELLOW}\u2514\u2500${RESET} ${RED}\u2717 blocked by policy${RESET}`);
  } else {
    // Show byte count for long results
    const byteLen = enc.encode(result).length;
    const preview = truncate(result, 80);
    if (byteLen > 120) {
      writeln(
        `  ${YELLOW}\u2514\u2500${RESET} ${GREEN}\u2713${RESET} ${DIM}${byteLen} bytes${RESET} ${DIM}${preview}${RESET}`,
      );
    } else {
      writeln(`  ${YELLOW}\u2514\u2500${RESET} ${GREEN}\u2713${RESET} ${DIM}${preview}${RESET}`);
    }
  }
  writeln();
}

/**
 * Format a compact one-line tool call + result.
 *
 * Example: `  ⚡ list_directory .  ✓  12 entries`
 */
export function formatToolCallCompact(
  name: string,
  args: Record<string, unknown>,
  result: string,
  blocked: boolean,
): string {
  const primary = extractLeadToolArgument(args);
  const argStr = primary.length > 0 ? ` ${DIM}${primary}${RESET}` : "";

  if (blocked) {
    return `  ${YELLOW}\u26a1${RESET} ${name}${argStr}  ${RED}\u2717${RESET} ${DIM}blocked${RESET}`;
  }

  const byteLen = enc.encode(result).length;
  const brief = truncate(result, 40);
  const info = byteLen > 200
    ? `${formatBytes(byteLen)} ${DIM}${brief}${RESET}`
    : `${DIM}${brief}${RESET}`;

  return `  ${YELLOW}\u26a1${RESET} ${name}${argStr}  ${GREEN}\u2713${RESET}  ${info}`;
}

/**
 * Format an expanded tool call block (box-drawn).
 */
export function formatToolCallExpanded(
  name: string,
  args: Record<string, unknown>,
): string {
  const lines: string[] = [];
  lines.push(`  ${YELLOW}\u250c\u2500${RESET} ${BOLD}${name}${RESET}`);
  for (const [key, value] of Object.entries(args)) {
    const display = typeof value === "string"
      ? truncate(value, 60)
      : JSON.stringify(value);
    lines.push(`  ${YELLOW}\u2502${RESET}  ${DIM}${key}:${RESET} ${display}`);
  }
  return lines.join("\n");
}

/**
 * Format an expanded tool result block.
 */
export function formatToolResultExpanded(
  result: string,
  blocked: boolean,
): string {
  if (blocked) {
    return `  ${YELLOW}\u2514\u2500${RESET} ${RED}\u2717 blocked by policy${RESET}\n`;
  }
  const byteLen = enc.encode(result).length;
  const preview = truncate(result, 80);
  if (byteLen > 120) {
    return `  ${YELLOW}\u2514\u2500${RESET} ${GREEN}\u2713${RESET} ${DIM}${byteLen} bytes${RESET} ${DIM}${preview}${RESET}\n`;
  }
  return `  ${YELLOW}\u2514\u2500${RESET} ${GREEN}\u2713${RESET} ${DIM}${preview}${RESET}\n`;
}

/**
 * Format result metadata for the bullet display style.
 * Each tool type gets a human-readable summary line.
 */
function formatResultMeta(name: string, result: string): string {
  if (name === "web_search") {
    const count = (result.match(/^\d+\.\s/gm) ?? []).length;
    return count > 0 ? `${count} result${count !== 1 ? "s" : ""}` : "no results";
  }
  if (name === "web_fetch") {
    const byteLen = enc.encode(result).length;
    return `Received ${formatBytes(byteLen)}`;
  }
  if (name === "read_file") {
    if (result.startsWith("Error")) return truncate(result, 60);
    const lineCount = result.split("\n").length;
    return `${lineCount} line${lineCount !== 1 ? "s" : ""}`;
  }
  // Generic: byte count for large results, truncated preview for small
  const byteLen = enc.encode(result).length;
  if (byteLen > 200) return formatBytes(byteLen);
  return truncate(result, 50);
}

/**
 * Format a tool call + result in the bullet compact style.
 *
 * Examples:
 *   ● Web Search("query")
 *   │  5 results
 *
 *   ● Fetch(https://example.com/...)
 *   │  Received 166.1KB
 */
export function formatToolCompact(
  name: string,
  args: Record<string, unknown>,
  result: string,
  blocked: boolean,
): string {
  const displayName = TOOL_DISPLAY_NAMES[name] ?? name;
  const primary = extractLeadToolArgument(args);
  const argStr = primary.length > 0
    ? (name === "web_search" ? `${DIM}("${truncate(primary, 60)}")${RESET}` : `${DIM}(${truncate(primary, 60)})${RESET}`)
    : "";

  if (blocked) {
    return `  ${RED}\u25cf${RESET} ${BOLD}${displayName}${RESET}${argStr}\n  ${DIM}\u2502${RESET}  ${RED}blocked${RESET}`;
  }

  const meta = formatResultMeta(name, result);
  return `  ${CYAN}\u25cf${RESET} ${BOLD}${displayName}${RESET}${argStr}\n  ${DIM}\u2502${RESET}  ${DIM}${meta}${RESET}`;
}

/**
 * Format plan markdown for terminal display with ANSI colors.
 *
 * Extracts the markdown portion from a plan_exit tool result
 * (after the JSON + "---" separator) and applies ANSI formatting.
 */
export function formatPlanMarkdown(result: string): string {
  // Extract markdown after the JSON + --- separator
  const separator = "\n\n---\n\n";
  const sepIdx = result.indexOf(separator);
  const markdown = sepIdx >= 0 ? result.slice(sepIdx + separator.length) : result;

  const lines: string[] = [""];
  for (const line of markdown.split("\n")) {
    if (line.startsWith("# ")) {
      lines.push(`  ${CYAN}${BOLD}${line.slice(2)}${RESET}`);
    } else if (line.startsWith("## ")) {
      lines.push(`  ${YELLOW}${BOLD}${line.slice(3)}${RESET}`);
    } else if (line.startsWith("### ")) {
      lines.push(`  ${BOLD}${line.slice(4)}${RESET}`);
    } else if (line.startsWith("- [ ] ")) {
      lines.push(`  ${DIM}\u2610${RESET}  ${line.slice(6)}`);
    } else if (line.startsWith("- [x] ")) {
      lines.push(`  ${GREEN}\u2611${RESET}  ${DIM}${line.slice(6)}${RESET}`);
    } else if (line.startsWith("- ")) {
      lines.push(`  ${DIM}\u2022${RESET} ${line.slice(2)}`);
    } else if (line.startsWith("**Status:**")) {
      lines.push(`  ${YELLOW}${line}${RESET}`);
    } else {
      lines.push(`  ${line}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}
