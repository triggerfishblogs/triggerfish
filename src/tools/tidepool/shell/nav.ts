/**
 * Nav item definitions and badge state interface.
 *
 * Defines the left navigation bar items and badge state
 * for the Tidepool application shell.
 *
 * @module
 */

import type { ScreenId } from "./screens.ts";

/** Navigation item definition. */
export interface NavItem {
  readonly id: ScreenId;
  readonly label: string;
  /** SVG icon path data for the nav icon. */
  readonly icon: string;
  readonly title: string;
}

/** Badge state for a nav item (e.g. unread count, status indicator). */
export interface NavBadge {
  readonly screenId: ScreenId;
  readonly count?: number;
  readonly status?: "green" | "yellow" | "red";
}

/** Badge state map keyed by screen ID. */
export type NavBadgeState = Readonly<Record<ScreenId, NavBadge | undefined>>;

/**
 * Navigation items in display order.
 *
 * Icons use simple SVG path data rendered at 20x20 viewBox.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    id: "chat",
    label: "Chat",
    icon: "M2 4a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H6l-4 4V4z",
    title: "Chat",
  },
  {
    id: "agents",
    label: "Agents",
    icon: "M10 2a4 4 0 100 8 4 4 0 000-8zM2 18a8 8 0 0116 0H2z",
    title: "Active Agents",
  },
  {
    id: "health",
    label: "Health",
    icon:
      "M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z",
    title: "Health",
  },
  {
    id: "settings",
    label: "Settings",
    icon:
      "M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h.5a1.5 1.5 0 010 3H14a1 1 0 00-1 1v.5a1.5 1.5 0 01-3 0V9a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H10a1 1 0 001-1v-.5z",
    title: "Settings",
  },
  {
    id: "logs",
    label: "Logs",
    icon: "M4 4h16v2H4V4zm0 5h16v2H4V9zm0 5h10v2H4v-2z",
    title: "Logs",
  },
  {
    id: "memory",
    label: "Memory",
    icon:
      "M4 3a2 2 0 00-2 2v2a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm0 8a2 2 0 00-2 2v2a2 2 0 002 2h12a2 2 0 002-2v-2a2 2 0 00-2-2H4z",
    title: "Memory",
  },
] as const;

/** Create an empty badge state map. */
export function createEmptyBadgeState(): NavBadgeState {
  return {
    chat: undefined,
    agents: undefined,
    health: undefined,
    settings: undefined,
    logs: undefined,
    memory: undefined,
  };
}
