/**
 * Screen enum, mount/unmount lifecycle types.
 *
 * Defines the screen identifiers and lifecycle hooks
 * for the Tidepool application shell screens.
 *
 * @module
 */

/** Screen identifiers corresponding to hash routes. */
export type ScreenId =
  | "chat"
  | "agents"
  | "health"
  | "settings"
  | "logs"
  | "memory";

/** All valid screen IDs. */
export const SCREEN_IDS: readonly ScreenId[] = [
  "chat",
  "agents",
  "health",
  "settings",
  "logs",
  "memory",
] as const;

/** The default screen shown on first load. */
export const DEFAULT_SCREEN: ScreenId = "chat";

/** Lifecycle hooks for a screen. */
export interface ScreenLifecycle {
  /** Called when screen becomes visible. */
  readonly onMount: () => void;
  /** Called when screen becomes hidden. */
  readonly onUnmount: () => void;
}

/**
 * Resolve a hash fragment to a screen ID.
 *
 * Returns the default screen if the hash is empty or invalid.
 */
export function resolveScreenFromHash(hash: string): ScreenId {
  const cleaned = hash.replace(/^#/, "");
  if (SCREEN_IDS.includes(cleaned as ScreenId)) {
    return cleaned as ScreenId;
  }
  return DEFAULT_SCREEN;
}

/** Check whether a string is a valid screen ID. */
export function isValidScreen(id: string): id is ScreenId {
  return SCREEN_IDS.includes(id as ScreenId);
}
