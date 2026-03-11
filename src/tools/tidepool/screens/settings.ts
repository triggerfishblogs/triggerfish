/**
 * Settings screen types and section definitions.
 *
 * @module
 */

/** Settings section identifiers. */
export type SettingsSection =
  | "general"
  | "providers"
  | "channels"
  | "classification"
  | "scheduler"
  | "integrations"
  | "advanced";

/** All settings sections in display order. */
export const SETTINGS_SECTIONS: readonly SettingsSection[] = [
  "general",
  "providers",
  "channels",
  "classification",
  "scheduler",
  "integrations",
  "advanced",
] as const;
