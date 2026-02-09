/**
 * Rich terminal UI for the Triggerfish chat interface.
 *
 * Provides ASCII art banner, animated spinner, and formatted
 * rendering for tool calls, results, and responses with ANSI colors.
 *
 * Supports two display modes:
 * - **compact** (default): one line per tool call+result
 * - **expanded**: full box-drawn display with all args and result preview
 *
 * Toggle with Ctrl+O.
 *
 * @module
 */

import type { OrchestratorEvent } from "../agent/orchestrator.ts";
import type { ScreenManager } from "./screen.ts";

// ─── ANSI escape codes ─────────────────────────────────────────

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const BLUE = "\x1b[34m";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

const enc = new TextEncoder();

/** Write raw text to stdout synchronously (no newline). */
function write(text: string): void {
  Deno.stdout.writeSync(enc.encode(text));
}

/** Write text with newline to stdout synchronously. */
function writeln(text: string = ""): void {
  Deno.stdout.writeSync(enc.encode(text + "\n"));
}

// ─── Tool display mode ─────────────────────────────────────────

/** Tool display verbosity level. */
export type ToolDisplayMode = "compact" | "expanded";

// ─── Banner ─────────────────────────────────────────────────────

/** Print the Triggerfish ASCII art banner with session info. */
export function printBanner(
  provider: string,
  model: string,
  workspace: string,
): void {
  writeln();
  writeln(
    `  ${CYAN}${BOLD}╭──────────────────────────────────────────────────╮${RESET}`,
  );
  writeln(
    `  ${CYAN}${BOLD}│${RESET}                                                  ${CYAN}${BOLD}│${RESET}`,
  );
  writeln(
    `  ${CYAN}${BOLD}│${RESET}   ${BLUE}${BOLD}▀█▀ █▀▄ █ █▀▀ █▀▀ █▀▀ █▀▄ █▀▀ █ █▀▀ █ █${RESET}    ${CYAN}${BOLD}│${RESET}`,
  );
  writeln(
    `  ${CYAN}${BOLD}│${RESET}   ${BLUE}${BOLD} █  █▀▄ █ █ █ █ █ █▀▀ █▀▄ █▀  █ ▀▀█ █▀█${RESET}    ${CYAN}${BOLD}│${RESET}`,
  );
  writeln(
    `  ${CYAN}${BOLD}│${RESET}   ${BLUE}${BOLD} █  ▀ ▀ ▀ ▀▀▀ ▀▀▀ ▀▀▀ ▀ ▀ ▀   ▀ ▀▀▀ ▀ ▀${RESET}    ${CYAN}${BOLD}│${RESET}`,
  );
  writeln(
    `  ${CYAN}${BOLD}│${RESET}                                                  ${CYAN}${BOLD}│${RESET}`,
  );
  writeln(
    `  ${CYAN}${BOLD}│${RESET}   ${DIM}Secure Multi-Channel AI Agent   v0.1.0-alpha${RESET}   ${CYAN}${BOLD}│${RESET}`,
  );
  writeln(
    `  ${CYAN}${BOLD}│${RESET}                                                  ${CYAN}${BOLD}│${RESET}`,
  );
  writeln(
    `  ${CYAN}${BOLD}╰──────────────────────────────────────────────────╯${RESET}`,
  );
  writeln();
  writeln(`  ${DIM}Provider :${RESET} ${provider} ${DIM}(${model})${RESET}`);
  writeln(`  ${DIM}Workspace:${RESET} ${workspace}`);
  writeln(
    `  ${DIM}Commands :${RESET} ${DIM}/quit${RESET} exit  ${DIM}/clear${RESET} reset  ${DIM}Ctrl+O${RESET} tool detail  ${DIM}ESC${RESET} interrupt`,
  );
  writeln();
  writeln(`  ${DIM}${"─".repeat(50)}${RESET}`);
  writeln();
}

/** Return the banner as a string (for screen manager output). */
export function formatBanner(
  provider: string,
  model: string,
  workspace: string,
): string {
  const lines: string[] = [];
  lines.push("");
  lines.push(
    `  ${CYAN}${BOLD}╭──────────────────────────────────────────────────╮${RESET}`,
  );
  lines.push(
    `  ${CYAN}${BOLD}│${RESET}                                                  ${CYAN}${BOLD}│${RESET}`,
  );
  lines.push(
    `  ${CYAN}${BOLD}│${RESET}   ${BLUE}${BOLD}▀█▀ █▀▄ █ █▀▀ █▀▀ █▀▀ █▀▄ █▀▀ █ █▀▀ █ █${RESET}    ${CYAN}${BOLD}│${RESET}`,
  );
  lines.push(
    `  ${CYAN}${BOLD}│${RESET}   ${BLUE}${BOLD} █  █▀▄ █ █ █ █ █ █▀▀ █▀▄ █▀  █ ▀▀█ █▀█${RESET}    ${CYAN}${BOLD}│${RESET}`,
  );
  lines.push(
    `  ${CYAN}${BOLD}│${RESET}   ${BLUE}${BOLD} █  ▀ ▀ ▀ ▀▀▀ ▀▀▀ ▀▀▀ ▀ ▀ ▀   ▀ ▀▀▀ ▀ ▀${RESET}    ${CYAN}${BOLD}│${RESET}`,
  );
  lines.push(
    `  ${CYAN}${BOLD}│${RESET}                                                  ${CYAN}${BOLD}│${RESET}`,
  );
  lines.push(
    `  ${CYAN}${BOLD}│${RESET}   ${DIM}Secure Multi-Channel AI Agent   v0.1.0-alpha${RESET}   ${CYAN}${BOLD}│${RESET}`,
  );
  lines.push(
    `  ${CYAN}${BOLD}│${RESET}                                                  ${CYAN}${BOLD}│${RESET}`,
  );
  lines.push(
    `  ${CYAN}${BOLD}╰──────────────────────────────────────────────────╯${RESET}`,
  );
  lines.push("");
  lines.push(`  ${DIM}Provider :${RESET} ${provider} ${DIM}(${model})${RESET}`);
  lines.push(`  ${DIM}Workspace:${RESET} ${workspace}`);
  lines.push(
    `  ${DIM}Commands :${RESET} ${DIM}/quit${RESET} exit  ${DIM}/clear${RESET} reset  ${DIM}Ctrl+O${RESET} tool detail  ${DIM}ESC${RESET} interrupt`,
  );
  lines.push("");
  lines.push(`  ${DIM}${"─".repeat(50)}${RESET}`);
  lines.push("");
  return lines.join("\n");
}

// ─── Spinner ────────────────────────────────────────────────────

/** An animated terminal spinner. */
export interface Spinner {
  /** Update the spinner label text. */
  update(label: string): void;
  /** Stop and clear the spinner line. */
  stop(): void;
}

/** Create an animated spinner that displays a label. */
export function createSpinner(label: string): Spinner {
  let currentLabel = label;
  let frame = 0;

  const render = () => {
    const ch = SPINNER_FRAMES[frame % SPINNER_FRAMES.length];
    write(`\r\x1b[K  ${CYAN}${ch}${RESET} ${DIM}${currentLabel}${RESET}`);
    frame++;
  };

  render();
  const id = setInterval(render, 80);

  return {
    update(newLabel: string) {
      currentLabel = newLabel;
    },
    stop() {
      clearInterval(id);
      write("\r\x1b[K");
    },
  };
}

// ─── Rendering helpers ──────────────────────────────────────────

/** Truncate text for compact preview display. */
function truncate(text: string, max: number): string {
  const oneLine = text.replace(/\n/g, " ↵ ").replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return oneLine.slice(0, max) + "…";
}

/** Get the primary argument value from a tool call for compact display. */
function getPrimaryArg(args: Record<string, unknown>): string {
  const values = Object.values(args);
  if (values.length === 0) return "";
  const first = values[0];
  const str = typeof first === "string" ? first : JSON.stringify(first);
  return truncate(str, 50);
}

/** Format a human-readable byte size. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}b`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}kb`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}mb`;
}

/** Render a tool call with its arguments in a box-drawn block. */
export function renderToolCall(
  name: string,
  args: Record<string, unknown>,
): void {
  writeln(`  ${YELLOW}┌─${RESET} ${BOLD}${name}${RESET}`);
  for (const [key, value] of Object.entries(args)) {
    const display = typeof value === "string"
      ? truncate(value, 60)
      : JSON.stringify(value);
    writeln(`  ${YELLOW}│${RESET}  ${DIM}${key}:${RESET} ${display}`);
  }
}

/** Render a tool result with a truncated preview. */
export function renderToolResult(
  _name: string,
  result: string,
  blocked: boolean,
): void {
  if (blocked) {
    writeln(`  ${YELLOW}└─${RESET} ${RED}✗ blocked by policy${RESET}`);
  } else {
    // Show byte count for long results
    const byteLen = new TextEncoder().encode(result).length;
    const preview = truncate(result, 80);
    if (byteLen > 120) {
      writeln(
        `  ${YELLOW}└─${RESET} ${GREEN}✓${RESET} ${DIM}${byteLen} bytes${RESET} ${DIM}${preview}${RESET}`,
      );
    } else {
      writeln(`  ${YELLOW}└─${RESET} ${GREEN}✓${RESET} ${DIM}${preview}${RESET}`);
    }
  }
  writeln();
}

/**
 * Format a compact one-line tool call + result.
 *
 * Example: `  ⚡ list_directory .  ✓  12 entries`
 *
 * @param name - Tool name
 * @param args - Tool call arguments
 * @param result - Tool result text
 * @param blocked - Whether the tool was blocked by policy
 * @returns Formatted string
 */
export function formatToolCallCompact(
  name: string,
  args: Record<string, unknown>,
  result: string,
  blocked: boolean,
): string {
  const primary = getPrimaryArg(args);
  const argStr = primary.length > 0 ? ` ${DIM}${primary}${RESET}` : "";

  if (blocked) {
    return `  ${YELLOW}⚡${RESET} ${name}${argStr}  ${RED}✗${RESET} ${DIM}blocked${RESET}`;
  }

  const byteLen = new TextEncoder().encode(result).length;
  const brief = truncate(result, 40);
  const info = byteLen > 200
    ? `${formatBytes(byteLen)} ${DIM}${brief}${RESET}`
    : `${DIM}${brief}${RESET}`;

  return `  ${YELLOW}⚡${RESET} ${name}${argStr}  ${GREEN}✓${RESET}  ${info}`;
}

/**
 * Format an expanded tool call block (box-drawn).
 *
 * @param name - Tool name
 * @param args - Tool call arguments
 * @returns Formatted multi-line string
 */
export function formatToolCallExpanded(
  name: string,
  args: Record<string, unknown>,
): string {
  const lines: string[] = [];
  lines.push(`  ${YELLOW}┌─${RESET} ${BOLD}${name}${RESET}`);
  for (const [key, value] of Object.entries(args)) {
    const display = typeof value === "string"
      ? truncate(value, 60)
      : JSON.stringify(value);
    lines.push(`  ${YELLOW}│${RESET}  ${DIM}${key}:${RESET} ${display}`);
  }
  return lines.join("\n");
}

/**
 * Format an expanded tool result block.
 *
 * @param result - Tool result text
 * @param blocked - Whether the tool was blocked
 * @returns Formatted string
 */
export function formatToolResultExpanded(
  result: string,
  blocked: boolean,
): string {
  if (blocked) {
    return `  ${YELLOW}└─${RESET} ${RED}✗ blocked by policy${RESET}\n`;
  }
  const byteLen = new TextEncoder().encode(result).length;
  const preview = truncate(result, 80);
  if (byteLen > 120) {
    return `  ${YELLOW}└─${RESET} ${GREEN}✓${RESET} ${DIM}${byteLen} bytes${RESET} ${DIM}${preview}${RESET}\n`;
  }
  return `  ${YELLOW}└─${RESET} ${GREEN}✓${RESET} ${DIM}${preview}${RESET}\n`;
}

/** Render the assistant's final response. */
export function renderResponse(text: string): void {
  writeln(`  ${GREEN}${BOLD}triggerfish${RESET}`);
  writeln();
  for (const line of text.split("\n")) {
    writeln(`  ${line}`);
  }
  writeln();
}

/** Format the assistant's response as a string. */
export function formatResponse(text: string): string {
  const lines: string[] = [];
  lines.push(`  ${GREEN}${BOLD}triggerfish${RESET}`);
  lines.push("");
  for (const line of text.split("\n")) {
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
  write(`  ${CYAN}${BOLD}❯${RESET} `);
}

// ─── Event handler ──────────────────────────────────────────────

/** Event callback type matching orchestrator. */
export type EventCallback = (event: OrchestratorEvent) => void;

/**
 * Create a UI event handler that renders orchestrator events
 * to the terminal in real time.
 *
 * Manages the spinner lifecycle and renders tool calls,
 * results, and the final response as they happen.
 *
 * This is the legacy event handler that writes directly to stdout.
 * For screen-manager-aware rendering, use createScreenEventHandler().
 */
export function createEventHandler(): EventCallback {
  let spinner: Spinner | null = null;

  return (event: OrchestratorEvent) => {
    switch (event.type) {
      case "llm_start":
        spinner = createSpinner(
          event.iteration === 1
            ? "Thinking…"
            : `Thinking… (step ${event.iteration}/${event.maxIterations})`,
        );
        break;

      case "llm_complete":
        if (spinner) {
          spinner.stop();
          spinner = null;
        }
        break;

      case "tool_call":
        renderToolCall(event.name, event.args);
        break;

      case "tool_result":
        renderToolResult(event.name, event.result, event.blocked);
        break;

      case "response":
        renderResponse(event.text);
        break;
    }
  };
}

/**
 * Create a screen-manager-aware event handler.
 *
 * Routes all output through the ScreenManager and supports
 * compact/expanded tool display modes toggled by Ctrl+O.
 *
 * @param screen - Screen manager for output routing
 * @param getDisplayMode - Function returning current display mode
 * @returns An event callback
 */
export function createScreenEventHandler(
  screen: ScreenManager,
  getDisplayMode: () => ToolDisplayMode,
): EventCallback {
  let spinner: Spinner | null = null;
  let pendingToolCall: { name: string; args: Record<string, unknown> } | null =
    null;

  return (event: OrchestratorEvent) => {
    switch (event.type) {
      case "llm_start":
        if (screen.isTty) {
          screen.setStatus(
            event.iteration === 1
              ? "Thinking…"
              : `Thinking… (step ${event.iteration}/${event.maxIterations})`,
          );
        } else {
          spinner = createSpinner(
            event.iteration === 1
              ? "Thinking…"
              : `Thinking… (step ${event.iteration}/${event.maxIterations})`,
          );
        }
        break;

      case "llm_complete":
        if (screen.isTty) {
          screen.clearStatus();
        } else if (spinner) {
          spinner.stop();
          spinner = null;
        }
        break;

      case "tool_call":
        if (getDisplayMode() === "compact") {
          // Buffer the tool call — render when result arrives
          pendingToolCall = { name: event.name, args: event.args };
        } else {
          screen.writeOutput(formatToolCallExpanded(event.name, event.args));
        }
        break;

      case "tool_result":
        if (getDisplayMode() === "compact" && pendingToolCall) {
          screen.writeOutput(
            formatToolCallCompact(
              pendingToolCall.name,
              pendingToolCall.args,
              event.result,
              event.blocked,
            ),
          );
          pendingToolCall = null;
        } else {
          screen.writeOutput(
            formatToolResultExpanded(event.result, event.blocked),
          );
        }
        break;

      case "response":
        screen.writeOutput(formatResponse(event.text));
        break;
    }
  };
}
