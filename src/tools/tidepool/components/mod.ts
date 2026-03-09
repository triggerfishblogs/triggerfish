/**
 * Tidepool shared components — barrel exports.
 *
 * Re-exports chat component, taint badge, and status dot types.
 *
 * @module
 */

// Chat component types
export type {
  ChatComponentConfig,
  ChatSessionEvent,
  ChatSubscriptionRequest,
} from "./chat_component.ts";

// Taint badge
export type { TaintBadgeColors } from "./taint_badge.ts";
export { resolveTaintBadgeClass, TAINT_BADGE_MAP } from "./taint_badge.ts";

// Status dot
export type { StatusDotConfig, StatusLevel } from "./status_dot.ts";
export { resolveStatusLevel } from "./status_dot.ts";
