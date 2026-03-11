/**
 * Settings store — sections and active tab.
 */

import type { SettingsSection } from "../types.js";
import { onTopic, send } from "./websocket.svelte.js";

/** Available settings sections. */
export const SECTIONS: readonly SettingsSection[] = [
  "general",
  "providers",
  "channels",
  "classification",
  "scheduler",
  "integrations",
  "advanced",
];

/** Currently active section. */
let _activeSection: SettingsSection = $state("general");

/** Current section data. */
let _sectionData: Record<string, unknown> | null = $state(null);

/** Loading state. */
let _loading: boolean = $state(false);

/** Get the currently active section. */
export function getActiveSection(): SettingsSection {
  return _activeSection;
}

/** Get the current section data. */
export function getSectionData(): Record<string, unknown> | null {
  return _sectionData;
}

/** Get the loading state. */
export function getLoading(): boolean {
  return _loading;
}

/** Request a settings section. */
export function requestSection(section: SettingsSection): void {
  _activeSection = section;
  _loading = true;
  send({
    topic: "settings",
    action: "get_section",
    payload: { section },
  });
}

function handleMessage(msg: Record<string, unknown>): void {
  if (msg.type === "section_data") {
    _loading = false;
    _sectionData = msg.data as Record<string, unknown>;
  }
}

onTopic("settings", handleMessage);
