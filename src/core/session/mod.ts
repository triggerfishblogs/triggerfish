/**
 * Session module — session lifecycle, taint propagation, and management.
 *
 * @module
 */

export type { SessionManager } from "./manager.ts";
export { createSessionManager } from "./manager.ts";
export { propagateTaint } from "./taint.ts";
