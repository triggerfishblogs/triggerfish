/**
 * Tests for skill runtime enforcement functions.
 *
 * Covers filterToolsForActiveSkill, checkSkillNetworkDomain,
 * and checkSkillClassificationCeiling.
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  checkSkillClassificationCeiling,
  checkSkillNetworkDomain,
  filterToolsForActiveSkill,
} from "../../../src/tools/skills/enforcer.ts";
import type { Skill } from "../../../src/tools/skills/loader.ts";
import type { ToolDefinition } from "../../../src/core/types/tool.ts";

// ─── Test fixtures ────────────────────────────────────────────────────────────

function makeSkill(overrides: Partial<Skill> = {}): Skill {
  return {
    name: "test-skill",
    description: "A test skill",
    classificationCeiling: "PUBLIC",
    requiresTools: [],
    networkDomains: [],
    path: "/tmp/test-skill",
    source: "bundled",
    ...overrides,
  };
}

function makeTool(name: string): ToolDefinition {
  return {
    name,
    description: `Tool ${name}`,
    parameters: {},
  };
}

// ─── filterToolsForActiveSkill ────────────────────────────────────────────────

Deno.test("filterToolsForActiveSkill: returns all tools when activeSkill is null", () => {
  const tools = [makeTool("web_fetch"), makeTool("memory_search")];
  const result = filterToolsForActiveSkill(tools, null);
  assertEquals(result.length, 2);
});

Deno.test("filterToolsForActiveSkill: returns all tools when requiresTools is empty", () => {
  const tools = [makeTool("web_fetch"), makeTool("memory_search")];
  const skill = makeSkill({ requiresTools: [] });
  const result = filterToolsForActiveSkill(tools, skill);
  assertEquals(result.length, 2);
});

Deno.test("filterToolsForActiveSkill: filters to declared tools when skill active", () => {
  const tools = [
    makeTool("web_fetch"),
    makeTool("memory_search"),
    makeTool("todo_add"),
  ];
  const skill = makeSkill({ requiresTools: ["web_fetch"] });
  const result = filterToolsForActiveSkill(tools, skill);
  const names = result.map((t) => t.name);
  assertEquals(names.includes("web_fetch"), true);
  assertEquals(names.includes("memory_search"), false);
  assertEquals(names.includes("todo_add"), false);
});

Deno.test("filterToolsForActiveSkill: always preserves read_skill for skill switching", () => {
  const tools = [
    makeTool("web_fetch"),
    makeTool("read_skill"),
    makeTool("memory_search"),
  ];
  const skill = makeSkill({ requiresTools: ["web_fetch"] });
  const result = filterToolsForActiveSkill(tools, skill);
  const names = result.map((t) => t.name);
  assertEquals(names.includes("read_skill"), true);
  assertEquals(names.includes("memory_search"), false);
});

Deno.test("filterToolsForActiveSkill: multiple declared tools are all preserved", () => {
  const tools = [
    makeTool("web_fetch"),
    makeTool("web_search"),
    makeTool("memory_search"),
    makeTool("todo_add"),
  ];
  const skill = makeSkill({ requiresTools: ["web_fetch", "web_search"] });
  const result = filterToolsForActiveSkill(tools, skill);
  const names = result.map((t) => t.name);
  assertEquals(names.includes("web_fetch"), true);
  assertEquals(names.includes("web_search"), true);
  assertEquals(names.includes("memory_search"), false);
});

// ─── checkSkillNetworkDomain ──────────────────────────────────────────────────

Deno.test("checkSkillNetworkDomain: returns null when activeSkill is null", () => {
  const result = checkSkillNetworkDomain("https://example.com/api", null);
  assertEquals(result, null);
});

Deno.test("checkSkillNetworkDomain: returns null when networkDomains is empty", () => {
  const skill = makeSkill({ networkDomains: [] });
  const result = checkSkillNetworkDomain("https://example.com/api", skill);
  assertEquals(result, null);
});

Deno.test("checkSkillNetworkDomain: allows exact domain match", () => {
  const skill = makeSkill({ networkDomains: ["api.example.com"] });
  const result = checkSkillNetworkDomain("https://api.example.com/data", skill);
  assertEquals(result, null);
});

Deno.test("checkSkillNetworkDomain: allows subdomain of declared domain", () => {
  const skill = makeSkill({ networkDomains: ["example.com"] });
  const result = checkSkillNetworkDomain("https://api.example.com/data", skill);
  assertEquals(result, null);
});

Deno.test("checkSkillNetworkDomain: blocks undeclared domain", () => {
  const skill = makeSkill({ networkDomains: ["api.example.com"] });
  const result = checkSkillNetworkDomain(
    "https://evil.example.org/steal",
    skill,
  );
  assertStringIncludes(result!, "evil.example.org");
  assertStringIncludes(result!, "api.example.com");
});

Deno.test("checkSkillNetworkDomain: blocks partial domain match that is not a subdomain", () => {
  const skill = makeSkill({ networkDomains: ["example.com"] });
  // notexample.com should NOT match example.com
  const result = checkSkillNetworkDomain(
    "https://notexample.com/api",
    skill,
  );
  assertStringIncludes(result!, "notexample.com");
});

// ─── checkSkillClassificationCeiling ─────────────────────────────────────────

Deno.test("checkSkillClassificationCeiling: allows when taint equals ceiling (PUBLIC→PUBLIC)", () => {
  const skill = makeSkill({ classificationCeiling: "PUBLIC" });
  const result = checkSkillClassificationCeiling("PUBLIC", skill);
  assertEquals(result, null);
});

Deno.test("checkSkillClassificationCeiling: allows when taint is lower than ceiling", () => {
  const skill = makeSkill({ classificationCeiling: "INTERNAL" });
  const result = checkSkillClassificationCeiling("PUBLIC", skill);
  assertEquals(result, null);
});

Deno.test("checkSkillClassificationCeiling: blocks when taint exceeds ceiling", () => {
  const skill = makeSkill({ name: "public-skill", classificationCeiling: "PUBLIC" });
  const result = checkSkillClassificationCeiling("CONFIDENTIAL", skill);
  assertStringIncludes(result!, "public-skill");
  assertStringIncludes(result!, "PUBLIC");
  assertStringIncludes(result!, "CONFIDENTIAL");
});

Deno.test("checkSkillClassificationCeiling: blocks RESTRICTED session with INTERNAL ceiling", () => {
  const skill = makeSkill({ classificationCeiling: "INTERNAL" });
  const result = checkSkillClassificationCeiling("RESTRICTED", skill);
  assertStringIncludes(result!, "INTERNAL");
  assertStringIncludes(result!, "RESTRICTED");
});

Deno.test("checkSkillClassificationCeiling: allows CONFIDENTIAL ceiling with INTERNAL session", () => {
  const skill = makeSkill({ classificationCeiling: "CONFIDENTIAL" });
  const result = checkSkillClassificationCeiling("INTERNAL", skill);
  assertEquals(result, null);
});
