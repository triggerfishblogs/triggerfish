/**
 * Rich terminal UI for the Triggerfish chat interface.
 *
 * Provides ASCII art banner, animated spinner, and formatted
 * rendering for tool calls, results, and responses with ANSI colors.
 *
 * @module
 */

import type { OrchestratorEvent } from "../agent/orchestrator.ts";

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
    `  ${DIM}Commands :${RESET} ${DIM}/quit${RESET} exit  ${DIM}/clear${RESET} reset history`,
  );
  writeln();
  writeln(`  ${DIM}${"─".repeat(50)}${RESET}`);
  writeln();
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
  name: string,
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

/** Render the assistant's final response. */
export function renderResponse(text: string): void {
  writeln(`  ${GREEN}${BOLD}triggerfish${RESET}`);
  writeln();
  for (const line of text.split("\n")) {
    writeln(`  ${line}`);
  }
  writeln();
}

/** Render an error message. */
export function renderError(text: string): void {
  writeln(`  ${RED}${BOLD}error${RESET} ${text}`);
  writeln();
}

/** Write the user input prompt. */
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
 */
export function createEventHandler(): EventCallback {
  let spinner: Spinner | null = null;

  return (event: OrchestratorEvent) => {
    switch (event.type) {
      case "llm_start":
        spinner = createSpinner(
          event.iteration === 1
            ? "Thinking…"
            : `Thinking… (step ${event.iteration})`,
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
