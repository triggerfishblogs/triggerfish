/**
 * Tests for SkillContextTracker.
 *
 * Verifies per-session skill tracking lifecycle: start null,
 * set active, clear active.
 */
import { assertEquals } from "@std/assert";
import { createSkillContextTracker } from "../../../src/tools/skills/context.ts";
import type { Skill } from "../../../src/tools/skills/loader.ts";

function makeTestSkill(overrides?: Partial<Skill>): Skill {
  return {
    name: "test-skill",
    description: "A test skill",
    classificationCeiling: "PUBLIC",
    requiresTools: ["web_fetch"],
    networkDomains: ["example.com"],
    path: "/tmp/test-skill",
    source: "managed",
    contentHash: "abc123",
    ...overrides,
  };
}

Deno.test("SkillContextTracker: starts with null active skill", () => {
  const tracker = createSkillContextTracker();
  assertEquals(tracker.getActive(), null);
});

Deno.test("SkillContextTracker: setActive stores skill", () => {
  const tracker = createSkillContextTracker();
  const skill = makeTestSkill();
  tracker.setActive(skill);
  assertEquals(tracker.getActive(), skill);
  assertEquals(tracker.getActive()?.name, "test-skill");
});

Deno.test("SkillContextTracker: setActive(null) clears skill", () => {
  const tracker = createSkillContextTracker();
  tracker.setActive(makeTestSkill());
  assertEquals(tracker.getActive()?.name, "test-skill");
  tracker.setActive(null);
  assertEquals(tracker.getActive(), null);
});

Deno.test("SkillContextTracker: replacing active skill overwrites previous", () => {
  const tracker = createSkillContextTracker();
  tracker.setActive(makeTestSkill({ name: "first" }));
  assertEquals(tracker.getActive()?.name, "first");
  tracker.setActive(makeTestSkill({ name: "second" }));
  assertEquals(tracker.getActive()?.name, "second");
});
