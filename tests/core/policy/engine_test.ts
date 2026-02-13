/**
 * Phase 2: Policy Engine Core
 * Tests MUST FAIL until engine.ts and rules.ts are implemented.
 */
import { assertEquals, assertExists } from "@std/assert";
import {
  type PolicyAction,
  type HookType,
  createPolicyEngine,
} from "../../src/core/policy/mod.ts";

Deno.test("createPolicyEngine: returns engine with evaluate method", () => {
  const engine = createPolicyEngine();
  assertExists(engine.evaluate);
  assertExists(engine.addRule);
  assertExists(engine.removeRule);
  assertExists(engine.getRules);
});

Deno.test("evaluate: returns ALLOW when no rules match", () => {
  const engine = createPolicyEngine();
  const result = engine.evaluate("PRE_OUTPUT" as HookType, { session_taint: "PUBLIC" });
  assertEquals(result.action, "ALLOW" as PolicyAction);
});

Deno.test("evaluate: first matching rule wins", () => {
  const engine = createPolicyEngine();
  engine.addRule({
    id: "rule-1",
    priority: 100,
    hook: "PRE_OUTPUT" as HookType,
    conditions: [{ field: "blocked", operator: "equals", value: "true" }],
    action: "BLOCK" as PolicyAction,
    message: "blocked by rule-1",
  });
  engine.addRule({
    id: "rule-2",
    priority: 50,
    hook: "PRE_OUTPUT" as HookType,
    conditions: [{ field: "blocked", operator: "equals", value: "true" }],
    action: "ALLOW" as PolicyAction,
  });
  const result = engine.evaluate("PRE_OUTPUT" as HookType, { blocked: "true" });
  assertEquals(result.action, "BLOCK");
  assertEquals(result.ruleId, "rule-1");
});

Deno.test("evaluate: rules sorted by priority descending", () => {
  const engine = createPolicyEngine();
  engine.addRule({
    id: "low-priority",
    priority: 10,
    hook: "PRE_OUTPUT" as HookType,
    conditions: [{ field: "x", operator: "equals", value: "1" }],
    action: "BLOCK" as PolicyAction,
  });
  engine.addRule({
    id: "high-priority",
    priority: 1000,
    hook: "PRE_OUTPUT" as HookType,
    conditions: [{ field: "x", operator: "equals", value: "1" }],
    action: "ALLOW" as PolicyAction,
  });
  const result = engine.evaluate("PRE_OUTPUT" as HookType, { x: "1" });
  assertEquals(result.action, "ALLOW");
  assertEquals(result.ruleId, "high-priority");
});

Deno.test("evaluate: conditions use correct operators", () => {
  const engine = createPolicyEngine();
  engine.addRule({
    id: "gt-rule",
    priority: 100,
    hook: "PRE_OUTPUT" as HookType,
    conditions: [{ field: "count", operator: "gt", value: 5 }],
    action: "BLOCK" as PolicyAction,
  });
  assertEquals(engine.evaluate("PRE_OUTPUT" as HookType, { count: 10 }).action, "BLOCK");
  assertEquals(engine.evaluate("PRE_OUTPUT" as HookType, { count: 3 }).action, "ALLOW");
});

Deno.test("getRules: returns rules for specific hook only", () => {
  const engine = createPolicyEngine();
  engine.addRule({
    id: "output-rule",
    priority: 100,
    hook: "PRE_OUTPUT" as HookType,
    conditions: [],
    action: "BLOCK" as PolicyAction,
  });
  engine.addRule({
    id: "input-rule",
    priority: 100,
    hook: "PRE_CONTEXT_INJECTION" as HookType,
    conditions: [],
    action: "BLOCK" as PolicyAction,
  });
  const outputRules = engine.getRules("PRE_OUTPUT" as HookType);
  assertEquals(outputRules.length, 1);
  assertEquals(outputRules[0].id, "output-rule");
});

Deno.test("loadYaml: parses valid policy YAML", () => {
  const engine = createPolicyEngine();
  const yaml = `
rules:
  - id: yaml-rule
    priority: 100
    hook: PRE_OUTPUT
    conditions:
      - field: session_taint
        operator: equals
        value: RESTRICTED
    action: BLOCK
    message: "Blocked by YAML rule"
`;
  engine.loadYaml(yaml);
  const rules = engine.getRules("PRE_OUTPUT" as HookType);
  assertEquals(rules.length, 1);
  assertEquals(rules[0].id, "yaml-rule");
});

Deno.test("removeRule: removes rule by ID", () => {
  const engine = createPolicyEngine();
  engine.addRule({
    id: "to-remove",
    priority: 100,
    hook: "PRE_OUTPUT" as HookType,
    conditions: [],
    action: "BLOCK" as PolicyAction,
  });
  assertEquals(engine.getRules("PRE_OUTPUT" as HookType).length, 1);
  engine.removeRule("to-remove");
  assertEquals(engine.getRules("PRE_OUTPUT" as HookType).length, 0);
});
