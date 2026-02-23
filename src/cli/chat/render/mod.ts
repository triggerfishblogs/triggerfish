/**
 * Render sub-module — ANSI codes, banner, spinner, formatting, and tool display.
 * @module
 */

export {
  RESET,
  BOLD,
  DIM,
  CYAN,
  GREEN,
  YELLOW,
  RED,
  BLUE,
  SPINNER_FRAMES,
  enc,
  write,
  writeln,
} from "./ansi.ts";
export type { ToolDisplayMode } from "./ansi.ts";

export { printBanner, formatBanner } from "./banner.ts";

export type { Spinner } from "./spinner.ts";
export { createSpinner } from "./spinner.ts";

export {
  truncate,
  extractLeadToolArgument,
  formatBytes,
  stripThinkingTags,
  renderResponse,
  formatResponse,
  renderError,
  formatError,
  renderPrompt,
} from "./format.ts";

export {
  isTodoTool,
  isPlanExitTool,
  renderToolCall,
  renderToolResult,
  formatToolCallCompact,
  formatToolCallExpanded,
  formatToolResultExpanded,
  formatToolCompact,
  formatPlanMarkdown,
} from "./tool_display.ts";
export type { EventCallback } from "./tool_display.ts";
