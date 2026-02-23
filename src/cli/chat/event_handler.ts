/**
 * Orchestrator event handlers for the chat UI.
 *
 * Provides two handlers:
 * - `createEventHandler()` — legacy stdout-direct handler
 * - `createScreenEventHandler()` — screen-manager-aware handler with
 *   streaming, compact/expanded display modes, and thinking tag filtering
 *
 * Implementation is split across:
 * - event_handler_state.ts — shared mutable state and helpers
 * - legacy_event_handler.ts — legacy stdout-direct handler
 * - screen_event_handler.ts — screen-manager-aware handler
 * @module
 */

export type { EventCallback } from "./tool_display.ts";

export { createEventHandler } from "./legacy_event_handler.ts";
export { createScreenEventHandler } from "./screen_event_handler.ts";
