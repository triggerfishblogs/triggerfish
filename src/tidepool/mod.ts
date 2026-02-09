/**
 * Tide Pool / A2UI module.
 *
 * Provides the agent-driven visual workspace using the A2UI
 * (Agent-to-UI) protocol for pushing HTML content, evaluating
 * JavaScript, and managing tide pool state.
 * @module
 */

export type { TidepoolHost, TidepoolHostOptions } from "./host.ts";
export { createTidepoolHost } from "./host.ts";

export type { TidepoolTools } from "./tools.ts";
export { createTidepoolTools } from "./tools.ts";
