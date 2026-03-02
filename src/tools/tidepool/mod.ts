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
export type {
  A2UIComponent,
  ComponentTree,
  ComponentType,
} from "./components.ts";
export {
  card,
  chart,
  form,
  image,
  layout,
  markdown,
  table,
} from "./components.ts";

// Canvas protocol types
export type {
  CanvasClearMessage,
  CanvasMessage,
  CanvasRenderComponentMessage,
  CanvasRenderFileMessage,
  CanvasRenderHtmlMessage,
  CanvasUpdateMessage,
} from "./canvas_protocol.ts";
export { generateRenderId } from "./canvas_protocol.ts";

// A2UI WebSocket host
export type { A2UIHost, A2UIHostOptions } from "./host/mod.ts";
export { createA2UIHost } from "./host/mod.ts";

// Tidepool browser HTML compositor
export { buildTidepoolHtml, TIDEPOOL_HTML } from "./ui.ts";

// A2UI canvas tools (Result-based)
export type { RenderFileOptions, TidePoolTools } from "./tools/mod.ts";
export { createTidePoolTools } from "./tools/mod.ts";

// Tool definitions and system prompt
export {
  getTidepoolToolDefinitions,
  TIDEPOOL_SYSTEM_PROMPT,
} from "./tools/mod.ts";

// Executor
export { createTidepoolToolExecutor } from "./tools/mod.ts";

// Legacy callback-based host and tools (backward compatibility)
export type { TidepoolHost, TidepoolHostOptions } from "./host/mod.ts";
export { createTidepoolHost } from "./host/mod.ts";

export type { TidepoolTools } from "./tools/mod.ts";
export { createTidepoolTools } from "./tools/mod.ts";
