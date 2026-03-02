/**
 * Render sub-module — ANSI codes, banner, spinner, formatting, and tool display.
 * @module
 */

export {
  BLUE,
  BOLD,
  CYAN,
  DIM,
  enc,
  GREEN,
  RED,
  RESET,
  SPINNER_FRAMES,
  write,
  writeln,
  YELLOW,
} from "./ansi.ts";
export type { ToolDisplayMode } from "./ansi.ts";

export { formatBanner, printBanner } from "./banner.ts";

export type { Spinner } from "./spinner.ts";
export { createSpinner } from "./spinner.ts";

export {
  extractLeadToolArgument,
  formatBytes,
  formatError,
  formatResponse,
  renderError,
  renderPrompt,
  renderResponse,
  stripThinkingTags,
  truncate,
} from "./format.ts";

export {
  formatPlanMarkdown,
  formatToolCallCompact,
  formatToolCallExpanded,
  formatToolCompact,
  formatToolResultExpanded,
  isPlanExitTool,
  isTodoTool,
  renderToolCall,
  renderToolResult,
} from "./tool_display.ts";
export type { EventCallback } from "./tool_display.ts";
