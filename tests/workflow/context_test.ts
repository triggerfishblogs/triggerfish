import { assertEquals } from "@std/assert";
import { createWorkflowContext } from "../../src/workflow/context.ts";

Deno.test("WorkflowContext: starts with initial data", () => {
  const ctx = createWorkflowContext({ name: "test", count: 5 });
  assertEquals(ctx.data.name, "test");
  assertEquals(ctx.data.count, 5);
});

Deno.test("WorkflowContext: starts empty when no initial data", () => {
  const ctx = createWorkflowContext();
  assertEquals(Object.keys(ctx.data).length, 0);
});

Deno.test("WorkflowContext: set creates new context (immutable)", () => {
  const ctx1 = createWorkflowContext({ x: 1 });
  const ctx2 = ctx1.set("y", 2);
  assertEquals(ctx1.data.y, undefined);
  assertEquals(ctx2.data.y, 2);
  assertEquals(ctx2.data.x, 1);
});

Deno.test("WorkflowContext: set nested path", () => {
  const ctx = createWorkflowContext({});
  const updated = ctx.set("result.data", "hello");
  assertEquals(updated.resolve(".result.data"), "hello");
});

Deno.test("WorkflowContext: merge adds multiple values", () => {
  const ctx = createWorkflowContext({ a: 1 });
  const merged = ctx.merge({ b: 2, c: 3 });
  assertEquals(merged.data.a, 1);
  assertEquals(merged.data.b, 2);
  assertEquals(merged.data.c, 3);
});

Deno.test("WorkflowContext: merge resolves expressions in values", () => {
  const ctx = createWorkflowContext({ x: 42 });
  const merged = ctx.merge({ doubled: "${ .x }" });
  assertEquals(merged.data.doubled, 42);
});

Deno.test("WorkflowContext: resolve simple dot-path", () => {
  const ctx = createWorkflowContext({ name: "alice" });
  assertEquals(ctx.resolve(".name"), "alice");
  assertEquals(ctx.resolve("$.name"), "alice");
  assertEquals(ctx.resolve("name"), "alice");
});

Deno.test("WorkflowContext: resolve nested path", () => {
  const ctx = createWorkflowContext({
    result: { items: [{ id: 1 }, { id: 2 }] },
  });
  assertEquals(ctx.resolve(".result.items[0].id"), 1);
  assertEquals(ctx.resolve(".result.items[1].id"), 2);
});

Deno.test("WorkflowContext: resolve returns undefined for missing path", () => {
  const ctx = createWorkflowContext({});
  assertEquals(ctx.resolve(".missing.path"), undefined);
});

Deno.test("WorkflowContext: resolve root returns full data", () => {
  const ctx = createWorkflowContext({ x: 1 });
  const root = ctx.resolve(".");
  assertEquals((root as Record<string, unknown>).x, 1);
});

Deno.test("WorkflowContext: evaluate single expression returns raw value", () => {
  const ctx = createWorkflowContext({ count: 42 });
  assertEquals(ctx.evaluate("${ .count }"), 42);
});

Deno.test("WorkflowContext: evaluate string interpolation", () => {
  const ctx = createWorkflowContext({ name: "world" });
  assertEquals(ctx.evaluate("Hello ${ .name }!"), "Hello world!");
});

Deno.test("WorkflowContext: evaluate comparison", () => {
  const ctx = createWorkflowContext({ x: 5 });
  assertEquals(ctx.evaluate('${ .x > 3 }'), true);
  assertEquals(ctx.evaluate('${ .x == 5 }'), true);
  assertEquals(ctx.evaluate('${ .x != 5 }'), false);
  assertEquals(ctx.evaluate('${ .x < 3 }'), false);
});

Deno.test("WorkflowContext: evaluate string comparison", () => {
  const ctx = createWorkflowContext({ status: "ok" });
  assertEquals(ctx.evaluate('${ .status == "ok" }'), true);
  assertEquals(ctx.evaluate('${ .status == "fail" }'), false);
});

Deno.test("WorkflowContext: evaluate arithmetic", () => {
  const ctx = createWorkflowContext({ a: 10, b: 3 });
  assertEquals(ctx.evaluate("${ .a + .b }"), 13);
  assertEquals(ctx.evaluate("${ .a - .b }"), 7);
  assertEquals(ctx.evaluate("${ .a * .b }"), 30);
});

Deno.test("WorkflowContext: evaluate literal values", () => {
  const ctx = createWorkflowContext({});
  assertEquals(ctx.evaluate("${ 42 }"), 42);
  assertEquals(ctx.evaluate('${ "hello" }'), "hello");
  assertEquals(ctx.evaluate("${ true }"), true);
  assertEquals(ctx.evaluate("${ null }"), null);
});

Deno.test("WorkflowContext: evaluate non-expression string returns as-is", () => {
  const ctx = createWorkflowContext({});
  assertEquals(ctx.evaluate("plain text"), "plain text");
});

Deno.test("WorkflowContext: evaluateCondition truthy values", () => {
  const ctx = createWorkflowContext({ yes: true, count: 5, name: "a", items: [1] });
  assertEquals(ctx.evaluateCondition("${ .yes }"), true);
  assertEquals(ctx.evaluateCondition("${ .count }"), true);
  assertEquals(ctx.evaluateCondition("${ .name }"), true);
  assertEquals(ctx.evaluateCondition("${ .items }"), true);
});

Deno.test("WorkflowContext: evaluateCondition falsy values", () => {
  const ctx = createWorkflowContext({ no: false, zero: 0, empty: "", nothing: null });
  assertEquals(ctx.evaluateCondition("${ .no }"), false);
  assertEquals(ctx.evaluateCondition("${ .zero }"), false);
  assertEquals(ctx.evaluateCondition("${ .empty }"), false);
  assertEquals(ctx.evaluateCondition("${ .nothing }"), false);
  assertEquals(ctx.evaluateCondition("${ .missing }"), false);
});

Deno.test("WorkflowContext: resolveObject deep-resolves expressions", () => {
  const ctx = createWorkflowContext({ user: "alice", id: 123 });
  const resolved = ctx.resolveObject({
    greeting: "Hello ${ .user }!",
    userId: "${ .id }",
    nested: {
      ref: "${ .user }",
    },
    literal: "no expressions here",
    array: ["${ .user }", "static"],
  });
  assertEquals(resolved.greeting, "Hello alice!");
  assertEquals(resolved.userId, 123);
  assertEquals((resolved.nested as Record<string, unknown>).ref, "alice");
  assertEquals(resolved.literal, "no expressions here");
  assertEquals((resolved.array as unknown[])[0], "alice");
  assertEquals((resolved.array as unknown[])[1], "static");
});

Deno.test("WorkflowContext: immutability - original data not affected", () => {
  const initial = { x: 1 };
  const ctx = createWorkflowContext(initial);
  ctx.set("x", 99);
  assertEquals(initial.x, 1);
  assertEquals(ctx.data.x, 1);
});
