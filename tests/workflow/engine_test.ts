import { assertEquals } from "@std/assert";
import { executeWorkflow } from "../../src/workflow/engine.ts";
import { parseWorkflowYaml } from "../../src/workflow/parser.ts";
import type { WorkflowDefinition } from "../../src/workflow/types.ts";
import type { ClassificationLevel } from "../../src/core/types/classification.ts";

/** Mock tool executor that records calls and returns canned responses. */
function createMockExecutor(
  responses?: Record<string, string>,
): {
  executor: (name: string, input: Record<string, unknown>) => Promise<string>;
  calls: { name: string; input: Record<string, unknown> }[];
} {
  const calls: { name: string; input: Record<string, unknown> }[] = [];
  const executor = (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string> => {
    calls.push({ name, input });
    return Promise.resolve(responses?.[name] ?? JSON.stringify({ ok: true }));
  };
  return { executor, calls };
}

function parse(yaml: string): WorkflowDefinition {
  const result = parseWorkflowYaml(yaml);
  if (!result.ok) throw new Error(`Parse failed: ${result.error}`);
  return result.value;
}

Deno.test("engine: executes simple set task", async () => {
  const def = parse(`
document:
  dsl: "1.0"
  namespace: test
  name: simple-set
do:
  - init:
      set:
        greeting: "hello"
        count: 42
`);

  const { executor } = createMockExecutor();
  const result = await executeWorkflow({
    definition: def,
    toolExecutor: executor,
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.status, "completed");
  assertEquals(result.value.output.greeting, "hello");
  assertEquals(result.value.output.count, 42);
});

Deno.test("engine: executes call task and stores result", async () => {
  const def = parse(`
document:
  dsl: "1.0"
  namespace: test
  name: call-test
do:
  - fetchData:
      call: http
      with:
        endpoint: https://api.example.com
        method: GET
`);

  const { executor, calls } = createMockExecutor({
    web_fetch: JSON.stringify({ data: [1, 2, 3] }),
  });

  const result = await executeWorkflow({
    definition: def,
    toolExecutor: executor,
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.status, "completed");
  assertEquals(calls.length, 1);
  assertEquals(calls[0].name, "web_fetch");
  assertEquals(result.value.output.fetchData, { data: [1, 2, 3] });
});

Deno.test("engine: set + call chain passes data between tasks", async () => {
  const def = parse(`
document:
  dsl: "1.0"
  namespace: test
  name: chain
do:
  - config:
      set:
        url: "https://api.example.com/data"
  - fetch:
      call: http
      with:
        endpoint: "\${ .url }"
        method: GET
`);

  const { executor, calls } = createMockExecutor({
    web_fetch: JSON.stringify({ items: ["a", "b"] }),
  });

  const result = await executeWorkflow({
    definition: def,
    toolExecutor: executor,
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(calls[0].input.url, "https://api.example.com/data");
  assertEquals(result.value.output.url, "https://api.example.com/data");
});

Deno.test("engine: switch branches correctly", async () => {
  const def = parse(`
document:
  dsl: "1.0"
  namespace: test
  name: switch-test
do:
  - init:
      set:
        mode: "fast"
  - decide:
      switch:
        - fastMode:
            when: "\${ .mode == \\"fast\\" }"
            then: done
        - slowMode:
            when: "\${ .mode == \\"slow\\" }"
            then: done
        - default:
            then: done
  - unreachable:
      set:
        reached: true
  - done:
      set:
        finished: true
`);

  const { executor } = createMockExecutor();
  const result = await executeWorkflow({
    definition: def,
    toolExecutor: executor,
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.status, "completed");
  // Switch matched "fastMode" and jumped to "done", skipping "unreachable"
  assertEquals(result.value.output.finished, true);
  assertEquals(result.value.output.reached, undefined);
});

Deno.test("engine: for loop iterates over collection", async () => {
  const def = parse(`
document:
  dsl: "1.0"
  namespace: test
  name: for-test
do:
  - setup:
      set:
        items:
          - x
          - y
          - z
        results: []
  - process:
      for:
        each: item
        in: "\${ .items }"
        at: idx
      do:
        - log:
            emit:
              event:
                type: processed
                data:
                  value: "\${ .item }"
`);

  const { executor } = createMockExecutor();
  const result = await executeWorkflow({
    definition: def,
    toolExecutor: executor,
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.status, "completed");
  assertEquals(result.value.events.length, 3);
  assertEquals(result.value.events[0].type, "processed");
});

Deno.test("engine: raise halts with error", async () => {
  const def = parse(`
document:
  dsl: "1.0"
  namespace: test
  name: raise-test
do:
  - fail:
      raise:
        error:
          status: 500
          type: "internal"
          title: "Something broke"
          detail: "Details here"
`);

  const { executor } = createMockExecutor();
  const result = await executeWorkflow({
    definition: def,
    toolExecutor: executor,
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.status, "failed");
  assertEquals(result.value.error?.includes("Something broke"), true);
  assertEquals(result.value.error?.includes("Details here"), true);
});

Deno.test("engine: emit records events", async () => {
  const def = parse(`
document:
  dsl: "1.0"
  namespace: test
  name: emit-test
do:
  - notify:
      emit:
        event:
          type: workflow.started
          source: test
          data:
            message: "Starting"
`);

  const { executor } = createMockExecutor();
  const result = await executeWorkflow({
    definition: def,
    toolExecutor: executor,
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.events.length, 1);
  assertEquals(result.value.events[0].type, "workflow.started");
  assertEquals(result.value.events[0].source, "test");
});

Deno.test("engine: if condition skips task when false", async () => {
  const def = parse(`
document:
  dsl: "1.0"
  namespace: test
  name: if-test
do:
  - init:
      set:
        skip: true
  - conditional:
      if: "\${ .skip == false }"
      set:
        ran: true
  - end:
      set:
        done: true
`);

  const { executor } = createMockExecutor();
  const result = await executeWorkflow({
    definition: def,
    toolExecutor: executor,
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.output.ran, undefined);
  assertEquals(result.value.output.done, true);
});

Deno.test("engine: then end stops execution", async () => {
  const def = parse(`
document:
  dsl: "1.0"
  namespace: test
  name: end-test
do:
  - first:
      set:
        a: 1
      then: end
  - second:
      set:
        b: 2
`);

  const { executor } = createMockExecutor();
  const result = await executeWorkflow({
    definition: def,
    toolExecutor: executor,
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.output.a, 1);
  assertEquals(result.value.output.b, undefined);
});

Deno.test("engine: then jump to named task", async () => {
  const def = parse(`
document:
  dsl: "1.0"
  namespace: test
  name: jump-test
do:
  - start:
      set:
        x: 1
      then: finish
  - skipped:
      set:
        y: 2
  - finish:
      set:
        z: 3
`);

  const { executor } = createMockExecutor();
  const result = await executeWorkflow({
    definition: def,
    toolExecutor: executor,
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.output.x, 1);
  assertEquals(result.value.output.y, undefined);
  assertEquals(result.value.output.z, 3);
});

Deno.test("engine: then jump to unknown task fails", async () => {
  const def = parse(`
document:
  dsl: "1.0"
  namespace: test
  name: bad-jump
do:
  - start:
      set:
        x: 1
      then: nonexistent
`);

  const { executor } = createMockExecutor();
  const result = await executeWorkflow({
    definition: def,
    toolExecutor: executor,
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.status, "failed");
  assertEquals(result.value.error?.includes("nonexistent"), true);
});

Deno.test("engine: classification ceiling enforcement", async () => {
  const def = parse(`
document:
  dsl: "1.0"
  namespace: test
  name: ceiling-test
classification_ceiling: PUBLIC
do:
  - step:
      set:
        x: 1
`);

  const { executor } = createMockExecutor();
  const result = await executeWorkflow({
    definition: def,
    toolExecutor: executor,
    getSessionTaint: () => "CONFIDENTIAL" as ClassificationLevel,
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.status, "failed");
  assertEquals(result.value.error?.includes("ceiling"), true);
  assertEquals(result.value.error?.includes("CONFIDENTIAL"), true);
});

Deno.test("engine: classification ceiling passes when taint within ceiling", async () => {
  const def = parse(`
document:
  dsl: "1.0"
  namespace: test
  name: ceiling-ok
classification_ceiling: CONFIDENTIAL
do:
  - step:
      set:
        x: 1
`);

  const { executor } = createMockExecutor();
  const result = await executeWorkflow({
    definition: def,
    toolExecutor: executor,
    getSessionTaint: () => "PUBLIC" as ClassificationLevel,
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.status, "completed");
});

Deno.test("engine: tool executor failure results in failed workflow", async () => {
  const def = parse(`
document:
  dsl: "1.0"
  namespace: test
  name: fail-test
do:
  - broken:
      call: http
      with:
        endpoint: https://broken.example.com
`);

  const executor = (
    _name: string,
    _input: Record<string, unknown>,
  ): Promise<string> => {
    throw new Error("Network timeout");
  };

  const result = await executeWorkflow({
    definition: def,
    toolExecutor: executor,
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.status, "failed");
  assertEquals(result.value.error?.includes("Network timeout"), true);
});

Deno.test("engine: initial input feeds into context", async () => {
  const def = parse(`
document:
  dsl: "1.0"
  namespace: test
  name: input-test
do:
  - greet:
      set:
        message: "Hello \${ .name }!"
`);

  const { executor } = createMockExecutor();
  const result = await executeWorkflow({
    definition: def,
    toolExecutor: executor,
    input: { name: "Alice" },
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.output.message, "Hello Alice!");
});

Deno.test("engine: sub-workflow execution", async () => {
  const mainDef = parse(`
document:
  dsl: "1.0"
  namespace: test
  name: main
do:
  - delegate:
      run:
        workflow:
          name: sub
          input:
            x: 10
`);

  const subDef = parse(`
document:
  dsl: "1.0"
  namespace: test
  name: sub
do:
  - compute:
      set:
        result: "computed"
`);

  const { executor } = createMockExecutor();
  const result = await executeWorkflow({
    definition: mainDef,
    toolExecutor: executor,
    resolveSubWorkflow: (name: string) => {
      if (name === "sub") return Promise.resolve(subDef);
      return Promise.resolve(null);
    },
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.status, "completed");
  const delegateOutput = result.value.output.delegate as Record<
    string,
    unknown
  >;
  assertEquals(delegateOutput.result, "computed");
});

Deno.test("engine: sub-workflow recursion depth limit", async () => {
  const def = parse(`
document:
  dsl: "1.0"
  namespace: test
  name: recursive
do:
  - recurse:
      run:
        workflow:
          name: recursive
`);

  const { executor } = createMockExecutor();
  const result = await executeWorkflow({
    definition: def,
    toolExecutor: executor,
    resolveSubWorkflow: () => Promise.resolve(def),
    depth: 5,
  });

  assertEquals(result.ok, false);
  if (result.ok) return;
  assertEquals(result.error.includes("recursion depth"), true);
});

Deno.test("engine: run shell dispatches to run_command", async () => {
  const def = parse(`
document:
  dsl: "1.0"
  namespace: test
  name: shell-test
do:
  - exec:
      run:
        shell:
          command: "echo hello"
`);

  const { executor, calls } = createMockExecutor({
    run_command: JSON.stringify({ stdout: "hello\n", exitCode: 0 }),
  });

  const result = await executeWorkflow({
    definition: def,
    toolExecutor: executor,
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.status, "completed");
  assertEquals(calls.length, 1);
  assertEquals(calls[0].name, "run_command");
  assertEquals(calls[0].input.command, "echo hello");
});

Deno.test("engine: triggerfish:llm dispatches to llm_task", async () => {
  const def = parse(`
document:
  dsl: "1.0"
  namespace: test
  name: llm-test
do:
  - analyze:
      call: triggerfish:llm
      with:
        prompt: "Summarize this data"
`);

  const { executor, calls } = createMockExecutor({
    llm_task: JSON.stringify({ response: "Summary here" }),
  });

  const result = await executeWorkflow({
    definition: def,
    toolExecutor: executor,
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(calls[0].name, "llm_task");
  assertEquals(calls[0].input.task, "Summarize this data");
});

Deno.test("engine: multi-step workflow with data flow", async () => {
  const def = parse(`
document:
  dsl: "1.0"
  namespace: test
  name: multi-step
do:
  - config:
      set:
        searchQuery: "AI news"
  - search:
      call: triggerfish:web_search
      with:
        query: "\${ .searchQuery }"
  - analyze:
      call: triggerfish:llm
      with:
        prompt: "Analyze search results"
  - done:
      set:
        complete: true
`);

  const { executor, calls } = createMockExecutor({
    web_search: JSON.stringify({ results: ["r1", "r2"] }),
    llm_task: JSON.stringify({ analysis: "Looks good" }),
  });

  const result = await executeWorkflow({
    definition: def,
    toolExecutor: executor,
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.status, "completed");
  assertEquals(calls.length, 2);
  assertEquals(calls[0].name, "web_search");
  assertEquals(calls[0].input.query, "AI news");
  assertEquals(calls[1].name, "llm_task");
  assertEquals(result.value.output.complete, true);
});
