import { assertEquals } from "@std/assert";
import { parseWorkflowYaml } from "../../src/workflow/parser.ts";

const MINIMAL_WORKFLOW = `
document:
  dsl: "1.0"
  namespace: test
  name: minimal
do:
  - greet:
      set:
        message: "hello"
`;

const FULL_WORKFLOW = `
document:
  dsl: "1.0"
  namespace: myapp
  name: full-example
  version: "1.0.0"
  description: "A complete workflow"
classification_ceiling: CONFIDENTIAL
do:
  - fetchData:
      call: http
      with:
        method: GET
        endpoint: https://api.example.com/data
  - transform:
      set:
        result: "\${ .fetchData }"
        count: 42
  - branch:
      switch:
        - hasData:
            when: "\${ .count > 0 }"
            then: processData
        - noData:
            then: end
  - processData:
      call: triggerfish:llm
      with:
        prompt: "Analyze this data"
  - notify:
      call: triggerfish:message
      with:
        channel: telegram
        text: "Done"
      then: end
`;

const FOR_WORKFLOW = `
document:
  dsl: "1.0"
  namespace: test
  name: for-loop
do:
  - setup:
      set:
        items:
          - a
          - b
          - c
  - process:
      for:
        each: item
        in: "\${ .items }"
        at: idx
      do:
        - log:
            emit:
              event:
                type: item.processed
                data:
                  value: "\${ .item }"
`;

const RUN_SHELL_WORKFLOW = `
document:
  dsl: "1.0"
  namespace: test
  name: run-shell
do:
  - exec:
      run:
        shell:
          command: "echo hello"
`;

const RUN_SCRIPT_WORKFLOW = `
document:
  dsl: "1.0"
  namespace: test
  name: run-script
do:
  - exec:
      run:
        script:
          language: python
          code: "print('hello')"
`;

const RUN_SUBWORKFLOW = `
document:
  dsl: "1.0"
  namespace: test
  name: run-sub
do:
  - delegate:
      run:
        workflow:
          name: other-workflow
          version: "1.0"
          input:
            key: value
`;

const RAISE_WORKFLOW = `
document:
  dsl: "1.0"
  namespace: test
  name: raise-test
do:
  - fail:
      raise:
        error:
          status: 404
          type: "not-found"
          title: "Resource not found"
          detail: "The item was missing"
`;

const WAIT_WORKFLOW = `
document:
  dsl: "1.0"
  namespace: test
  name: wait-test
do:
  - pause:
      wait: "PT5S"
`;

Deno.test("parseWorkflowYaml: parses minimal workflow", () => {
  const result = parseWorkflowYaml(MINIMAL_WORKFLOW);
  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.document.dsl, "1.0");
  assertEquals(result.value.document.namespace, "test");
  assertEquals(result.value.document.name, "minimal");
  assertEquals(result.value.do.length, 1);
  assertEquals(result.value.do[0].name, "greet");
  assertEquals(result.value.do[0].task.type, "set");
});

Deno.test("parseWorkflowYaml: parses full workflow with all features", () => {
  const result = parseWorkflowYaml(FULL_WORKFLOW);
  assertEquals(result.ok, true);
  if (!result.ok) return;
  assertEquals(result.value.document.name, "full-example");
  assertEquals(result.value.document.version, "1.0.0");
  assertEquals(result.value.classificationCeiling, "CONFIDENTIAL");
  assertEquals(result.value.do.length, 5);

  const fetchTask = result.value.do[0].task;
  assertEquals(fetchTask.type, "call");
  if (fetchTask.type === "call") {
    assertEquals(fetchTask.call, "http");
    assertEquals(fetchTask.with?.method, "GET");
  }

  const switchTask = result.value.do[2].task;
  assertEquals(switchTask.type, "switch");
  if (switchTask.type === "switch") {
    assertEquals(switchTask.switch.length, 2);
    assertEquals(switchTask.switch[0].name, "hasData");
    assertEquals(switchTask.switch[1].then, "end");
  }

  const notifyTask = result.value.do[4].task;
  assertEquals(notifyTask.type, "call");
  assertEquals(notifyTask.then, "end");
});

Deno.test("parseWorkflowYaml: parses for loop with nested do", () => {
  const result = parseWorkflowYaml(FOR_WORKFLOW);
  assertEquals(result.ok, true);
  if (!result.ok) return;
  const forTask = result.value.do[1].task;
  assertEquals(forTask.type, "for");
  if (forTask.type === "for") {
    assertEquals(forTask.for.each, "item");
    assertEquals(forTask.for.at, "idx");
    assertEquals(forTask.do.length, 1);
    assertEquals(forTask.do[0].task.type, "emit");
  }
});

Deno.test("parseWorkflowYaml: parses run shell task", () => {
  const result = parseWorkflowYaml(RUN_SHELL_WORKFLOW);
  assertEquals(result.ok, true);
  if (!result.ok) return;
  const task = result.value.do[0].task;
  assertEquals(task.type, "run");
  if (task.type === "run" && "shell" in task.run) {
    assertEquals(task.run.shell.command, "echo hello");
  }
});

Deno.test("parseWorkflowYaml: parses run script task", () => {
  const result = parseWorkflowYaml(RUN_SCRIPT_WORKFLOW);
  assertEquals(result.ok, true);
  if (!result.ok) return;
  const task = result.value.do[0].task;
  assertEquals(task.type, "run");
  if (task.type === "run" && "script" in task.run) {
    assertEquals(task.run.script.language, "python");
  }
});

Deno.test("parseWorkflowYaml: parses run sub-workflow", () => {
  const result = parseWorkflowYaml(RUN_SUBWORKFLOW);
  assertEquals(result.ok, true);
  if (!result.ok) return;
  const task = result.value.do[0].task;
  assertEquals(task.type, "run");
  if (task.type === "run" && "workflow" in task.run) {
    assertEquals(task.run.workflow.name, "other-workflow");
    assertEquals(task.run.workflow.version, "1.0");
  }
});

Deno.test("parseWorkflowYaml: parses raise task", () => {
  const result = parseWorkflowYaml(RAISE_WORKFLOW);
  assertEquals(result.ok, true);
  if (!result.ok) return;
  const task = result.value.do[0].task;
  assertEquals(task.type, "raise");
  if (task.type === "raise") {
    assertEquals(task.raise.error.status, 404);
    assertEquals(task.raise.error.type, "not-found");
    assertEquals(task.raise.error.detail, "The item was missing");
  }
});

Deno.test("parseWorkflowYaml: parses wait task", () => {
  const result = parseWorkflowYaml(WAIT_WORKFLOW);
  assertEquals(result.ok, true);
  if (!result.ok) return;
  const task = result.value.do[0].task;
  assertEquals(task.type, "wait");
  if (task.type === "wait") {
    assertEquals(task.wait, "PT5S");
  }
});

Deno.test("parseWorkflowYaml: rejects invalid YAML", () => {
  const result = parseWorkflowYaml("{{invalid yaml");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.startsWith("YAML parse error"), true);
  }
});

Deno.test("parseWorkflowYaml: rejects missing document", () => {
  const result = parseWorkflowYaml("do:\n  - step:\n      set:\n        x: 1\n");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("document"), true);
  }
});

Deno.test("parseWorkflowYaml: rejects missing do block", () => {
  const result = parseWorkflowYaml(
    "document:\n  dsl: '1.0'\n  namespace: test\n  name: bad\n",
  );
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("do"), true);
  }
});

Deno.test("parseWorkflowYaml: rejects empty do block", () => {
  const yaml = `
document:
  dsl: "1.0"
  namespace: test
  name: empty
do: []
`;
  const result = parseWorkflowYaml(yaml);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("at least one task"), true);
  }
});

Deno.test("parseWorkflowYaml: rejects unrecognized task type", () => {
  const yaml = `
document:
  dsl: "1.0"
  namespace: test
  name: bad
do:
  - step:
      unknown_type: true
`;
  const result = parseWorkflowYaml(yaml);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("no recognized type"), true);
  }
});

Deno.test("parseWorkflowYaml: rejects invalid classification ceiling", () => {
  const yaml = `
document:
  dsl: "1.0"
  namespace: test
  name: bad
classification_ceiling: ULTRA_SECRET
do:
  - step:
      set:
        x: 1
`;
  const result = parseWorkflowYaml(yaml);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("classification_ceiling"), true);
  }
});

Deno.test("parseWorkflowYaml: rejects listen task type gracefully", () => {
  const yaml = `
document:
  dsl: "1.0"
  namespace: test
  name: listen-test
do:
  - waitEvent:
      listen: some_event
`;
  const result = parseWorkflowYaml(yaml);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("listen"), true);
    assertEquals(result.error.includes("not yet supported"), true);
  }
});

Deno.test("parseWorkflowYaml: preserves task if/then/timeout metadata", () => {
  const yaml = `
document:
  dsl: "1.0"
  namespace: test
  name: conditional
do:
  - step:
      if: "\${ .enabled == true }"
      set:
        x: 1
      then: end
      timeout:
        after: PT30S
`;
  const result = parseWorkflowYaml(yaml);
  assertEquals(result.ok, true);
  if (!result.ok) return;
  const task = result.value.do[0].task;
  assertEquals(task.if, "${ .enabled == true }");
  assertEquals(task.then, "end");
  assertEquals(task.timeout?.after, "PT30S");
});
