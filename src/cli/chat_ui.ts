/**
 * Rich terminal UI for the Triggerfish chat interface.
 *
 * Re-exports from focused sub-modules:
 * - chat_ansi.ts — ANSI escape codes and write helpers
 * - chat_banner.ts — ASCII art banner
 * - chat_spinner.ts — animated spinner
 * - chat_format.ts — text formatting and response rendering
 * - chat_tool_display.ts — tool call/result display
 * - chat_think_filter.ts — streaming thinking-tag filter
 * - chat_event_handler.ts — orchestrator event handlers
 *
 * @module
 */

// ─── ANSI + constants ────────────────────────────────────────────
export type { ToolDisplayMode } from "./chat_ansi.ts";

// ─── Banner ──────────────────────────────────────────────────────
export { printBanner, formatBanner } from "./chat_banner.ts";

// ─── Spinner ─────────────────────────────────────────────────────
export type { Spinner } from "./chat_spinner.ts";
export { createSpinner } from "./chat_spinner.ts";

// ─── Formatting ──────────────────────────────────────────────────
export {
  renderResponse,
  formatResponse,
  renderError,
  formatError,
  renderPrompt,
} from "./chat_format.ts";

// ─── Tool display ────────────────────────────────────────────────
export {
  renderToolCall,
  renderToolResult,
  formatToolCallCompact,
  formatToolCallExpanded,
  formatToolResultExpanded,
  formatToolCompact,
} from "./chat_tool_display.ts";
export type { EventCallback } from "./chat_tool_display.ts";

// ─── Event handlers ──────────────────────────────────────────────
export {
  createEventHandler,
  createScreenEventHandler,
} from "./chat_event_handler.ts";
