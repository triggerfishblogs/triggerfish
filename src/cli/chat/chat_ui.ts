/**
 * Rich terminal UI for the Triggerfish chat interface.
 *
 * Re-exports from focused sub-modules:
 * - chat_ansi.ts — ANSI escape codes and write helpers
 * - chat_banner.ts — ASCII art banner
 * - chat_spinner.ts — animated spinner
 * - chat_format.ts — text formatting and response rendering
 * - chat_tool_display.ts — tool call/result display
 * - think_filter_types.ts — filter types, interfaces, constants
 * - think_filter_buffer.ts — buffer-phase resolution
 * - think_filter.ts — stream processing and filter factory
 * - chat_event_handler.ts — orchestrator event handlers
 *
 * @module
 */

// ─── ANSI + constants ────────────────────────────────────────────
export type { ToolDisplayMode } from "./ansi.ts";

// ─── Banner ──────────────────────────────────────────────────────
export { printBanner, formatBanner } from "./banner.ts";

// ─── Spinner ─────────────────────────────────────────────────────
export type { Spinner } from "./spinner.ts";
export { createSpinner } from "./spinner.ts";

// ─── Formatting ──────────────────────────────────────────────────
export {
  renderResponse,
  formatResponse,
  renderError,
  formatError,
  renderPrompt,
} from "./format.ts";

// ─── Tool display ────────────────────────────────────────────────
export {
  renderToolCall,
  renderToolResult,
  formatToolCallCompact,
  formatToolCallExpanded,
  formatToolResultExpanded,
  formatToolCompact,
} from "./tool_display.ts";
export type { EventCallback } from "./tool_display.ts";

// ─── Event handlers ──────────────────────────────────────────────
export {
  createEventHandler,
  createScreenEventHandler,
} from "./event_handler.ts";
