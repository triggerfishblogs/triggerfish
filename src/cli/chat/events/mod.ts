/**
 * Events sub-module — orchestrator event handlers for the chat UI.
 * @module
 */

export { createEventHandler } from "./legacy_event_handler.ts";
export { createScreenEventHandler } from "./screen_event_handler.ts";

export type { ScreenHandlerState } from "./event_handler_state.ts";
export {
  buildScreenHandlerState,
  ensureStreamingActive,
  resetScreenStreamingState,
  stopSpinnerFallback,
  writeIndentedChunk,
  writeStreamingHeader,
} from "./event_handler_state.ts";
