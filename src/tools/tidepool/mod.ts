/**
 * Tide Pool / A2UI module.
 *
 * Provides the agent-driven visual workspace using the A2UI
 * (Agent-to-UI) protocol. Includes component tree definitions,
 * a WebSocket host for broadcasting trees and canvas messages to
 * clients, and agent-facing tools for canvas render/update/clear.
 *
 * Legacy HTML push/eval/reset/snapshot tools are also exported
 * for backward compatibility.
 *
 * @module
 */

// Component tree types and helper constructors
export type { ComponentType, A2UIComponent, ComponentTree } from "./components.ts";
export { card, table, chart, form, image, markdown, layout } from "./components.ts";

// Canvas protocol types
export type {
  CanvasMessage,
  CanvasRenderComponentMessage,
  CanvasRenderHtmlMessage,
  CanvasRenderFileMessage,
  CanvasUpdateMessage,
  CanvasClearMessage,
} from "./canvas_protocol.ts";
export { generateRenderId } from "./canvas_protocol.ts";

// A2UI WebSocket host
export type { A2UIHost, A2UIHostOptions } from "./host.ts";
export { createA2UIHost } from "./host.ts";

// Tidepool browser HTML compositor
export { buildTidepoolHtml, TIDEPOOL_HTML } from "./ui.ts";

// A2UI canvas tools (Result-based)
export type { TidePoolTools, RenderFileOptions } from "./tools_canvas.ts";
export { createTidePoolTools } from "./tools_canvas.ts";

// Tool definitions and system prompt
export { getTidepoolToolDefinitions, TIDEPOOL_SYSTEM_PROMPT } from "./tools_legacy.ts";

// Executor
export { createTidepoolToolExecutor } from "./tools_executor.ts";

// Legacy callback-based host and tools (backward compatibility)
export type { TidepoolHost, TidepoolHostOptions } from "./host.ts";
export { createTidepoolHost } from "./host.ts";

export type { TidepoolTools } from "./tools_legacy.ts";
export { createTidepoolTools } from "./tools_legacy.ts";
