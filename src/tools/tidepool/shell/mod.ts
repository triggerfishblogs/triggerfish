/**
 * Tidepool shell — barrel exports.
 *
 * Re-exports shell types, nav definitions, and screen utilities
 * for the Tidepool application shell.
 *
 * @module
 */

// Shell message types and topic routing
export type {
  ShellTopic,
  TopicMessage,
  TopicOutboundMessage,
} from "./shell.ts";
export { isValidTopic, resolveMessageTopic, SHELL_TOPICS } from "./shell.ts";

// Navigation
export type { NavBadge, NavBadgeState, NavItem } from "./nav.ts";
export { createEmptyBadgeState, NAV_ITEMS } from "./nav.ts";

// Screens
export type { ScreenId, ScreenLifecycle } from "./screens.ts";
export {
  DEFAULT_SCREEN,
  isValidScreen,
  resolveScreenFromHash,
  SCREEN_IDS,
} from "./screens.ts";
