/**
 * Rich terminal UI for the Triggerfish chat interface.
 *
 * Provides ASCII art banner, animated spinner, and formatted
 * rendering for tool calls, results, and responses with ANSI colors.
 *
 * Supports two display modes toggled with Ctrl+O:
 * - **compact** (default): one-line tool summaries, thinking hidden (spinner runs)
 * - **expanded**: full box-drawn tool display, thinking content streamed dimmed
 *
 * @module
 */

import type { OrchestratorEvent } from "../agent/orchestrator.ts";
import type { ScreenManager } from "./screen.ts";
import { extractTodosFromEvent, formatTodoListAnsi } from "../tools/todo.ts";
import { VERSION } from "./version.ts";

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
    `  ${CYAN}${BOLD}│${RESET}   ${BLUE}${BOLD}▀█▀ █▀▄ █ █▀▀ █▀▀ █▀▀ █▀▄ █▀▀ █ █▀▀ █ █${RESET}        ${CYAN}${BOLD}│${RESET}`,
  );
  writeln(
    `  ${CYAN}${BOLD}│${RESET}   ${BLUE}${BOLD} █  █▀▄ █ █ █ █ █ █▀▀ █▀▄ █▀  █ ▀▀█ █▀█${RESET}        ${CYAN}${BOLD}│${RESET}`,
  );
  writeln(
    `  ${CYAN}${BOLD}│${RESET}   ${BLUE}${BOLD} █  ▀ ▀ ▀ ▀▀▀ ▀▀▀ ▀▀▀ ▀ ▀ ▀   ▀ ▀▀▀ ▀ ▀${RESET}        ${CYAN}${BOLD}│${RESET}`,
  );
  writeln(
    `  ${CYAN}${BOLD}│${RESET}                                                  ${CYAN}${BOLD}│${RESET}`,
  );
  const tagline = `Secure Multi-Channel AI Agent  ${VERSION}`;
  const tagPad = " ".repeat(Math.max(0, 47 - tagline.length));
  writeln(
    `  ${CYAN}${BOLD}│${RESET}   ${DIM}${tagline}${RESET}${tagPad}${CYAN}${BOLD}│${RESET}`,
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
    `  ${CYAN}${BOLD}│${RESET}   ${BLUE}${BOLD}▀█▀ █▀▄ █ █▀▀ █▀▀ █▀▀ █▀▄ █▀▀ █ █▀▀ █ █${RESET}        ${CYAN}${BOLD}│${RESET}`,
  );
  lines.push(
    `  ${CYAN}${BOLD}│${RESET}   ${BLUE}${BOLD} █  █▀▄ █ █ █ █ █ █▀▀ █▀▄ █▀  █ ▀▀█ █▀█${RESET}        ${CYAN}${BOLD}│${RESET}`,
  );
  lines.push(
    `  ${CYAN}${BOLD}│${RESET}   ${BLUE}${BOLD} █  ▀ ▀ ▀ ▀▀▀ ▀▀▀ ▀▀▀ ▀ ▀ ▀   ▀ ▀▀▀ ▀ ▀${RESET}        ${CYAN}${BOLD}│${RESET}`,
  );
  lines.push(
    `  ${CYAN}${BOLD}│${RESET}                                                  ${CYAN}${BOLD}│${RESET}`,
  );
  const tagline = `Secure Multi-Channel AI Agent  ${VERSION}`;
  const tagPad = " ".repeat(Math.max(0, 47 - tagline.length));
  lines.push(
    `  ${CYAN}${BOLD}│${RESET}   ${DIM}${tagline}${RESET}${tagPad}${CYAN}${BOLD}│${RESET}`,
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
    write(`\r\x1b[K ${CYAN}${ch}${RESET} ${DIM}${currentLabel}${RESET}`);
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

/** Hide `<think>`/`<thinking>` blocks from display text. */
function hideThinkingBlocks(text: string): string {
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
  const display = hideThinkingBlocks(text);
  writeln(`  ${GREEN}${BOLD}triggerfish${RESET}`);
  writeln();
  for (const line of display.split("\n")) {
    writeln(`  ${line}`);
  }
  writeln();
}

/** Format the assistant's response as a string. */
export function formatResponse(text: string): string {
  const display = hideThinkingBlocks(text);
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
  write(` ${CYAN}${BOLD}❯${RESET} `);
}

// ─── Event handler ──────────────────────────────────────────────

/** Event callback type matching orchestrator. */
export type EventCallback = (event: OrchestratorEvent) => void;

/** Check whether a tool name is a todo tool. */
function isTodoTool(name: string): boolean {
  return name === "todo_read" || name === "todo_write";
}

/** Check whether a tool name is plan_exit (requires full display). */
function isPlanExitTool(name: string): boolean {
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

/**
 * Format result metadata for the ● display style.
 * Each tool type gets a human-readable summary line.
 */
function formatResultMeta(name: string, result: string): string {
  if (name === "web_search") {
    const count = (result.match(/^\d+\.\s/gm) ?? []).length;
    return count > 0 ? `${count} result${count !== 1 ? "s" : ""}` : "no results";
  }
  if (name === "web_fetch") {
    const byteLen = new TextEncoder().encode(result).length;
    return `Received ${formatBytes(byteLen)}`;
  }
  if (name === "read_file") {
    if (result.startsWith("Error")) return truncate(result, 60);
    const lineCount = result.split("\n").length;
    return `${lineCount} line${lineCount !== 1 ? "s" : ""}`;
  }
  // Generic: byte count for large results, truncated preview for small
  const byteLen = new TextEncoder().encode(result).length;
  if (byteLen > 200) return formatBytes(byteLen);
  return truncate(result, 50);
}

/**
 * Format a tool call + result in the ● compact style.
 *
 * Examples:
 *   ● Web Search("query")
 *   │  5 results
 *
 *   ● Fetch(https://example.com/...)
 *   │  Received 166.1KB
 *
 *   ● Read(/workspace/file.txt)
 *   │  42 lines
 */
export function formatToolCompact(
  name: string,
  args: Record<string, unknown>,
  result: string,
  blocked: boolean,
): string {
  const displayName = TOOL_DISPLAY_NAMES[name] ?? name;
  const primary = getPrimaryArg(args);
  const argStr = primary.length > 0
    ? (name === "web_search" ? `${DIM}("${truncate(primary, 60)}")${RESET}` : `${DIM}(${truncate(primary, 60)})${RESET}`)
    : "";

  if (blocked) {
    return `  ${RED}●${RESET} ${BOLD}${displayName}${RESET}${argStr}\n  ${DIM}│${RESET}  ${RED}blocked${RESET}`;
  }

  const meta = formatResultMeta(name, result);
  return `  ${CYAN}●${RESET} ${BOLD}${displayName}${RESET}${argStr}\n  ${DIM}│${RESET}  ${DIM}${meta}${RESET}`;
}

/**
 * Format plan markdown for terminal display with ANSI colors.
 *
 * Extracts the markdown portion from a plan_exit tool result
 * (after the JSON + "---" separator) and applies ANSI formatting.
 */
function formatPlanMarkdown(result: string): string {
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
      lines.push(`  ${DIM}☐${RESET}  ${line.slice(6)}`);
    } else if (line.startsWith("- [x] ")) {
      lines.push(`  ${GREEN}☑${RESET}  ${DIM}${line.slice(6)}${RESET}`);
    } else if (line.startsWith("- ")) {
      lines.push(`  ${DIM}•${RESET} ${line.slice(2)}`);
    } else if (line.startsWith("**Status:**")) {
      lines.push(`  ${YELLOW}${line}${RESET}`);
    } else {
      lines.push(`  ${line}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

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
  let pendingTodoArgs: Record<string, unknown> | null = null;
  let pendingTool: { name: string; args: Record<string, unknown> } | null =
    null;

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
        if (isTodoTool(event.name)) {
          pendingTodoArgs = event.args;
        } else {
          // Buffer all tool calls — render with ● style when result arrives
          pendingTool = { name: event.name, args: event.args };
        }
        break;

      case "tool_result":
        if (isTodoTool(event.name)) {
          const todos = extractTodosFromEvent(event.name, {
            args: pendingTodoArgs ?? undefined,
            result: event.result,
          });
          pendingTodoArgs = null;
          if (todos) {
            writeln(formatTodoListAnsi(todos));
            writeln();
          }
        } else if (pendingTool) {
          writeln(
            formatToolCompact(
              pendingTool.name,
              pendingTool.args,
              event.result,
              event.blocked,
            ),
          );
          pendingTool = null;
        } else {
          renderToolResult(event.name, event.result, event.blocked);
        }
        break;

      case "vision_start":
        spinner = createSpinner(
          event.imageCount === 1
            ? "Analyzing image…"
            : `Analyzing ${event.imageCount} images…`,
        );
        break;

      case "vision_complete":
        if (spinner) {
          spinner.stop();
          spinner = null;
        }
        break;

      case "response":
        renderResponse(event.text);
        break;
    }
  };
}

// ─── Stream content filter (thinking tags) ─────────────────────

/**
 * Filter states:
 * - `buffering`        — Accumulating initial output before displaying.
 * - `suppressing`      — Inside a `<think>` block.
 * - `normal`           — Streaming visible text.
 * - `in_tag`           — Inside a `<` tag (detecting think tags).
 */
type ThinkFilterState =
  | "buffering"
  | "suppressing"
  | "normal"
  | "in_tag";

/** Result from the stream filter for a single chunk. */
interface ThinkFilterResult {
  /** Non-thinking response text to display. */
  readonly visible: string;
  /** Thinking content (for expanded display). */
  readonly thinking: string;
  /** Just transitioned into a think block. */
  readonly enteredThinking: boolean;
  /** Just transitioned out of a think block. */
  readonly exitedThinking: boolean;
}

/** Incremental stream filter for thinking tags. */
interface ThinkingFilter {
  /** Process a chunk of text, separating visible and thinking content. */
  filter(text: string): ThinkFilterResult;
  /** Reset the filter state (e.g. between streaming sessions). */
  reset(): void;
  /** Whether the filter is currently inside a thinking block. */
  readonly isThinking: boolean;
}

/**
 * Max chars to buffer before giving up on detecting thinking.
 * Covers models that output thinking content without `<think>` opening
 * tags. For non-thinking models, this adds ~1-2s latency before text
 * appears (the spinner runs during this time, so UX is fine).
 */
const THINK_BUFFER_MAX = 1500;

/** Regex to match `<think>` or `<thinking>` opening tags. */
const OPEN_TAG_RE = /<think(?:ing)?>/i;

/** Regex to match `</think>` or `</thinking>` closing tags. */
const CLOSE_TAG_RE = /<\/think(?:ing)?>/i;

/** Create a stream filter for thinking tags. */
function createThinkingFilter(): ThinkingFilter {
  let state: ThinkFilterState = "buffering";
  let pendingBuffer = "";
  // For character-by-character processing:
  let tagBuffer = "";       // accumulates `<...>` tags
  let closeBuffer = "";     // sliding buffer for `</think>` detection

  /**
   * Resolve the pending buffer. Checks for think tags and returns the
   * appropriate result. Transitions state out of `buffering`.
   */
  function resolveBuffer(extra: string): ThinkFilterResult {
    const buf = pendingBuffer + extra;
    pendingBuffer = "";

    // Case 1: `<think>...content...</think>rest` — standard think tags
    const openMatch = buf.match(OPEN_TAG_RE);
    if (openMatch) {
      const preOpen = buf.slice(0, openMatch.index!);
      const afterOpen = buf.slice(openMatch.index! + openMatch[0].length);
      const closeMatch = afterOpen.match(CLOSE_TAG_RE);
      if (closeMatch) {
        const thinkContent = afterOpen.slice(0, closeMatch.index!);
        const afterClose = afterOpen.slice(closeMatch.index! + closeMatch[0].length);
        state = "normal";
        return {
          visible: preOpen + afterClose,
          thinking: thinkContent,
          enteredThinking: true,
          exitedThinking: true,
        };
      }
      state = "suppressing";
      closeBuffer = "";
      return {
        visible: preOpen,
        thinking: afterOpen,
        enteredThinking: true,
        exitedThinking: false,
      };
    }

    // Case 2: No `<think>` but `</think>` present — bare closing tag.
    const closeMatch = buf.match(CLOSE_TAG_RE);
    if (closeMatch) {
      const thinkContent = buf.slice(0, closeMatch.index!);
      const afterClose = buf.slice(closeMatch.index! + closeMatch[0].length);
      state = "normal";
      return {
        visible: afterClose,
        thinking: thinkContent,
        enteredThinking: true,
        exitedThinking: true,
      };
    }

    // Case 3: No think tags — flush as visible.
    state = "normal";
    return {
      visible: buf,
      thinking: "",
      enteredThinking: false,
      exitedThinking: false,
    };
  }

  const self: ThinkingFilter = {
    get isThinking(): boolean {
      return state === "suppressing" || state === "buffering";
    },

    filter(text: string): ThinkFilterResult {
      // ── Buffering phase: accumulate and check for tags ──
      if (state === "buffering") {
        pendingBuffer += text;

        // Check for think tags
        if (CLOSE_TAG_RE.test(pendingBuffer) || OPEN_TAG_RE.test(pendingBuffer)) {
          return resolveBuffer("");
        }

        // Buffer not resolved yet — check threshold
        if (pendingBuffer.length >= THINK_BUFFER_MAX) {
          return resolveBuffer("");
        }

        // Still buffering
        return { visible: "", thinking: "", enteredThinking: false, exitedThinking: false };
      }

      // ── Character-by-character processing ──
      let visible = "";
      let thinking = "";
      let entered = false;
      let exited = false;

      for (const ch of text) {
        switch (state) {
          case "normal":
            if (ch === "<") {
              state = "in_tag";
              tagBuffer = "<";
            } else {
              visible += ch;
            }
            break;

          case "in_tag":
            tagBuffer += ch;
            if (ch === ">") {
              if (/^<think(?:ing)?>$/i.test(tagBuffer)) {
                state = "suppressing";
                entered = true;
                tagBuffer = "";
                closeBuffer = "";
              } else if (/^<\/think(?:ing)?>$/i.test(tagBuffer)) {
                tagBuffer = "";
                state = "normal";
              } else {
                visible += tagBuffer;
                tagBuffer = "";
                state = "normal";
              }
            } else if (tagBuffer.length > 12) {
              visible += tagBuffer;
              tagBuffer = "";
              state = "normal";
            }
            break;

          case "suppressing": {
            thinking += ch;
            closeBuffer += ch;
            if (closeBuffer.length > 12) {
              closeBuffer = closeBuffer.slice(-12);
            }
            if (ch === ">" && /<\/think(?:ing)?>$/i.test(closeBuffer)) {
              exited = true;
              const match = closeBuffer.match(/<\/think(?:ing)?>$/i);
              if (match) {
                thinking = thinking.slice(0, -match[0].length);
              }
              state = "normal";
              closeBuffer = "";
            }
            break;
          }

          default:
            break;
        }
      }
      return { visible, thinking, enteredThinking: entered, exitedThinking: exited };
    },

    reset(): void {
      state = "buffering";
      pendingBuffer = "";
      tagBuffer = "";
      closeBuffer = "";
    },
  };

  return self;
}

/**
 * Create a screen-manager-aware event handler.
 *
 * Routes all output through the ScreenManager and supports
 * compact/expanded tool display modes toggled by Ctrl+O.
 * Handles response_chunk events for streaming display.
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

  // Streaming state
  let isStreaming = false;
  let headerWritten = false;
  let atLineStart = true;
  let thinkingHeaderWritten = false;
  const thinkFilter = createThinkingFilter();

  return (event: OrchestratorEvent) => {
    switch (event.type) {
      case "llm_start":
        if (screen.isTty) {
          screen.startSpinner(
            event.iteration > 1
              ? `step ${event.iteration}/${event.maxIterations}`
              : "",
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
          screen.stopSpinner();
        } else if (spinner) {
          spinner.stop();
          spinner = null;
        }
        // If tool calls are coming, reset streaming state for next iteration
        if (event.hasToolCalls) {
          if (isStreaming) {
            // End the current streaming block with a newline
            screen.writeChunk("\n");
          }
          isStreaming = false;
          headerWritten = false;
          atLineStart = true;
          thinkingHeaderWritten = false;
          thinkFilter.reset();
        }
        break;

      case "response_chunk": {
        const chunkEvt = event as { readonly type: "response_chunk"; readonly text: string; readonly done: boolean };
        if (chunkEvt.done) {
          // Stream complete — don't need to do anything here;
          // the response event will finalize
          break;
        }

        // Filter thinking tags — separates visible from thinking content
        const { visible, thinking, enteredThinking, exitedThinking } = thinkFilter.filter(chunkEvt.text);

        // Handle thinking content
        if (thinking.length > 0 || enteredThinking || exitedThinking) {
          if (getDisplayMode() === "expanded") {
            // Expanded mode: stream thinking content dimmed
            if (!isStreaming) {
              isStreaming = true;
              if (screen.isTty) {
                screen.stopSpinner();
              } else if (spinner) {
                spinner.stop();
                spinner = null;
              }
            }
            if (!headerWritten) {
              screen.writeOutput(`  ${GREEN}${BOLD}triggerfish${RESET}`);
              screen.writeOutput("");
              headerWritten = true;
            }
            if (enteredThinking && !thinkingHeaderWritten) {
              screen.writeChunk(`  ${DIM}`);
              thinkingHeaderWritten = true;
            }
            if (thinking.length > 0) {
              // Add 2-space indent at line starts, dimmed
              let output = "";
              for (const ch of thinking) {
                if (atLineStart) {
                  output += "  ";
                  atLineStart = false;
                }
                output += ch;
                if (ch === "\n") {
                  atLineStart = true;
                }
              }
              screen.writeChunk(output);
            }
            if (exitedThinking) {
              screen.writeChunk(`${RESET}\n`);
              atLineStart = true;
              thinkingHeaderWritten = false;
            }
          }
          // Compact mode: do nothing — spinner keeps running naturally
        }

        // Handle visible (non-thinking) content
        if (visible.length > 0) {
          if (!isStreaming) {
            // First visible content — stop spinner and write header
            isStreaming = true;
            if (screen.isTty) {
              screen.stopSpinner();
            } else if (spinner) {
              spinner.stop();
              spinner = null;
            }
          }
          if (!headerWritten) {
            screen.writeOutput(`  ${GREEN}${BOLD}triggerfish${RESET}`);
            screen.writeOutput("");
            headerWritten = true;
          }
          // Add 2-space indent at the start of each line, tracking
          // line boundaries across chunk boundaries
          let output = "";
          for (const ch of visible) {
            if (atLineStart) {
              output += "  ";
              atLineStart = false;
            }
            output += ch;
            if (ch === "\n") {
              atLineStart = true;
            }
          }
          screen.writeChunk(output);
        }
        break;
      }

      case "tool_call":
        if (isTodoTool(event.name) || isPlanExitTool(event.name)) {
          // Buffer — render formatted output when result arrives
          pendingToolCall = { name: event.name, args: event.args };
        } else if (getDisplayMode() === "compact") {
          // Buffer all tool calls in compact mode — render with ● style when result arrives
          pendingToolCall = { name: event.name, args: event.args };
        } else {
          screen.writeOutput(formatToolCallExpanded(event.name, event.args));
        }
        // Show spinner during tool execution so the CLI doesn't look hung
        if (screen.isTty) {
          screen.startSpinner(event.name);
        }
        break;

      case "tool_result":
        // Stop the tool-execution spinner
        if (screen.isTty) {
          screen.stopSpinner();
        }
        if (isTodoTool(event.name)) {
          const todos = extractTodosFromEvent(event.name, {
            args: pendingToolCall?.args,
            result: event.result,
          });
          pendingToolCall = null;
          if (todos) {
            screen.writeOutput(formatTodoListAnsi(todos) + "\n");
          }
        } else if (isPlanExitTool(event.name)) {
          pendingToolCall = null;
          if (!event.blocked) {
            screen.writeOutput(formatPlanMarkdown(event.result));
          } else {
            screen.writeOutput(
              `  ${YELLOW}⚡${RESET} plan_exit  ${RED}✗${RESET} ${DIM}blocked${RESET}`,
            );
          }
        } else if (getDisplayMode() === "compact" && pendingToolCall) {
          screen.writeOutput(
            formatToolCompact(
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

      case "vision_start":
        if (screen.isTty) {
          screen.startSpinner(
            event.imageCount === 1
              ? "Analyzing image"
              : `Analyzing ${event.imageCount} images`,
          );
        } else {
          spinner = createSpinner(
            event.imageCount === 1
              ? "Analyzing image…"
              : `Analyzing ${event.imageCount} images…`,
          );
        }
        break;

      case "vision_complete":
        if (screen.isTty) {
          screen.stopSpinner();
        } else if (spinner) {
          spinner.stop();
          spinner = null;
        }
        break;

      case "response":
        // Ensure spinner is cleared — stopSpinner is idempotent
        if (screen.isTty) {
          screen.stopSpinner();
        }
        if (isStreaming) {
          // Already streamed — just finalize with newline
          screen.writeOutput("");
          isStreaming = false;
          headerWritten = false;
          atLineStart = true;
          thinkingHeaderWritten = false;
          thinkFilter.reset();
        } else {
          // Non-streaming fallback — render normally
          screen.writeOutput(formatResponse(event.text));
          thinkFilter.reset();
        }
        break;
    }
  };
}
