import { assertEquals } from "@std/assert";
import { createScopedPauseController } from "../../../src/workflow/healing/scoped_pause.ts";
import type { WorkflowTaskEntry } from "../../../src/workflow/types.ts";

function makeTasks(count: number): readonly WorkflowTaskEntry[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `step${i}`,
    task: { type: "set" as const, set: { [`x${i}`]: i } },
  }));
}

Deno.test("ScopedPause: tasks after failed index are blocked", () => {
  const tasks = makeTasks(5);
  const ctrl = createScopedPauseController({ tasks });

  assertEquals(ctrl.isTaskBlocked(0), false);
  assertEquals(ctrl.isTaskBlocked(4), false);

  ctrl.pauseDownstreamOf(2);

  assertEquals(ctrl.isTaskBlocked(0), false);
  assertEquals(ctrl.isTaskBlocked(1), false);
  assertEquals(ctrl.isTaskBlocked(2), false);
  assertEquals(ctrl.isTaskBlocked(3), true);
  assertEquals(ctrl.isTaskBlocked(4), true);
});

Deno.test("ScopedPause: resumeAll clears all blocks", () => {
  const tasks = makeTasks(5);
  const ctrl = createScopedPauseController({ tasks });

  ctrl.pauseDownstreamOf(1);
  assertEquals(ctrl.isTaskBlocked(3), true);

  ctrl.resumeAll();
  assertEquals(ctrl.isTaskBlocked(3), false);
  assertEquals(ctrl.isTaskBlocked(4), false);
});

Deno.test("ScopedPause: pause at last task blocks nothing", () => {
  const tasks = makeTasks(3);
  const ctrl = createScopedPauseController({ tasks });

  ctrl.pauseDownstreamOf(2);
  assertEquals(ctrl.isTaskBlocked(0), false);
  assertEquals(ctrl.isTaskBlocked(1), false);
  assertEquals(ctrl.isTaskBlocked(2), false);
});

Deno.test("ScopedPause: pause at first task blocks all subsequent", () => {
  const tasks = makeTasks(4);
  const ctrl = createScopedPauseController({ tasks });

  ctrl.pauseDownstreamOf(0);
  assertEquals(ctrl.isTaskBlocked(0), false);
  assertEquals(ctrl.isTaskBlocked(1), true);
  assertEquals(ctrl.isTaskBlocked(2), true);
  assertEquals(ctrl.isTaskBlocked(3), true);
});

Deno.test("ScopedPause: multiple pause calls accumulate", () => {
  const tasks = makeTasks(6);
  const ctrl = createScopedPauseController({ tasks });

  ctrl.pauseDownstreamOf(3);
  assertEquals(ctrl.isTaskBlocked(4), true);
  assertEquals(ctrl.isTaskBlocked(2), false);

  ctrl.resumeAll();
  ctrl.pauseDownstreamOf(1);
  assertEquals(ctrl.isTaskBlocked(2), true);
  assertEquals(ctrl.isTaskBlocked(5), true);
});
