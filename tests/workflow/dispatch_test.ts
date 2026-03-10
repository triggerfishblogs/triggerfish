import { assertEquals } from "@std/assert";
import {
  isDispatchError,
  resolveCallDispatch,
} from "../../src/workflow/dispatch.ts";
import { createWorkflowContext } from "../../src/workflow/context.ts";
import type { CallTask } from "../../src/workflow/types.ts";

function makeCallTask(call: string, args?: Record<string, unknown>): CallTask {
  return { type: "call", call, with: args };
}

Deno.test("resolveCallDispatch: http maps to web_fetch", () => {
  const ctx = createWorkflowContext({});
  const result = resolveCallDispatch(
    makeCallTask("http", {
      endpoint: "https://api.example.com",
      method: "POST",
    }),
    ctx,
  );
  assertEquals(isDispatchError(result), false);
  if (!isDispatchError(result)) {
    assertEquals(result.toolName, "web_fetch");
    assertEquals(result.input.url, "https://api.example.com");
    assertEquals(result.input.method, "POST");
  }
});

Deno.test("resolveCallDispatch: triggerfish:llm maps to llm_task", () => {
  const ctx = createWorkflowContext({});
  const result = resolveCallDispatch(
    makeCallTask("triggerfish:llm", { prompt: "Analyze data" }),
    ctx,
  );
  assertEquals(isDispatchError(result), false);
  if (!isDispatchError(result)) {
    assertEquals(result.toolName, "llm_task");
    assertEquals(result.input.task, "Analyze data");
  }
});

Deno.test("resolveCallDispatch: triggerfish:agent maps to subagent", () => {
  const ctx = createWorkflowContext({});
  const result = resolveCallDispatch(
    makeCallTask("triggerfish:agent", {
      prompt: "Do task",
      agent: "researcher",
    }),
    ctx,
  );
  assertEquals(isDispatchError(result), false);
  if (!isDispatchError(result)) {
    assertEquals(result.toolName, "subagent");
    assertEquals(result.input.agent, "researcher");
  }
});

Deno.test("resolveCallDispatch: triggerfish:memory save", () => {
  const ctx = createWorkflowContext({});
  const result = resolveCallDispatch(
    makeCallTask("triggerfish:memory", {
      operation: "save",
      key: "k1",
      content: "v1",
    }),
    ctx,
  );
  assertEquals(isDispatchError(result), false);
  if (!isDispatchError(result)) {
    assertEquals(result.toolName, "memory_save");
    assertEquals(result.input.key, "k1");
    assertEquals(result.input.content, "v1");
    assertEquals("operation" in result.input, false);
  }
});

Deno.test("resolveCallDispatch: triggerfish:memory search", () => {
  const ctx = createWorkflowContext({});
  const result = resolveCallDispatch(
    makeCallTask("triggerfish:memory", { operation: "search", query: "q" }),
    ctx,
  );
  assertEquals(isDispatchError(result), false);
  if (!isDispatchError(result)) {
    assertEquals(result.toolName, "memory_search");
  }
});

Deno.test("resolveCallDispatch: triggerfish:memory missing operation", () => {
  const ctx = createWorkflowContext({});
  const result = resolveCallDispatch(
    makeCallTask("triggerfish:memory", {}),
    ctx,
  );
  assertEquals(isDispatchError(result), true);
  if (isDispatchError(result)) {
    assertEquals(result.error.includes("operation"), true);
  }
});

Deno.test("resolveCallDispatch: triggerfish:web_search", () => {
  const ctx = createWorkflowContext({});
  const result = resolveCallDispatch(
    makeCallTask("triggerfish:web_search", { query: "test query" }),
    ctx,
  );
  assertEquals(isDispatchError(result), false);
  if (!isDispatchError(result)) {
    assertEquals(result.toolName, "web_search");
    assertEquals(result.input.query, "test query");
  }
});

Deno.test("resolveCallDispatch: triggerfish:web_fetch", () => {
  const ctx = createWorkflowContext({});
  const result = resolveCallDispatch(
    makeCallTask("triggerfish:web_fetch", { url: "https://example.com" }),
    ctx,
  );
  assertEquals(isDispatchError(result), false);
  if (!isDispatchError(result)) {
    assertEquals(result.toolName, "web_fetch");
    assertEquals(result.input.url, "https://example.com");
  }
});

Deno.test("resolveCallDispatch: triggerfish:mcp", () => {
  const ctx = createWorkflowContext({});
  const result = resolveCallDispatch(
    makeCallTask("triggerfish:mcp", {
      server: "filesystem",
      tool: "list_files",
      arguments: { path: "/tmp" },
    }),
    ctx,
  );
  assertEquals(isDispatchError(result), false);
  if (!isDispatchError(result)) {
    assertEquals(result.toolName, "mcp__filesystem__list_files");
    assertEquals(result.input.path, "/tmp");
  }
});

Deno.test("resolveCallDispatch: triggerfish:mcp missing fields", () => {
  const ctx = createWorkflowContext({});
  const result = resolveCallDispatch(
    makeCallTask("triggerfish:mcp", { server: "x" }),
    ctx,
  );
  assertEquals(isDispatchError(result), true);
});

Deno.test("resolveCallDispatch: triggerfish:message", () => {
  const ctx = createWorkflowContext({});
  const result = resolveCallDispatch(
    makeCallTask("triggerfish:message", { channel: "telegram", text: "hello" }),
    ctx,
  );
  assertEquals(isDispatchError(result), false);
  if (!isDispatchError(result)) {
    assertEquals(result.toolName, "send_message");
    assertEquals(result.input.channel, "telegram");
    assertEquals(result.input.text, "hello");
  }
});

Deno.test("resolveCallDispatch: unknown call type", () => {
  const ctx = createWorkflowContext({});
  const result = resolveCallDispatch(
    makeCallTask("totally_unknown"),
    ctx,
  );
  assertEquals(isDispatchError(result), true);
});

Deno.test("resolveCallDispatch: unsupported CNCF types", () => {
  const ctx = createWorkflowContext({});
  for (const t of ["grpc", "openapi", "asyncapi"]) {
    const result = resolveCallDispatch(makeCallTask(t), ctx);
    assertEquals(isDispatchError(result), true);
  }
});

Deno.test("resolveCallDispatch: resolves expressions in with args", () => {
  const ctx = createWorkflowContext({ targetUrl: "https://resolved.com" });
  const result = resolveCallDispatch(
    makeCallTask("http", { endpoint: "${ .targetUrl }", method: "GET" }),
    ctx,
  );
  assertEquals(isDispatchError(result), false);
  if (!isDispatchError(result)) {
    assertEquals(result.input.url, "https://resolved.com");
  }
});
