/**
 * Tide Pool / A2UI module.
 *
 * Provides the agent-driven visual workspace using the A2UI
 * (Agent-to-UI) protocol. Includes component tree definitions,
 * a WebSocket host for broadcasting trees to clients, and
 * agent-facing tools for render/update/clear operations.
 *
 * Legacy HTML push/eval/reset/snapshot tools are also exported
 * for backward compatibility.
 *
 * @module
 */

// Component tree types and helper constructors
export type { ComponentType, A2UIComponent, ComponentTree } from "./components.ts";
export { card, table, markdown, layout } from "./components.ts";

// A2UI WebSocket host
export type { A2UIHost } from "./host.ts";
export { createA2UIHost } from "./host.ts";

// A2UI tools (Result-based, component tree)
export type { TidePoolTools } from "./tools.ts";
export { createTidePoolTools } from "./tools.ts";

// Legacy callback-based host and tools (backward compatibility)
export type { TidepoolHost, TidepoolHostOptions } from "./host.ts";
export { createTidepoolHost } from "./host.ts";

export type { TidepoolTools } from "./tools.ts";
export { createTidepoolTools } from "./tools.ts";
