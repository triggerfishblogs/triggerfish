/**
 * Screen-manager-aware orchestrator event handler factory.
 *
 * Routes all output through ScreenManager and supports
 * compact/expanded tool display modes. Delegates to streaming
 * and tool sub-handlers.
 * @module
 */

import type { OrchestratorEvent } from "../../../agent/orchestrator/orchestrator_types.ts";
import type { ScreenManager } from "../../terminal/screen.ts";
import type { ToolDisplayMode } from "../render/ansi.ts";
import type { EventCallback } from "../render/tool_display.ts";
import {
  buildScreenHandlerState,
  stopSpinnerFallback,
} from "./event_handler_state.ts";
import {
  handleScreenLlmComplete,
  handleScreenLlmStart,
  handleScreenResponse,
  handleScreenResponseChunk,
  handleScreenVisionStart,
} from "./screen_event_streaming.ts";
import {
  handleScreenToolCall,
  handleScreenToolResult,
} from "./screen_event_tools.ts";

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
  const state = buildScreenHandlerState();

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
