/**
 * Tests for settings screen types.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import {
  SETTINGS_SECTION_META,
  SETTINGS_SECTIONS,
} from "../../../src/tools/tidepool/screens/settings.ts";
import type {
  SettingsField,
  SettingsFormState,
} from "../../../src/tools/tidepool/screens/settings_fields.ts";

Deno.test("SETTINGS_SECTIONS contains 8 sections", () => {
  assertEquals(SETTINGS_SECTIONS.length, 8);
  assertEquals(SETTINGS_SECTIONS.includes("general"), true);
  assertEquals(SETTINGS_SECTIONS.includes("providers"), true);
  assertEquals(SETTINGS_SECTIONS.includes("channels"), true);
  assertEquals(SETTINGS_SECTIONS.includes("classification"), true);
  assertEquals(SETTINGS_SECTIONS.includes("skills"), true);
  assertEquals(SETTINGS_SECTIONS.includes("scheduler"), true);
  assertEquals(SETTINGS_SECTIONS.includes("security"), true);
  assertEquals(SETTINGS_SECTIONS.includes("advanced"), true);
});

Deno.test("SETTINGS_SECTION_META matches sections", () => {
  assertEquals(SETTINGS_SECTION_META.length, SETTINGS_SECTIONS.length);
  for (const meta of SETTINGS_SECTION_META) {
    assertEquals(
      SETTINGS_SECTIONS.includes(meta.id),
      true,
      `${meta.id} should be a valid section`,
    );
    assertEquals(typeof meta.label, "string");
    assertEquals(typeof meta.icon, "string");
  }
});

Deno.test("SettingsField types are valid", () => {
  const field: SettingsField = {
    key: "agent_name",
    label: "Agent Name",
    type: "text",
    placeholder: "My Agent",
  };
  assertEquals(field.type, "text");
});

Deno.test("SettingsFormState tracks dirty state", () => {
  const state: SettingsFormState = {
    section: "general",
    fields: [],
    values: {},
    dirty: false,
    errors: {},
  };
  assertEquals(state.dirty, false);
});

Deno.test("buildTidepoolHtml includes settings screen", async () => {
  const { buildTidepoolHtml } = await import(
    "../../../src/tools/tidepool/ui.ts"
  );
  const html = buildTidepoolHtml();
  assertEquals(html.includes("screen-settings-container"), true);
  assertEquals(html.includes("settings-sections"), true);
  assertEquals(html.includes("settings-save-btn"), true);
});
