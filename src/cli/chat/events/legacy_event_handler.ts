/**
 * Legacy stdout-direct orchestrator event handler.
 *
 * Writes tool calls, results, and responses directly to stdout
 * without screen-manager integration. Used for non-TTY or
 * simple terminal environments.
 * @module
 */

import type { OrchestratorEvent } from "../../../agent/orchestrator/orchestrator_types.ts";
import {
  extractTodosFromEvent,
  formatTodoListAnsi,
} from "../../../tools/todo.ts";
import { writeln } from "../render/ansi.ts";
import { renderResponse } from "../render/format.ts";
import { renderToolResult } from "../render/tool_display.ts";
import {
  type EventCallback,
  formatToolCompact,
  isTodoTool,
} from "../render/tool_display.ts";
import type { Spinner } from "../render/spinner.ts";
import { createSpinner } from "../render/spinner.ts";

// ─── Legacy event dispatch ───────────────────────────────────────────────────

/** Handle llm_start: create a thinking spinner. */
function startLegacySpinner(
  iteration: number,
  maxIterations: number,
): Spinner {
  return createSpinner(
    iteration === 1
      ? "Thinking\u2026"
      : `Thinking\u2026 (step ${iteration}/${maxIterations})`,
  );
}

/** Handle tool_result for a todo tool. */
function renderLegacyTodoResult(
  name: string,
  result: string,
  pendingArgs: Record<string, unknown> | undefined,
): void {
  const todos = extractTodosFromEvent(name, {
    args: pendingArgs,
    result,
  });
  if (todos) {
    writeln(formatTodoListAnsi(todos));
    writeln();
  }
}

/** Handle tool_result for a regular (non-todo) tool with pending compact display. */
function renderLegacyPendingToolResult(
  pending: { name: string; args: Record<string, unknown> },
  result: string,
  blocked: boolean,
): void {
  writeln(
    formatToolCompact(pending.name, pending.args, result, blocked),
  );
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
        spinner = startLegacySpinner(event.iteration, event.maxIterations);
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
        handleLegacyToolResult(event, pendingTodoArgs, pendingTool);
        pendingTodoArgs = null;
        pendingTool = null;
        break;

      case "vision_start":
        spinner = startLegacyVisionSpinner(event.imageCount);
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

/** Create spinner for vision analysis. */
function startLegacyVisionSpinner(imageCount: number): Spinner {
  return createSpinner(
    imageCount === 1
      ? "Analyzing image\u2026"
      : `Analyzing ${imageCount} images\u2026`,
  );
}

/** Dispatch tool_result to the appropriate renderer. */
function handleLegacyToolResult(
  event: {
    readonly name: string;
    readonly result: string;
    readonly blocked: boolean;
  },
  pendingTodoArgs: Record<string, unknown> | null,
  pendingTool: { name: string; args: Record<string, unknown> } | null,
): void {
  if (isTodoTool(event.name)) {
    renderLegacyTodoResult(
      event.name,
      event.result,
      pendingTodoArgs ?? undefined,
    );
  } else if (pendingTool) {
    renderLegacyPendingToolResult(pendingTool, event.result, event.blocked);
  } else {
    renderToolResult(event.name, event.result, event.blocked);
  }
}
