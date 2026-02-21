/**
 * Orchestrator event handlers for the chat UI.
 *
 * Provides two handlers:
 * - `createEventHandler()` — legacy stdout-direct handler
 * - `createScreenEventHandler()` — screen-manager-aware handler with
 *   streaming, compact/expanded display modes, and thinking tag filtering
 * @module
 */

import type { OrchestratorEvent } from "../agent/orchestrator.ts";
import type { ScreenManager } from "./screen.ts";
import { extractTodosFromEvent, formatTodoListAnsi } from "../tools/todo.ts";
import { RESET, BOLD, DIM, GREEN, YELLOW, RED } from "./chat_ansi.ts";
import type { ToolDisplayMode } from "./chat_ansi.ts";
import type { Spinner } from "./chat_spinner.ts";
import { createSpinner } from "./chat_spinner.ts";
import { writeln } from "./chat_ansi.ts";
import { renderResponse, formatResponse } from "./chat_format.ts";
import { renderToolResult } from "./chat_tool_display.ts";
import {
  type EventCallback,
  isTodoTool,
  isPlanExitTool,
  formatToolCompact,
  formatToolCallExpanded,
  formatToolResultExpanded,
  formatPlanMarkdown,
} from "./chat_tool_display.ts";
import { createThinkingFilter } from "./chat_think_filter.ts";

export type { EventCallback };

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
          // Buffer all tool calls — render with bullet style when result arrives
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
              ? "Thinking\u2026"
              : `Thinking\u2026 (step ${event.iteration}/${event.maxIterations})`,
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
          // Buffer all tool calls in compact mode — render with bullet style when result arrives
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
              `  ${YELLOW}\u26a1${RESET} plan_exit  ${RED}\u2717${RESET} ${DIM}blocked${RESET}`,
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
              ? "Analyzing image\u2026"
              : `Analyzing ${event.imageCount} images\u2026`,
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
