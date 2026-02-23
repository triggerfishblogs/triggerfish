/**
 * Tests for SkillContextTracker.
 */
import { assertEquals } from "@std/assert";
import { createSkillContextTracker } from "../../../src/tools/skills/context.ts";
import type { Skill } from "../../../src/tools/skills/loader.ts";

function makeSkill(name: string): Skill {
  return {
    name,
    description: "Test skill",
    classificationCeiling: "PUBLIC",
    requiresTools: [],
    networkDomains: [],
    path: "/tmp/test",
    source: "bundled",
  };
}

Deno.test("SkillContextTracker: starts with null active skill", () => {
  const tracker = createSkillContextTracker();
  assertEquals(tracker.getActive(), null);
});

Deno.test("SkillContextTracker: setActive stores the skill", () => {
  const tracker = createSkillContextTracker();
  const skill = makeSkill("weather");
  tracker.setActive(skill);
  assertEquals(tracker.getActive()?.name, "weather");
});

Deno.test("SkillContextTracker: setActive(null) clears the active skill", () => {
  const tracker = createSkillContextTracker();
  tracker.setActive(makeSkill("weather"));
  tracker.setActive(null);
  assertEquals(tracker.getActive(), null);
});

Deno.test("SkillContextTracker: replacing active skill updates correctly", () => {
  const tracker = createSkillContextTracker();
  tracker.setActive(makeSkill("weather"));
  tracker.setActive(makeSkill("deep-research"));
  assertEquals(tracker.getActive()?.name, "deep-research");
});
