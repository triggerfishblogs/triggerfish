/**
 * Tests for the workflow run registry.
 * @module
 */

import { assertEquals } from "@std/assert";
import { assertExists } from "@std/assert";
import {
  createWorkflowRunRegistry,
  type RegistryEvent,
  WorkflowCancelledError,
} from "../../src/workflow/registry.ts";

Deno.test("registry — registerRun creates active run", () => {
  const registry = createWorkflowRunRegistry();
  const registration = registry.registerRun({
    runId: "run-1",
    workflowName: "test-wf",
    taint: "PUBLIC",
  });

  assertExists(registration.signal);
  assertExists(registration.checkPause);

  const runs = registry.listActiveRuns();
  assertEquals(runs.length, 1);
  assertEquals(runs[0].runId, "run-1");
  assertEquals(runs[0].workflowName, "test-wf");
  assertEquals(runs[0].status, "running");
  assertEquals(runs[0].paused, false);
  assertEquals(runs[0].taint, "PUBLIC");
});

Deno.test("registry — getActiveRun returns snapshot by ID", () => {
  const registry = createWorkflowRunRegistry();
  registry.registerRun({
    runId: "run-1",
    workflowName: "test-wf",
  });

  const run = registry.getActiveRun("run-1");
  assertExists(run);
  assertEquals(run!.runId, "run-1");

  const missing = registry.getActiveRun("nonexistent");
  assertEquals(missing, null);
});

Deno.test("registry — stopRun aborts signal and removes on complete", () => {
  const registry = createWorkflowRunRegistry();
  const registration = registry.registerRun({
    runId: "run-1",
    workflowName: "test-wf",
  });

  assertEquals(registration.signal.aborted, false);
  const ok = registry.stopRun("run-1");
  assertEquals(ok, true);
  assertEquals(registration.signal.aborted, true);

  registry.completeRun("run-1", { status: "cancelled" });
  assertEquals(registry.listActiveRuns().length, 0);
});

Deno.test("registry — stopRun returns false for unknown run", () => {
  const registry = createWorkflowRunRegistry();
  assertEquals(registry.stopRun("nonexistent"), false);
});

Deno.test("registry — pauseRun and unpauseRun control pause state", async () => {
  const registry = createWorkflowRunRegistry();
  const registration = registry.registerRun({
    runId: "run-1",
    workflowName: "test-wf",
  });

  // checkPause should resolve immediately when not paused
  await registration.checkPause();

  const pauseOk = registry.pauseRun("run-1");
  assertEquals(pauseOk, true);

  const run = registry.getActiveRun("run-1");
  assertEquals(run!.paused, true);
  assertEquals(run!.status, "paused");

  // Start checkPause — it should block until unpause
  let resumed = false;
  const pausePromise = registration.checkPause().then(() => {
    resumed = true;
  });

  // Give it a tick to ensure it's waiting
  await new Promise<void>((r) => setTimeout(r, 10));
  assertEquals(resumed, false);

  const unpauseOk = registry.unpauseRun("run-1");
  assertEquals(unpauseOk, true);

  await pausePromise;
  assertEquals(resumed, true);

  const runAfter = registry.getActiveRun("run-1");
  assertEquals(runAfter!.paused, false);
  assertEquals(runAfter!.status, "running");
});

Deno.test("registry — pauseRun rejects for non-running state", () => {
  const registry = createWorkflowRunRegistry();
  // Can't pause what doesn't exist
  assertEquals(registry.pauseRun("nonexistent"), false);
  assertEquals(registry.unpauseRun("nonexistent"), false);
});

Deno.test("registry — stopRun releases paused workflow", async () => {
  const registry = createWorkflowRunRegistry();
  const registration = registry.registerRun({
    runId: "run-1",
    workflowName: "test-wf",
  });

  registry.pauseRun("run-1");

  let threw = false;
  const pausePromise = registration.checkPause().catch(() => {
    threw = true;
  });

  // Stop should release the pause and abort
  registry.stopRun("run-1");

  // After stop, checkPause resolves (pause was released)
  // But the signal is aborted, so next checkPause should reject
  await pausePromise;

  // Next check should throw because signal is aborted
  try {
    await registration.checkPause();
  } catch (e) {
    if (e instanceof WorkflowCancelledError) {
      threw = true;
    }
  }
  assertEquals(threw, true);
});

Deno.test("registry — reportTaskProgress updates run state", () => {
  const registry = createWorkflowRunRegistry();
  registry.registerRun({
    runId: "run-1",
    workflowName: "test-wf",
    taint: "PUBLIC",
  });

  registry.reportTaskProgress("run-1", {
    taskIndex: 2,
    taskName: "fetch-data",
    taint: "CONFIDENTIAL",
  });

  const run = registry.getActiveRun("run-1");
  assertEquals(run!.currentTaskIndex, 2);
  assertEquals(run!.currentTaskName, "fetch-data");
  assertEquals(run!.taint, "CONFIDENTIAL");
});

Deno.test("registry — subscribe receives events", () => {
  const registry = createWorkflowRunRegistry();
  const events: RegistryEvent[] = [];

  const unsubscribe = registry.subscribe((event) => {
    events.push(event);
  });

  registry.registerRun({
    runId: "run-1",
    workflowName: "test-wf",
  });

  assertEquals(events.length, 1);
  assertEquals(events[0].type, "run_started");

  registry.pauseRun("run-1");
  assertEquals(events.length, 2);
  assertEquals(events[1].type, "run_paused");

  registry.unpauseRun("run-1");
  assertEquals(events.length, 3);
  assertEquals(events[2].type, "run_unpaused");

  registry.stopRun("run-1");
  assertEquals(events.length, 4);
  assertEquals(events[3].type, "run_stopped");

  registry.completeRun("run-1", { status: "cancelled" });
  assertEquals(events.length, 5);
  assertEquals(events[4].type, "run_completed");

  unsubscribe();

  // After unsubscribe, no more events
  registry.registerRun({
    runId: "run-2",
    workflowName: "test-wf-2",
  });
  assertEquals(events.length, 5);
});

Deno.test("registry — completeRun removes from active list", () => {
  const registry = createWorkflowRunRegistry();
  registry.registerRun({
    runId: "run-1",
    workflowName: "test-wf",
  });

  assertEquals(registry.listActiveRuns().length, 1);

  registry.completeRun("run-1", { status: "completed" });
  assertEquals(registry.listActiveRuns().length, 0);
  assertEquals(registry.getActiveRun("run-1"), null);
});

Deno.test("registry — WorkflowCancelledError has correct properties", () => {
  const err = new WorkflowCancelledError("run-123");
  assertEquals(err.name, "WorkflowCancelledError");
  assertEquals(err.runId, "run-123");
  assertEquals(err.message, "Workflow run cancelled: run-123");
});
