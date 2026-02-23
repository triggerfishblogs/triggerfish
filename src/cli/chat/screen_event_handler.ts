/**
 * Screen-manager-aware orchestrator event handler.
 *
 * Routes all output through ScreenManager and supports
 * compact/expanded tool display modes. Handles response_chunk
 * events for live streaming display with thinking-tag filtering.
 * @module
 */

import type { OrchestratorEvent } from "../../agent/orchestrator.ts";
import type { ScreenManager } from "../terminal/screen.ts";
import { extractTodosFromEvent, formatTodoListAnsi } from "../../tools/todo.ts";
import { DIM, RED, RESET, YELLOW } from "./ansi.ts";
import type { ToolDisplayMode } from "./ansi.ts";
import { formatResponse } from "./format.ts";
import {
  type EventCallback,
  formatPlanMarkdown,
  formatToolCallExpanded,
  formatToolCompact,
  formatToolResultExpanded,
  isPlanExitTool,
  isTodoTool,
} from "./tool_display.ts";
import { createSpinner } from "./spinner.ts";
import {
  type ScreenHandlerState,
  buildScreenHandlerState,
  ensureStreamingActive,
  resetScreenStreamingState,
  stopSpinnerFallback,
  writeIndentedChunk,
  writeStreamingHeader,
} from "./event_handler_state.ts";

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

// ─── Tool result sub-handlers ────────────────────────────────────────────────

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

/** Handle tool_result event dispatch. */
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

// ─── Public factory ──────────────────────────────────────────────────────────

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
  const state: ScreenHandlerState = buildScreenHandlerState();

  return (event: OrchestratorEvent) => {
    switch (event.type) {
      case "llm_start":
        handleScreenLlmStart(state, screen, event);
        break;
      case "llm_complete":
        handleScreenLlmComplete(state, screen, event.hasToolCalls);
        break;
      case "response_chunk":
        if (!event.done) {
          handleScreenResponseChunk(
            state,
            screen,
            getDisplayMode,
            event.text,
          );
        }
        break;
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
