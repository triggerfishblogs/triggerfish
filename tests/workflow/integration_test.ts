import { assertEquals } from "@std/assert";
import {
  createWorkflowStore,
  createWorkflowToolExecutor,
  getWorkflowToolDefinitions,
  WORKFLOW_SYSTEM_PROMPT,
} from "../../src/workflow/mod.ts";
import type { StorageProvider } from "../../src/core/storage/provider.ts";
import type { ClassificationLevel } from "../../src/core/types/classification.ts";

function createMemoryStorage(): StorageProvider {
  const data = new Map<string, string>();
  return {
    set(key: string, value: string): Promise<void> {
      data.set(key, value);
      return Promise.resolve();
    },
    get(key: string): Promise<string | null> {
      return Promise.resolve(data.get(key) ?? null);
    },
    delete(key: string): Promise<void> {
      data.delete(key);
      return Promise.resolve();
    },
    list(prefix?: string): Promise<string[]> {
      const keys: string[] = [];
      for (const k of data.keys()) {
        if (!prefix || k.startsWith(prefix)) keys.push(k);
      }
      return Promise.resolve(keys);
    },
    close(): Promise<void> {
      return Promise.resolve();
    },
  };
}

Deno.test("integration: full workflow lifecycle — save, run, history", async () => {
  const storage = createMemoryStorage();
  const store = createWorkflowStore(storage);
  const toolCalls: { name: string; input: Record<string, unknown> }[] = [];

  const toolExecutor = (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string> => {
    toolCalls.push({ name, input });
    if (name === "web_search") {
      return Promise.resolve(
        JSON.stringify({ results: ["result1", "result2"] }),
      );
    }
    if (name === "llm_task") {
      return Promise.resolve(
        JSON.stringify({ summary: "AI is advancing rapidly" }),
      );
    }
    return Promise.resolve(JSON.stringify({ ok: true }));
  };

  const executor = createWorkflowToolExecutor({
    store,
    toolExecutor,
    getSessionTaint: () => "PUBLIC" as ClassificationLevel,
  });

  // Step 1: Save a workflow
  const saveResult = await executor("workflow_save", {
    name: "research-pipeline",
    yaml: `
document:
  dsl: "1.0"
  namespace: test
  name: research-pipeline
  version: "1.0.0"
  description: "Search and summarize a topic"
do:
  - search:
      call: triggerfish:web_search
      with:
        query: "\${ .topic }"
  - analyze:
      call: triggerfish:llm
      with:
        prompt: "Summarize the search results"
  - result:
      set:
        done: true
`,
    description: "Search and summarize pipeline",
  });

  const saved = JSON.parse(saveResult!);
  assertEquals(saved.saved, "research-pipeline");
  assertEquals(saved.taskCount, 3);

  // Step 2: List workflows
  const listResult = await executor("workflow_list", {});
  const list = JSON.parse(listResult!);
  assertEquals(list.workflows.length, 1);
  assertEquals(list.workflows[0].name, "research-pipeline");

  // Step 3: Run the workflow by name
  const runResult = await executor("workflow_run", {
    name: "research-pipeline",
    input: JSON.stringify({ topic: "artificial intelligence" }),
  });

  const run = JSON.parse(runResult!);
  assertEquals(run.status, "completed");
  assertEquals(run.output.done, true);
  assertEquals(toolCalls.length, 2);
  assertEquals(toolCalls[0].name, "web_search");
  assertEquals(toolCalls[0].input.query, "artificial intelligence");
  assertEquals(toolCalls[1].name, "llm_task");

  // Step 4: Check history
  const histResult = await executor("workflow_history", {});
  const hist = JSON.parse(histResult!);
  assertEquals(hist.runs.length, 1);
  assertEquals(hist.runs[0].workflowName, "research-pipeline");
  assertEquals(hist.runs[0].status, "completed");
});

Deno.test("integration: classification ceiling halts workflow", async () => {
  const storage = createMemoryStorage();
  const store = createWorkflowStore(storage);
  let currentTaint: ClassificationLevel = "PUBLIC";

  const toolExecutor = (
    name: string,
    _input: Record<string, unknown>,
  ): Promise<string> => {
    // Simulate taint escalation after first tool call
    if (name === "web_fetch") {
      currentTaint = "CONFIDENTIAL";
    }
    return Promise.resolve(JSON.stringify({ ok: true }));
  };

  const executor = createWorkflowToolExecutor({
    store,
    toolExecutor,
    getSessionTaint: () => currentTaint,
  });

  const result = await executor("workflow_run", {
    yaml: `
document:
  dsl: "1.0"
  namespace: test
  name: ceiling-breach
classification_ceiling: PUBLIC
do:
  - fetch:
      call: http
      with:
        endpoint: https://secret-api.example.com
  - shouldNotRun:
      set:
        reached: true
`,
  });

  const run = JSON.parse(result!);
  assertEquals(run.status, "failed");
  assertEquals(run.error.includes("ceiling"), true);
  assertEquals(run.output.reached, undefined);
});

Deno.test("integration: sub-workflow resolution from store", async () => {
  const storage = createMemoryStorage();
  const store = createWorkflowStore(storage);

  const toolExecutor = (): Promise<string> =>
    Promise.resolve(JSON.stringify({ ok: true }));

  const executor = createWorkflowToolExecutor({
    store,
    toolExecutor,
    getSessionTaint: () => "PUBLIC" as ClassificationLevel,
  });

  // Save the sub-workflow first
  await executor("workflow_save", {
    name: "sub-task",
    yaml: `
document:
  dsl: "1.0"
  namespace: test
  name: sub-task
do:
  - compute:
      set:
        subResult: "computed"
`,
  });

  // Run a workflow that calls the sub-workflow
  const result = await executor("workflow_run", {
    yaml: `
document:
  dsl: "1.0"
  namespace: test
  name: main-with-sub
do:
  - init:
      set:
        inputData: "test"
  - delegate:
      run:
        workflow:
          name: sub-task
  - finish:
      set:
        mainDone: true
`,
  });

  const run = JSON.parse(result!);
  assertEquals(run.status, "completed");
  assertEquals(run.output.mainDone, true);
  const delegateOutput = run.output.delegate as Record<string, unknown>;
  assertEquals(delegateOutput.subResult, "computed");
});

Deno.test("integration: tool definitions are well-formed", () => {
  const defs = getWorkflowToolDefinitions();
  for (const def of defs) {
    assertEquals(typeof def.name, "string");
    assertEquals(def.name.length > 0, true);
    assertEquals(typeof def.description, "string");
    assertEquals(def.description.length > 0, true);
    assertEquals(typeof def.parameters, "object");
  }
});

Deno.test("integration: system prompt is non-empty", () => {
  assertEquals(WORKFLOW_SYSTEM_PROMPT.length > 100, true);
  assertEquals(WORKFLOW_SYSTEM_PROMPT.includes("workflow"), true);
});

Deno.test("integration: for loop with call tasks", async () => {
  const storage = createMemoryStorage();
  const store = createWorkflowStore(storage);
  const calls: string[] = [];

  const toolExecutor = (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string> => {
    calls.push(`${name}:${input.query ?? input.task ?? ""}`);
    return Promise.resolve(JSON.stringify({ result: "ok" }));
  };

  const executor = createWorkflowToolExecutor({
    store,
    toolExecutor,
    getSessionTaint: () => "PUBLIC" as ClassificationLevel,
  });

  const result = await executor("workflow_run", {
    yaml: `
document:
  dsl: "1.0"
  namespace: test
  name: batch-search
do:
  - setup:
      set:
        topics:
          - "AI news"
          - "ML trends"
          - "deep learning"
  - searchAll:
      for:
        each: topic
        in: "\${ .topics }"
      do:
        - search:
            call: triggerfish:web_search
            with:
              query: "\${ .topic }"
`,
  });

  const run = JSON.parse(result!);
  assertEquals(run.status, "completed");
  assertEquals(calls.length, 3);
  assertEquals(calls[0], "web_search:AI news");
  assertEquals(calls[1], "web_search:ML trends");
  assertEquals(calls[2], "web_search:deep learning");
});
