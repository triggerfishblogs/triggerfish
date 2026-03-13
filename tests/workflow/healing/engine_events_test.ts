import { assertEquals } from "@std/assert";
import { executeWorkflow } from "../../../src/workflow/engine.ts";
import type { RichWorkflowEvent } from "../../../src/workflow/healing/types.ts";
import { parseWorkflowYaml } from "../../../src/workflow/parser.ts";

function stubToolExecutor(
  results?: Record<string, string>,
): (name: string, input: Record<string, unknown>) => Promise<string> {
  return (name: string, _input: Record<string, unknown>) =>
    Promise.resolve(results?.[name] ?? JSON.stringify({ ok: true }));
}

function failingToolExecutor(
  failOn: string,
): (name: string, input: Record<string, unknown>) => Promise<string> {
  return (name: string, _input: Record<string, unknown>) => {
    if (name === failOn) return Promise.reject(new Error(`${failOn} failed`));
    return Promise.resolve(JSON.stringify({ ok: true }));
  };
}

const HAPPY_YAML = `
document:
  dsl: "1.0"
  namespace: test
  name: happy-path
do:
  - step1:
      set:
        x: 1
  - step2:
      set:
        y: 2
`;

const CONDITIONAL_SKIP_YAML = `
document:
  dsl: "1.0"
  namespace: test
  name: conditional
do:
  - step1:
      set:
        x: 1
  - step2:
      if: "\${ .missing }"
      set:
        y: 2
  - step3:
      set:
        z: 3
`;

const CALL_FAILURE_YAML = `
document:
  dsl: "1.0"
  namespace: test
  name: failure
do:
  - step1:
      set:
        x: 1
  - step2:
      call: http
      with:
        endpoint: "https://example.com"
`;

Deno.test("Engine events: happy path emits STEP_STARTED, STEP_COMPLETED, WORKFLOW_COMPLETED", async () => {
  const events: RichWorkflowEvent[] = [];
  const parsed = parseWorkflowYaml(HAPPY_YAML);
  if (!parsed.ok) throw new Error(parsed.error);

  const result = await executeWorkflow({
    definition: parsed.value,
    toolExecutor: stubToolExecutor(),
    onStepEvent: (e) => events.push(e),
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.status, "completed");

  const types = events.map((e) => e.type);
  assertEquals(types.includes("STEP_STARTED"), true);
  assertEquals(types.includes("STEP_COMPLETED"), true);
  assertEquals(types.includes("WORKFLOW_COMPLETED"), true);

  const started = events.filter((e) => e.type === "STEP_STARTED");
  assertEquals(started.length, 2);
  const completed = events.filter((e) => e.type === "STEP_COMPLETED");
  assertEquals(completed.length, 2);
});

Deno.test("Engine events: conditional skip emits STEP_SKIPPED", async () => {
  const events: RichWorkflowEvent[] = [];
  const parsed = parseWorkflowYaml(CONDITIONAL_SKIP_YAML);
  if (!parsed.ok) throw new Error(parsed.error);

  await executeWorkflow({
    definition: parsed.value,
    toolExecutor: stubToolExecutor(),
    onStepEvent: (e) => events.push(e),
  });

  const skipped = events.filter((e) => e.type === "STEP_SKIPPED");
  assertEquals(skipped.length, 1);
  if (skipped[0].type === "STEP_SKIPPED") {
    assertEquals(skipped[0].taskName, "step2");
    assertEquals(skipped[0].reason.includes(".missing"), true);
  }
});

Deno.test("Engine events: step failure emits STEP_FAILED and WORKFLOW_FAULTED", async () => {
  const events: RichWorkflowEvent[] = [];
  const parsed = parseWorkflowYaml(CALL_FAILURE_YAML);
  if (!parsed.ok) throw new Error(parsed.error);

  await executeWorkflow({
    definition: parsed.value,
    toolExecutor: failingToolExecutor("web_fetch"),
    onStepEvent: (e) => events.push(e),
  });

  const failed = events.filter((e) => e.type === "STEP_FAILED");
  assertEquals(failed.length, 1);
  if (failed[0].type === "STEP_FAILED") {
    assertEquals(failed[0].taskName, "step2");
    assertEquals(failed[0].attemptNumber, 1);
  }

  const faulted = events.filter((e) => e.type === "WORKFLOW_FAULTED");
  assertEquals(faulted.length, 1);
});

Deno.test("Engine events: no events emitted when callback absent", async () => {
  const parsed = parseWorkflowYaml(HAPPY_YAML);
  if (!parsed.ok) throw new Error(parsed.error);

  const result = await executeWorkflow({
    definition: parsed.value,
    toolExecutor: stubToolExecutor(),
  });

  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.status, "completed");
});

Deno.test("Engine events: STEP_COMPLETED includes duration", async () => {
  const events: RichWorkflowEvent[] = [];
  const parsed = parseWorkflowYaml(HAPPY_YAML);
  if (!parsed.ok) throw new Error(parsed.error);

  await executeWorkflow({
    definition: parsed.value,
    toolExecutor: stubToolExecutor(),
    onStepEvent: (e) => events.push(e),
  });

  const completed = events.filter((e) => e.type === "STEP_COMPLETED");
  for (const e of completed) {
    if (e.type === "STEP_COMPLETED") {
      assertEquals(typeof e.duration, "number");
      assertEquals(e.duration >= 0, true);
    }
  }
});
