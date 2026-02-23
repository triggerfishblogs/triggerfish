/**
 * Tidepool tools — barrel exports.
 *
 * Re-exports tool definitions, canvas tools, legacy tools, and
 * the executor from their individual modules.
 *
 * @module
 */

// Tool definitions and system prompt
export { getTidepoolToolDefinitions, TIDEPOOL_SYSTEM_PROMPT } from "./tools_defs.ts";

// A2UI canvas tools (Result-based)
export type { TidePoolTools, RenderFileOptions } from "./tools_canvas.ts";
export { createTidePoolTools, applyComponentUpdate } from "./tools_canvas.ts";

// Legacy callback-based tools
export type { TidepoolTools } from "./tools_legacy.ts";
export { createTidepoolTools } from "./tools_legacy.ts";

// Executor
export { createTidepoolToolExecutor } from "./tools_executor.ts";
