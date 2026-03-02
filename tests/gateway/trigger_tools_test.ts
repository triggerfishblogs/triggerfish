/**
 * Tests for trigger context tools — trigger_add_to_context.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";
import { createMemoryStorage } from "../../src/core/storage/memory.ts";
import { createTriggerStore } from "../../src/scheduler/triggers/store.ts";
import type { TriggerResult } from "../../src/scheduler/triggers/store.ts";
import {
  createTriggerClassificationToolExecutor,
  createTriggerToolExecutor,
  getTriggerContextToolDefinitions,
  getTriggerToolDefinitions,
} from "../../src/gateway/tools/trigger/trigger_tools.ts";
import type { TriggerToolContext } from "../../src/gateway/tools/trigger/trigger_tools.ts";

function makeResult(
  overrides: Partial<TriggerResult> = {},
): TriggerResult {
  return {
    id: crypto.randomUUID(),
    source: "trigger",
    message: "Nothing to report.",
    classification: "PUBLIC",
    firedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeCtx(
  overrides: Partial<TriggerToolContext> = {},
): TriggerToolContext {
  const store = createTriggerStore(createMemoryStorage());
  return {
    triggerStore: store,
    sessionTaint: "PUBLIC",
    ...overrides,
  };
}

// ── Tool definitions ──────────────────────────────────────────────────

Deno.test("getTriggerToolDefinitions: returns trigger_add_to_context and get_tool_classification", () => {
  const defs = getTriggerToolDefinitions();
  assertEquals(defs.length, 2);
  const names = defs.map((d) => d.name);
  assertEquals(names.includes("trigger_add_to_context"), true);
  assertEquals(names.includes("get_tool_classification"), true);
});

Deno.test("getTriggerContextToolDefinitions: returns only trigger_add_to_context", () => {
  const defs = getTriggerContextToolDefinitions();
  assertEquals(defs.length, 1);
  assertEquals(defs[0].name, "trigger_add_to_context");
});

// ── No result found ───────────────────────────────────────────────────

Deno.test("trigger_add_to_context: returns error when no trigger result exists", async () => {
  const ctx = makeCtx();
  const exec = createTriggerToolExecutor(ctx);
  const result = await exec("trigger_add_to_context", {});
  assertEquals(typeof result, "string");
  assertStringIncludes(result as string, "No trigger result found");
});

Deno.test("trigger_add_to_context: returns error for unknown source", async () => {
  const ctx = makeCtx();
  const exec = createTriggerToolExecutor(ctx);
  const result = await exec("trigger_add_to_context", {
    source: "cron:nonexistent",
  });
  assertStringIncludes(
    result as string,
    "No trigger result found for source: cron:nonexistent",
  );
});

// ── Classification allowed ────────────────────────────────────────────

Deno.test("trigger_add_to_context: returns trigger content when classification allows", async () => {
  const storage = createMemoryStorage();
  const store = createTriggerStore(storage);
  const triggerResult = makeResult({
    message: "Everything is fine.",
    classification: "PUBLIC",
  });
  await store.save(triggerResult);

  const ctx = makeCtx({ triggerStore: store, sessionTaint: "PUBLIC" });
  const exec = createTriggerToolExecutor(ctx);
  const result = await exec("trigger_add_to_context", {});
  assertStringIncludes(result as string, "Everything is fine.");
  assertStringIncludes(result as string, "PUBLIC");
  assertStringIncludes(result as string, "Trigger output loaded into context");
});

Deno.test("trigger_add_to_context: session taint < trigger classification (write-up) is allowed", async () => {
  const storage = createMemoryStorage();
  const store = createTriggerStore(storage);
  const triggerResult = makeResult({
    message: "Internal info.",
    classification: "INTERNAL",
  });
  await store.save(triggerResult);

  const ctx = makeCtx({ triggerStore: store, sessionTaint: "PUBLIC" });
  const exec = createTriggerToolExecutor(ctx);
  const result = await exec("trigger_add_to_context", {});
  assertStringIncludes(result as string, "Internal info.");
});

// ── Write-down enforcement ────────────────────────────────────────────

Deno.test("trigger_add_to_context: blocks when session taint > trigger classification (write-down)", async () => {
  const storage = createMemoryStorage();
  const store = createTriggerStore(storage);
  const triggerResult = makeResult({
    message: "Public news.",
    classification: "PUBLIC",
  });
  await store.save(triggerResult);

  const ctx = makeCtx({ triggerStore: store, sessionTaint: "CONFIDENTIAL" });
  const exec = createTriggerToolExecutor(ctx);
  const result = await exec("trigger_add_to_context", {});
  assertStringIncludes(result as string, "Write-down blocked");
  assertStringIncludes(result as string, "CONFIDENTIAL");
  assertStringIncludes(result as string, "PUBLIC");
});

Deno.test("trigger_add_to_context: RESTRICTED session blocked from PUBLIC trigger", async () => {
  const storage = createMemoryStorage();
  const store = createTriggerStore(storage);
  await store.save(makeResult({ classification: "PUBLIC" }));

  const ctx = makeCtx({ triggerStore: store, sessionTaint: "RESTRICTED" });
  const exec = createTriggerToolExecutor(ctx);
  const result = await exec("trigger_add_to_context", {});
  assertStringIncludes(result as string, "Write-down blocked");
});

// ── Taint escalation ──────────────────────────────────────────────────

Deno.test("trigger_add_to_context: escalates session taint when trigger classification is higher", async () => {
  const storage = createMemoryStorage();
  const store = createTriggerStore(storage);
  await store.save(
    makeResult({
      message: "Confidential info.",
      classification: "CONFIDENTIAL",
    }),
  );

  let escalatedTo: string | undefined;
  const ctx = makeCtx({
    triggerStore: store,
    sessionTaint: "PUBLIC",
    escalateTaint: (level) => {
      escalatedTo = level;
    },
  });
  const exec = createTriggerToolExecutor(ctx);
  await exec("trigger_add_to_context", {});
  assertEquals(escalatedTo, "CONFIDENTIAL");
});

Deno.test("trigger_add_to_context: does not escalate when trigger classification equals session taint", async () => {
  const storage = createMemoryStorage();
  const store = createTriggerStore(storage);
  await store.save(makeResult({ classification: "INTERNAL" }));

  let escalated = false;
  const ctx = makeCtx({
    triggerStore: store,
    sessionTaint: "INTERNAL",
    escalateTaint: () => {
      escalated = true;
    },
  });
  const exec = createTriggerToolExecutor(ctx);
  await exec("trigger_add_to_context", {});
  assertEquals(escalated, false);
});

// ── Source parameter ──────────────────────────────────────────────────

Deno.test("trigger_add_to_context: defaults to 'trigger' source when not specified", async () => {
  const storage = createMemoryStorage();
  const store = createTriggerStore(storage);
  await store.save(
    makeResult({ source: "trigger", message: "default source result" }),
  );
  await store.save(
    makeResult({ source: "cron:job-1", message: "cron result" }),
  );

  const ctx = makeCtx({ triggerStore: store, sessionTaint: "PUBLIC" });
  const exec = createTriggerToolExecutor(ctx);
  const result = await exec("trigger_add_to_context", {});
  assertStringIncludes(result as string, "default source result");
});

Deno.test("trigger_add_to_context: source parameter selects the correct stored result", async () => {
  const storage = createMemoryStorage();
  const store = createTriggerStore(storage);
  await store.save(
    makeResult({ source: "trigger", message: "periodic result" }),
  );
  await store.save(
    makeResult({ source: "cron:job-1", message: "cron job result" }),
  );

  const ctx = makeCtx({ triggerStore: store, sessionTaint: "PUBLIC" });
  const exec = createTriggerToolExecutor(ctx);
  const result = await exec("trigger_add_to_context", { source: "cron:job-1" });
  assertStringIncludes(result as string, "cron job result");
});

// ── Non-trigger tool names ────────────────────────────────────────────

Deno.test("trigger executor: returns null for unknown tool names", async () => {
  const ctx = makeCtx();
  const exec = createTriggerToolExecutor(ctx);
  const result = await exec("some_other_tool", {});
  assertEquals(result, null);
});

Deno.test("trigger executor: returns null for sessions_list", async () => {
  const ctx = makeCtx();
  const exec = createTriggerToolExecutor(ctx);
  const result = await exec("sessions_list", {});
  assertEquals(result, null);
});

// ── No context available ──────────────────────────────────────────────

Deno.test("trigger executor: returns error when context is undefined", async () => {
  const exec = createTriggerToolExecutor(undefined);
  const result = await exec("trigger_add_to_context", {});
  assertStringIncludes(result as string, "not available");
});

// ── get_tool_classification ───────────────────────────────────────────

Deno.test("get_tool_classification: returns PUBLIC for built-in tools", async () => {
  const map = new Map<
    string,
    "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED"
  >([
    ["gmail_", "CONFIDENTIAL"],
    ["github_", "INTERNAL"],
  ]);
  const exec = createTriggerClassificationToolExecutor(map);
  const result = await exec("get_tool_classification", {
    tools: ["web_search", "memory_save"],
  });
  const parsed = JSON.parse(result as string);
  assertEquals(parsed.classifications.length, 2);
  assertEquals(
    parsed.classifications.find((c: { tool: string }) =>
      c.tool === "web_search"
    ).classification,
    "PUBLIC",
  );
  assertEquals(
    parsed.classifications.find((c: { tool: string }) =>
      c.tool === "memory_save"
    ).classification,
    "PUBLIC",
  );
});

Deno.test("get_tool_classification: returns correct classification for integration tools", async () => {
  const map = new Map<
    string,
    "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED"
  >([
    ["gmail_", "CONFIDENTIAL"],
    ["github_", "INTERNAL"],
  ]);
  const exec = createTriggerClassificationToolExecutor(map);
  const result = await exec("get_tool_classification", {
    tools: ["gmail_list", "github_search_repos"],
  });
  const parsed = JSON.parse(result as string);
  assertEquals(
    parsed.classifications.find((c: { tool: string }) =>
      c.tool === "gmail_list"
    ).classification,
    "CONFIDENTIAL",
  );
  assertEquals(
    parsed.classifications.find((c: { tool: string }) =>
      c.tool === "github_search_repos"
    ).classification,
    "INTERNAL",
  );
});

Deno.test("get_tool_classification: recommended_order sorts lowest to highest", async () => {
  const map = new Map<
    string,
    "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED"
  >([
    ["gmail_", "CONFIDENTIAL"],
    ["github_", "INTERNAL"],
  ]);
  const exec = createTriggerClassificationToolExecutor(map);
  const result = await exec("get_tool_classification", {
    tools: ["gmail_list", "web_search", "github_search_repos"],
  });
  const parsed = JSON.parse(result as string);
  const order = parsed.recommended_order.map((c: { classification: string }) =>
    c.classification
  );
  // web_search = PUBLIC, github = INTERNAL, gmail = CONFIDENTIAL
  assertEquals(order[0], "PUBLIC");
  assertEquals(order[1], "INTERNAL");
  assertEquals(order[2], "CONFIDENTIAL");
});

Deno.test("get_tool_classification: returns error for empty tools list", async () => {
  const map = new Map<
    string,
    "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED"
  >();
  const exec = createTriggerClassificationToolExecutor(map);
  const result = await exec("get_tool_classification", { tools: [] });
  assertStringIncludes(result as string, "Error");
});

Deno.test("get_tool_classification: returns null for non-matching tool names", async () => {
  const map = new Map<
    string,
    "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED"
  >();
  const exec = createTriggerClassificationToolExecutor(map);
  const result = await exec("some_other_tool", { tools: ["foo"] });
  assertEquals(result, null);
});

Deno.test("get_tool_classification: includes instruction in output", async () => {
  const map = new Map<
    string,
    "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED"
  >([
    ["gmail_", "CONFIDENTIAL"],
  ]);
  const exec = createTriggerClassificationToolExecutor(map);
  const result = await exec("get_tool_classification", {
    tools: ["gmail_list"],
  });
  const parsed = JSON.parse(result as string);
  assertStringIncludes(parsed.instruction, "lowest classification first");
});
