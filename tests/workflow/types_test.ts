import { assertEquals, assertNotEquals } from "@std/assert";
import { createWorkflowId } from "../../src/workflow/types.ts";

Deno.test("createWorkflowId: creates branded string", () => {
  const id = createWorkflowId("test-workflow");
  assertEquals(id as string, "test-workflow");
});

Deno.test("createWorkflowId: different inputs produce different ids", () => {
  const a = createWorkflowId("alpha");
  const b = createWorkflowId("beta");
  assertNotEquals(a, b);
});
