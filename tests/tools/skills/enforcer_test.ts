/**
 * Tests for skill enforcement functions.
 *
 * Covers tool filtering, network domain checking, and
 * classification ceiling enforcement.
 */
import { assertEquals } from "@std/assert";
import {
  filterToolsForActiveSkill,
  enforceSkillNetworkDomain,
  enforceSkillClassificationCeiling,
} from "../../../src/tools/skills/enforcer.ts";
import type { Skill } from "../../../src/tools/skills/loader.ts";
import type { ToolDefinition } from "../../../src/core/types/tool.ts";
import type { ClassificationLevel } from "../../../src/core/types/classification.ts";

function makeTestSkill(overrides?: Partial<Skill>): Skill {
  return {
    name: "test-skill",
    description: "A test skill",
    classificationCeiling: "INTERNAL",
    requiresTools: ["web_fetch", "web_search"],
    networkDomains: ["example.com", "api.test.org"],
    path: "/tmp/test-skill",
    source: "managed",
    contentHash: "abc123",
    ...overrides,
  };
}

function makeToolDef(name: string): ToolDefinition {
  return { name, description: `Tool ${name}`, parameters: {} };
}

const ALL_TOOLS: readonly ToolDefinition[] = [
  makeToolDef("read_skill"),
  makeToolDef("web_fetch"),
  makeToolDef("web_search"),
  makeToolDef("memory_store"),
  makeToolDef("read_file"),
];

// ─── filterToolsForActiveSkill ───────────────────────────────────────────────

Deno.test("filterToolsForActiveSkill: returns all tools when no active skill", () => {
  const result = filterToolsForActiveSkill(ALL_TOOLS, null);
  assertEquals(result.length, 5);
});

Deno.test("filterToolsForActiveSkill: returns all tools when requiresTools is null (not declared)", () => {
  const skill = makeTestSkill({ requiresTools: null });
  const result = filterToolsForActiveSkill(ALL_TOOLS, skill);
  assertEquals(result.length, 5);
});

Deno.test("filterToolsForActiveSkill: filters to declared tools + read_skill when skill active", () => {
  const skill = makeTestSkill({ requiresTools: ["web_fetch", "web_search"] });
  const result = filterToolsForActiveSkill(ALL_TOOLS, skill);
  const names = result.map((t) => t.name).sort();
  assertEquals(names, ["read_skill", "web_fetch", "web_search"]);
});

Deno.test("filterToolsForActiveSkill: returns only read_skill when requiresTools is [] (declared empty)", () => {
  const skill = makeTestSkill({ requiresTools: [] });
  const result = filterToolsForActiveSkill(ALL_TOOLS, skill);
  assertEquals(result.length, 1);
  assertEquals(result[0].name, "read_skill");
});

// ─── enforceSkillNetworkDomain ─────────────────────────────────────────────────

Deno.test("enforceSkillNetworkDomain: returns null when no active skill", () => {
  const result = enforceSkillNetworkDomain("https://example.com/page", null);
  assertEquals(result, null);
});

Deno.test("enforceSkillNetworkDomain: returns null when networkDomains is null (not declared)", () => {
  const skill = makeTestSkill({ networkDomains: null });
  const result = enforceSkillNetworkDomain("https://anything.com/page", skill);
  assertEquals(result, null);
});

Deno.test("enforceSkillNetworkDomain: blocks all fetches when networkDomains is [] (declared empty)", () => {
  const skill = makeTestSkill({ networkDomains: [] });
  const result = enforceSkillNetworkDomain("https://example.com/page", skill);
  assertEquals(typeof result, "string");
  assertEquals(result!.includes("no network access"), true);
});

Deno.test("enforceSkillNetworkDomain: allows declared domain (exact hostname match)", () => {
  const skill = makeTestSkill({ networkDomains: ["example.com"] });
  const result = enforceSkillNetworkDomain("https://example.com/page", skill);
  assertEquals(result, null);
});

Deno.test("enforceSkillNetworkDomain: allows declared domain (subdomain match)", () => {
  const skill = makeTestSkill({ networkDomains: ["example.com"] });
  const result = enforceSkillNetworkDomain("https://api.example.com/data", skill);
  assertEquals(result, null);
});

Deno.test("enforceSkillNetworkDomain: blocks undeclared domain", () => {
  const skill = makeTestSkill({ networkDomains: ["example.com"] });
  const result = enforceSkillNetworkDomain("https://evil.com/exfil", skill);
  assertEquals(typeof result, "string");
  assertEquals(result!.includes("evil.com"), true);
});

Deno.test("enforceSkillNetworkDomain: blocks undeclared subdomain", () => {
  const skill = makeTestSkill({ networkDomains: ["api.example.com"] });
  // example.com is NOT a subdomain of api.example.com
  const result = enforceSkillNetworkDomain("https://example.com/page", skill);
  assertEquals(typeof result, "string");
});

// ─── enforceSkillClassificationCeiling ─────────────────────────────────────────

Deno.test("enforceSkillClassificationCeiling: allows equal taint (PUBLIC session -> PUBLIC ceiling)", () => {
  const skill = makeTestSkill({ classificationCeiling: "PUBLIC" });
  const result = enforceSkillClassificationCeiling("PUBLIC" as ClassificationLevel, skill);
  assertEquals(result, null);
});

Deno.test("enforceSkillClassificationCeiling: allows lower taint (PUBLIC session -> INTERNAL ceiling)", () => {
  const skill = makeTestSkill({ classificationCeiling: "INTERNAL" });
  const result = enforceSkillClassificationCeiling("PUBLIC" as ClassificationLevel, skill);
  assertEquals(result, null);
});

Deno.test("enforceSkillClassificationCeiling: blocks higher taint (CONFIDENTIAL session -> PUBLIC ceiling)", () => {
  const skill = makeTestSkill({ classificationCeiling: "PUBLIC" });
  const result = enforceSkillClassificationCeiling("CONFIDENTIAL" as ClassificationLevel, skill);
  assertEquals(typeof result, "string");
  assertEquals(result!.includes("CONFIDENTIAL"), true);
  assertEquals(result!.includes("PUBLIC"), true);
});

Deno.test("enforceSkillClassificationCeiling: blocks RESTRICTED session -> INTERNAL ceiling", () => {
  const skill = makeTestSkill({ classificationCeiling: "INTERNAL" });
  const result = enforceSkillClassificationCeiling("RESTRICTED" as ClassificationLevel, skill);
  assertEquals(typeof result, "string");
  assertEquals(result!.includes("write-down"), true);
});
