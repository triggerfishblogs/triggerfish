/**
 * Orchestrator event handlers for the chat UI.
 *
 * Provides two handlers:
 * - `createEventHandler()` — legacy stdout-direct handler
 * - `createScreenEventHandler()` — screen-manager-aware handler with
 *   streaming, compact/expanded display modes, and thinking tag filtering
 * @module
 */

import type { OrchestratorEvent } from "../../agent/orchestrator.ts";
import type { ScreenManager } from "../terminal/screen.ts";
import { extractTodosFromEvent, formatTodoListAnsi } from "../../tools/todo.ts";
import { BOLD, DIM, GREEN, RED, RESET, YELLOW } from "./ansi.ts";
import type { ToolDisplayMode } from "./ansi.ts";
import type { Spinner } from "./spinner.ts";
import { createSpinner } from "./spinner.ts";
import { writeln } from "./ansi.ts";
import { formatResponse, renderResponse } from "./format.ts";
import { renderToolResult } from "./tool_display.ts";
import {
  type EventCallback,
  formatPlanMarkdown,
  formatToolCallExpanded,
  formatToolCompact,
  formatToolResultExpanded,
  isPlanExitTool,
  isTodoTool,
} from "./tool_display.ts";
import { createThinkingFilter } from "./think_filter.ts";

export type { EventCallback };

// ─── Mutable state for screen event handler ──────────────────────────────────

/** Mutable state shared across screen event handler callbacks. */
interface ScreenHandlerState {
  spinner: Spinner | null;
  pendingToolCall: { name: string; args: Record<string, unknown> } | null;
  isStreaming: boolean;
  headerWritten: boolean;
  atLineStart: boolean;
  thinkingHeaderWritten: boolean;
  readonly thinkFilter: ReturnType<typeof createThinkingFilter>;
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

/** Start spinner (screen or fallback) for thinking/vision. */
function stopSpinnerFallback(
  state: ScreenHandlerState,
  screen: ScreenManager,
): void {
  if (screen.isTty) {
    screen.stopSpinner();
  } else if (state.spinner) {
    state.spinner.stop();
    state.spinner = null;
  }
}

/** Ensure streaming mode is active and spinner is stopped. */
function ensureStreamingActive(
  state: ScreenHandlerState,
  screen: ScreenManager,
): void {
  if (state.isStreaming) return;
  state.isStreaming = true;
  stopSpinnerFallback(state, screen);
}

/** Write the triggerfish response header if not yet written. */
function writeStreamingHeader(
  state: ScreenHandlerState,
  screen: ScreenManager,
): void {
  if (state.headerWritten) return;
  screen.writeOutput(`  ${GREEN}${BOLD}triggerfish${RESET}`);
  screen.writeOutput("");
  state.headerWritten = true;
}

/** Write text with 2-space indent at line starts. Returns updated atLineStart. */
function writeIndentedChunk(
  screen: ScreenManager,
  text: string,
  atLineStart: boolean,
): boolean {
  let output = "";
  let lineStart = atLineStart;
  for (const ch of text) {
    if (lineStart) {
      output += "  ";
      lineStart = false;
    }
    output += ch;
    if (ch === "\n") lineStart = true;
  }
  screen.writeChunk(output);
  return lineStart;
}

/** Reset all streaming-related state fields. */
function resetScreenStreamingState(state: ScreenHandlerState): void {
  state.isStreaming = false;
  state.headerWritten = false;
  state.atLineStart = true;
  state.thinkingHeaderWritten = false;
  state.thinkFilter.reset();
}

// ─── Screen event case handlers ──────────────────────────────────────────────

/** Handle llm_start event. */
function handleScreenLlmStart(
  state: ScreenHandlerState,
  screen: ScreenManager,
  event: { iteration: number; maxIterations: number },
): void {
  if (screen.isTty) {
    screen.startSpinner(
      event.iteration > 1
        ? `step ${event.iteration}/${event.maxIterations}`
        : "",
    );
  } else {
    state.spinner = createSpinner(
      event.iteration === 1
        ? "Thinking\u2026"
        : `Thinking\u2026 (step ${event.iteration}/${event.maxIterations})`,
    );
  }
}

/** Handle llm_complete event. */
function handleScreenLlmComplete(
  state: ScreenHandlerState,
  screen: ScreenManager,
  hasToolCalls: boolean,
): void {
  stopSpinnerFallback(state, screen);
  if (hasToolCalls) {
    if (state.isStreaming) screen.writeChunk("\n");
    resetScreenStreamingState(state);
  }
}

/** Handle thinking content from a response chunk. */
function handleThinkingChunk(
  state: ScreenHandlerState,
  screen: ScreenManager,
  thinking: string,
  enteredThinking: boolean,
  exitedThinking: boolean,
): void {
  ensureStreamingActive(state, screen);
  writeStreamingHeader(state, screen);
  if (enteredThinking && !state.thinkingHeaderWritten) {
    screen.writeChunk(`  ${DIM}`);
    state.thinkingHeaderWritten = true;
  }
  if (thinking.length > 0) {
    state.atLineStart = writeIndentedChunk(screen, thinking, state.atLineStart);
  }
  if (exitedThinking) {
    screen.writeChunk(`${RESET}\n`);
    state.atLineStart = true;
    state.thinkingHeaderWritten = false;
  }
}

/** Handle response_chunk event (streaming text). */
function handleScreenResponseChunk(
  state: ScreenHandlerState,
  screen: ScreenManager,
  getDisplayMode: () => ToolDisplayMode,
  text: string,
): void {
  const { visible, thinking, enteredThinking, exitedThinking } = state
    .thinkFilter.filter(text);

  const hasThinkingContent = thinking.length > 0 || enteredThinking ||
    exitedThinking;
  if (hasThinkingContent && getDisplayMode() === "expanded") {
    handleThinkingChunk(
      state,
      screen,
      thinking,
      enteredThinking,
      exitedThinking,
    );
  }

  if (visible.length > 0) {
    ensureStreamingActive(state, screen);
    writeStreamingHeader(state, screen);
    state.atLineStart = writeIndentedChunk(
      screen,
      visible,
      state.atLineStart,
    );
  }
}

/** Handle tool_call event. */
function handleScreenToolCall(
  state: ScreenHandlerState,
  screen: ScreenManager,
  getDisplayMode: () => ToolDisplayMode,
  event: { name: string; args: Record<string, unknown> },
): void {
  if (isTodoTool(event.name) || isPlanExitTool(event.name)) {
    state.pendingToolCall = { name: event.name, args: event.args };
  } else if (getDisplayMode() === "compact") {
    state.pendingToolCall = { name: event.name, args: event.args };
  } else {
    screen.writeOutput(formatToolCallExpanded(event.name, event.args));
  }
  if (screen.isTty) screen.startSpinner(event.name);
}

/** Handle tool_result for todo tools. */
function handleTodoToolResult(
  state: ScreenHandlerState,
  screen: ScreenManager,
  event: { name: string; result: string },
): void {
  const todos = extractTodosFromEvent(event.name, {
    args: state.pendingToolCall?.args,
    result: event.result,
  });
  state.pendingToolCall = null;
  if (todos) screen.writeOutput(formatTodoListAnsi(todos) + "\n");
}

/** Handle tool_result for plan_exit tool. */
function handlePlanExitToolResult(
  state: ScreenHandlerState,
  screen: ScreenManager,
  event: { result: string; blocked: boolean },
): void {
  state.pendingToolCall = null;
  if (!event.blocked) {
    screen.writeOutput(formatPlanMarkdown(event.result));
  } else {
    screen.writeOutput(
      `  ${YELLOW}\u26a1${RESET} plan_exit  ${RED}\u2717${RESET} ${DIM}blocked${RESET}`,
    );
  }
}

/** Handle tool_result event. */
function handleScreenToolResult(
  state: ScreenHandlerState,
  screen: ScreenManager,
  getDisplayMode: () => ToolDisplayMode,
  event: { name: string; result: string; blocked: boolean },
): void {
  if (isTodoTool(event.name)) {
    handleTodoToolResult(state, screen, event);
  } else if (isPlanExitTool(event.name)) {
    handlePlanExitToolResult(state, screen, event);
  } else if (getDisplayMode() === "compact" && state.pendingToolCall) {
    screen.writeOutput(
      formatToolCompact(
        state.pendingToolCall.name,
        state.pendingToolCall.args,
        event.result,
        event.blocked,
      ),
    );
    state.pendingToolCall = null;
  } else {
    screen.writeOutput(formatToolResultExpanded(event.result, event.blocked));
  }
}

/** Handle vision_start event. */
function handleScreenVisionStart(
  state: ScreenHandlerState,
  screen: ScreenManager,
  event: { imageCount: number },
): void {
  const label = event.imageCount === 1
    ? "Analyzing image"
    : `Analyzing ${event.imageCount} images`;
  if (screen.isTty) {
    screen.startSpinner(label);
  } else {
    state.spinner = createSpinner(label + "\u2026");
  }
}

/** Handle response event (final response). */
function handleScreenResponse(
  state: ScreenHandlerState,
  screen: ScreenManager,
  text: string,
): void {
  if (screen.isTty) screen.stopSpinner();
  if (state.isStreaming) {
    screen.writeOutput("");
    resetScreenStreamingState(state);
  } else {
    screen.writeOutput(formatResponse(text));
    state.thinkFilter.reset();
  }
}

// ─── Public factories ────────────────────────────────────────────────────────

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
            ? "Thinking\u2026"
            : `Thinking\u2026 (step ${event.iteration}/${event.maxIterations})`,
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
            ? "Analyzing image\u2026"
            : `Analyzing ${event.imageCount} images\u2026`,
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
  const state: ScreenHandlerState = {
    spinner: null,
    pendingToolCall: null,
    isStreaming: false,
    headerWritten: false,
    atLineStart: true,
    thinkingHeaderWritten: false,
    thinkFilter: createThinkingFilter(),
  };

  return (event: OrchestratorEvent) => {
    switch (event.type) {
      case "llm_start":
        handleScreenLlmStart(state, screen, event);
        break;
      case "llm_complete":
        handleScreenLlmComplete(state, screen, event.hasToolCalls);
        break;
      case "response_chunk": {
        const chunkEvt = event as {
          readonly type: "response_chunk";
          readonly text: string;
          readonly done: boolean;
        };
        if (!chunkEvt.done) {
          handleScreenResponseChunk(
            state,
            screen,
            getDisplayMode,
            chunkEvt.text,
          );
        }
        break;
      }
      case "tool_call":
        handleScreenToolCall(state, screen, getDisplayMode, event);
        break;
      case "tool_result":
        if (screen.isTty) screen.stopSpinner();
        handleScreenToolResult(state, screen, getDisplayMode, event);
        break;
      case "vision_start":
        handleScreenVisionStart(state, screen, event);
        break;
      case "vision_complete":
        stopSpinnerFallback(state, screen);
        break;
      case "response":
        handleScreenResponse(state, screen, event.text);
        break;
    }
  };
}
