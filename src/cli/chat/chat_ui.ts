/**
 * Rich terminal UI for the Triggerfish chat interface.
 *
 * Re-exports from focused sub-modules:
 * - render/ — ANSI codes, banner, spinner, formatting, tool display
 * - events/ — orchestrator event handlers
 * - thinking/ — stream filter for thinking tags
 *
 * @module
 */

// ─── ANSI + constants ────────────────────────────────────────────
export type { ToolDisplayMode } from "./render/ansi.ts";

// ─── Banner ──────────────────────────────────────────────────────
export { formatBanner, printBanner } from "./render/banner.ts";

// ─── Spinner ─────────────────────────────────────────────────────
export type { Spinner } from "./render/spinner.ts";
export { createSpinner } from "./render/spinner.ts";

// ─── Formatting ──────────────────────────────────────────────────
export {
  formatError,
  formatResponse,
  renderError,
  renderPrompt,
  renderResponse,
} from "./render/format.ts";

// ─── Tool display ────────────────────────────────────────────────
export {
  formatToolCallCompact,
  formatToolCallExpanded,
  formatToolCompact,
  formatToolResultExpanded,
  renderToolCall,
  renderToolResult,
} from "./render/tool_display.ts";
export type { EventCallback } from "./render/tool_display.ts";

// ─── Event handlers ──────────────────────────────────────────────
export {
  createEventHandler,
  createScreenEventHandler,
} from "./events/event_handler.ts";
