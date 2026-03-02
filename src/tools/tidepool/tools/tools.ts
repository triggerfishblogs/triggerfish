/**
 * Tide Pool tools — barrel re-exports.
 *
 * This file re-exports from the split modules for backward compatibility.
 * New code should import directly from the specific modules:
 * - `tools_legacy.ts` — legacy callback-based tools
 * - `tools_canvas.ts` — A2UI canvas tools (Result-based)
 * - `tools_executor.ts` — orchestrator tool executor
 *
 * @module
 */

// Legacy tools
export type { TidepoolTools } from "./tools_legacy.ts";
export { createTidepoolTools } from "./tools_legacy.ts";
export {
  getTidepoolToolDefinitions,
  TIDEPOOL_SYSTEM_PROMPT,
} from "./tools_legacy.ts";

// A2UI canvas tools
export type { RenderFileOptions, TidePoolTools } from "./tools_canvas.ts";
export { createTidePoolTools } from "./tools_canvas.ts";

// Executor
export { createTidepoolToolExecutor } from "./tools_executor.ts";
