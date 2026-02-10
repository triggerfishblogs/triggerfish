/**
 * Tests for the todo tool — agent task tracking and planning.
 *
 * Covers: write/read round-trip, full replacement semantics,
 * persistence across sessions via StorageProvider, per-agent isolation,
 * validation of malformed input, and tool executor integration.
 */
import { assertEquals, assert } from "jsr:@std/assert";
import { createMemoryStorage } from "../../src/core/storage/memory.ts";
import {
  createTodoManager,
  createTodoToolExecutor,
  extractTodosFromEvent,
  formatTodoListAnsi,
  formatTodoListHtml,
  getTodoToolDefinitions,
  TODO_SYSTEM_PROMPT,
} from "../../src/tools/mod.ts";
import type { TodoItem } from "../../src/tools/mod.ts";

/** Helper to create a valid todo item. */
function makeTodo(overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id: overrides.id ?? "t1",
    content: overrides.content ?? "Test task",
    status: overrides.status ?? "pending",
    priority: overrides.priority ?? "medium",
    created_at: overrides.created_at ?? "2025-01-01T00:00:00Z",
    updated_at: overrides.updated_at ?? "2025-01-01T00:00:00Z",
  };
}

// ─── TodoManager: core read/write ──────────────────────────────

Deno.test("TodoManager: read returns empty list when no todos exist", async () => {
  const storage = createMemoryStorage();
  const manager = createTodoManager({ storage, agentId: "agent-1" });

  const list = await manager.read();
  assertEquals(list.todos, []);

  await storage.close();
});

Deno.test("TodoManager: write and read round-trip", async () => {
  const storage = createMemoryStorage();
  const manager = createTodoManager({ storage, agentId: "agent-1" });

  const todos: TodoItem[] = [
    makeTodo({ id: "t1", content: "First task", status: "pending", priority: "high" }),
    makeTodo({ id: "t2", content: "Second task", status: "in_progress", priority: "low" }),
  ];

  await manager.write(todos);
  const list = await manager.read();

  assertEquals(list.todos.length, 2);
  assertEquals(list.todos[0].id, "t1");
  assertEquals(list.todos[0].content, "First task");
  assertEquals(list.todos[0].status, "pending");
  assertEquals(list.todos[0].priority, "high");
  assertEquals(list.todos[1].id, "t2");
  assertEquals(list.todos[1].status, "in_progress");

  await storage.close();
});

Deno.test("TodoManager: write preserves dropped items as completed", async () => {
  const storage = createMemoryStorage();
  const manager = createTodoManager({ storage, agentId: "agent-1" });

  // Write initial list
  await manager.write([
    makeTodo({ id: "t1", content: "Original task" }),
    makeTodo({ id: "t2", content: "Another task" }),
  ]);

  // Replace — dropped items (t1, t2) auto-preserved as completed
  await manager.write([
    makeTodo({ id: "t3", content: "Replacement task" }),
  ]);

  const list = await manager.read();
  assertEquals(list.todos.length, 3);
  // Preserved items come first, then new ones
  assertEquals(list.todos[0].id, "t1");
  assertEquals(list.todos[0].status, "completed");
  assertEquals(list.todos[1].id, "t2");
  assertEquals(list.todos[1].status, "completed");
  assertEquals(list.todos[2].id, "t3");
  assertEquals(list.todos[2].content, "Replacement task");

  await storage.close();
});

Deno.test("TodoManager: write empty list clears the list", async () => {
  const storage = createMemoryStorage();
  const manager = createTodoManager({ storage, agentId: "agent-1" });

  await manager.write([makeTodo({ id: "t1", content: "Task" })]);
  assertEquals((await manager.read()).todos.length, 1);

  // Writing empty list clears everything
  await manager.write([]);
  const list = await manager.read();
  assertEquals(list.todos.length, 0);

  await storage.close();
});

// ─── Persistence across sessions ───────────────────────────────

Deno.test("TodoManager: persists across manager instances (same storage)", async () => {
  const storage = createMemoryStorage();

  // Session 1: write todos
  const manager1 = createTodoManager({ storage, agentId: "agent-1" });
  await manager1.write([
    makeTodo({ id: "t1", content: "Survive restart" }),
  ]);

  // Session 2: new manager, same storage — should see the data
  const manager2 = createTodoManager({ storage, agentId: "agent-1" });
  const list = await manager2.read();
  assertEquals(list.todos.length, 1);
  assertEquals(list.todos[0].content, "Survive restart");

  await storage.close();
});

// ─── Per-agent isolation ────────────────────────────────────────

Deno.test("TodoManager: agents are isolated — different agentId sees different list", async () => {
  const storage = createMemoryStorage();

  const agent1 = createTodoManager({ storage, agentId: "agent-alpha" });
  const agent2 = createTodoManager({ storage, agentId: "agent-beta" });

  await agent1.write([makeTodo({ id: "a1", content: "Alpha's task" })]);
  await agent2.write([makeTodo({ id: "b1", content: "Beta's task" })]);

  const list1 = await agent1.read();
  const list2 = await agent2.read();

  assertEquals(list1.todos.length, 1);
  assertEquals(list1.todos[0].content, "Alpha's task");

  assertEquals(list2.todos.length, 1);
  assertEquals(list2.todos[0].content, "Beta's task");

  await storage.close();
});

// ─── Validation ─────────────────────────────────────────────────

Deno.test("TodoManager: filters out invalid items on write", async () => {
  const storage = createMemoryStorage();
  const manager = createTodoManager({ storage, agentId: "agent-1" });

  const items = [
    makeTodo({ id: "valid", content: "Good task" }),
    { id: "", content: "Missing id", status: "pending", priority: "low", created_at: "x", updated_at: "x" },
    { id: "no-content", content: "", status: "pending", priority: "low", created_at: "x", updated_at: "x" },
    { id: "bad-status", content: "Task", status: "unknown", priority: "low", created_at: "x", updated_at: "x" },
    { id: "bad-priority", content: "Task", status: "pending", priority: "urgent", created_at: "x", updated_at: "x" },
    null,
    42,
    "string-item",
  ] as unknown as TodoItem[];

  const list = await manager.write(items);
  assertEquals(list.todos.length, 1);
  assertEquals(list.todos[0].id, "valid");

  await storage.close();
});

Deno.test("TodoManager: read handles corrupted storage gracefully", async () => {
  const storage = createMemoryStorage();
  await storage.set("todos:agent-1", "not-valid-json{{{");

  const manager = createTodoManager({ storage, agentId: "agent-1" });
  const list = await manager.read();
  assertEquals(list.todos, []);

  await storage.close();
});

Deno.test("TodoManager: read handles missing todos array in storage", async () => {
  const storage = createMemoryStorage();
  await storage.set("todos:agent-1", JSON.stringify({ something_else: true }));

  const manager = createTodoManager({ storage, agentId: "agent-1" });
  const list = await manager.read();
  assertEquals(list.todos, []);

  await storage.close();
});

// ─── Tool executor integration ──────────────────────────────────

Deno.test("TodoToolExecutor: todo_read returns empty message", async () => {
  const storage = createMemoryStorage();
  const manager = createTodoManager({ storage, agentId: "agent-1" });
  const executor = createTodoToolExecutor(manager);

  const result = await executor("todo_read", {});
  assert(typeof result === "string");
  assert(result!.includes("No todos"));

  await storage.close();
});

Deno.test("TodoToolExecutor: todo_write returns JSON of merged list", async () => {
  const storage = createMemoryStorage();
  const manager = createTodoManager({ storage, agentId: "agent-1" });
  const executor = createTodoToolExecutor(manager);

  const writeResult = await executor("todo_write", {
    todos: [
      makeTodo({ id: "t1", content: "Write code", status: "in_progress", priority: "high" }),
      makeTodo({ id: "t2", content: "Run tests", status: "pending", priority: "medium" }),
    ],
  });

  assert(typeof writeResult === "string");
  const parsed = JSON.parse(writeResult!);
  assertEquals(parsed.todos.length, 2);
  assertEquals(parsed.todos[0].content, "Write code");
  assertEquals(parsed.todos[1].content, "Run tests");

  // Read should match
  const readResult = await executor("todo_read", {});
  const readParsed = JSON.parse(readResult!);
  assertEquals(readParsed.todos.length, 2);

  await storage.close();
});

Deno.test("TodoToolExecutor: todo_write rejects non-array input", async () => {
  const storage = createMemoryStorage();
  const manager = createTodoManager({ storage, agentId: "agent-1" });
  const executor = createTodoToolExecutor(manager);

  const result = await executor("todo_write", { todos: "not an array" });
  assert(result!.includes("Error"));

  await storage.close();
});

Deno.test("TodoToolExecutor: returns null for unknown tool names", async () => {
  const storage = createMemoryStorage();
  const manager = createTodoManager({ storage, agentId: "agent-1" });
  const executor = createTodoToolExecutor(manager);

  const result = await executor("read_file", { path: "/etc/passwd" });
  assertEquals(result, null);

  await storage.close();
});

// ─── Tool definitions ───────────────────────────────────────────

Deno.test("getTodoToolDefinitions: returns two tool definitions", () => {
  const defs = getTodoToolDefinitions();
  assertEquals(defs.length, 2);

  const names = defs.map((d) => d.name);
  assert(names.includes("todo_read"));
  assert(names.includes("todo_write"));
});

Deno.test("getTodoToolDefinitions: todo_write has todos parameter", () => {
  const defs = getTodoToolDefinitions();
  const writeDef = defs.find((d) => d.name === "todo_write")!;
  assert(writeDef.parameters.todos !== undefined);
  assertEquals(writeDef.parameters.todos.required, true);
});

// ─── System prompt ──────────────────────────────────────────────

Deno.test("TODO_SYSTEM_PROMPT: contains key instructions", () => {
  assert(TODO_SYSTEM_PROMPT.includes("todo_read"));
  assert(TODO_SYSTEM_PROMPT.includes("todo_write"));
  assert(TODO_SYSTEM_PROMPT.includes("in_progress"));
  assert(TODO_SYSTEM_PROMPT.includes("completed"));
});

// ─── ANSI formatter ─────────────────────────────────────────────

Deno.test("formatTodoListAnsi: renders empty list in a box", () => {
  const result = formatTodoListAnsi([]);
  assert(result.includes("No tasks"));
  assert(result.includes("╭"));
  assert(result.includes("╯"));
});

Deno.test("formatTodoListAnsi: renders completed items with strikethrough", () => {
  const result = formatTodoListAnsi([
    makeTodo({ id: "t1", content: "Done task", status: "completed" }),
  ]);
  assert(result.includes("✓"));
  assert(result.includes("Done task"));
  // Should contain ANSI strikethrough code \x1b[9m
  assert(result.includes("\x1b[9m"));
});

Deno.test("formatTodoListAnsi: renders in_progress items highlighted", () => {
  const result = formatTodoListAnsi([
    makeTodo({ id: "t1", content: "Working on it", status: "in_progress" }),
  ]);
  assert(result.includes("▶"));
  assert(result.includes("Working on it"));
  // Should contain ANSI bold code \x1b[1m
  assert(result.includes("\x1b[1m"));
});

Deno.test("formatTodoListAnsi: renders pending items", () => {
  const result = formatTodoListAnsi([
    makeTodo({ id: "t1", content: "Future task", status: "pending" }),
  ]);
  assert(result.includes("○"));
  assert(result.includes("Future task"));
});

Deno.test("formatTodoListAnsi: mixed statuses render correctly in a box", () => {
  const result = formatTodoListAnsi([
    makeTodo({ id: "t1", content: "First", status: "completed" }),
    makeTodo({ id: "t2", content: "Second", status: "in_progress" }),
    makeTodo({ id: "t3", content: "Third", status: "pending" }),
  ]);
  // Header and box borders
  assert(result.includes("Tasks"));
  assert(result.includes("╭"));
  assert(result.includes("│"));
  assert(result.includes("╰"));
  assert(result.includes("╯"));
  // Status icons
  assert(result.includes("✓"));
  assert(result.includes("▶"));
  assert(result.includes("○"));
  // Content
  assert(result.includes("First"));
  assert(result.includes("Second"));
  assert(result.includes("Third"));
});

// ─── HTML formatter ─────────────────────────────────────────────

Deno.test("formatTodoListHtml: renders empty list", () => {
  const result = formatTodoListHtml([]);
  assert(result.includes("todo-empty"));
  assert(result.includes("No tasks"));
});

Deno.test("formatTodoListHtml: renders completed items with strikethrough", () => {
  const result = formatTodoListHtml([
    makeTodo({ id: "t1", content: "Done task", status: "completed" }),
  ]);
  assert(result.includes("todo-done"));
  assert(result.includes("<s>Done task</s>"));
  assert(result.includes("✓"));
});

Deno.test("formatTodoListHtml: renders in_progress items as active", () => {
  const result = formatTodoListHtml([
    makeTodo({ id: "t1", content: "Active task", status: "in_progress" }),
  ]);
  assert(result.includes("todo-active"));
  assert(result.includes("▶"));
  assert(result.includes("Active task"));
});

Deno.test("formatTodoListHtml: escapes HTML in content", () => {
  const result = formatTodoListHtml([
    makeTodo({ id: "t1", content: "<script>alert('xss')</script>", status: "pending" }),
  ]);
  assert(!result.includes("<script>"));
  assert(result.includes("&lt;script&gt;"));
});

// ─── extractTodosFromEvent ──────────────────────────────────────

Deno.test("extractTodosFromEvent: extracts from todo_write result JSON", () => {
  const jsonResult = JSON.stringify({
    todos: [
      makeTodo({ id: "t1", content: "Task A", status: "pending" }),
      makeTodo({ id: "t2", content: "Task B", status: "in_progress" }),
    ],
  });
  const todos = extractTodosFromEvent("todo_write", { result: jsonResult });
  assert(todos !== null);
  assertEquals(todos!.length, 2);
  assertEquals(todos![0].content, "Task A");
  assertEquals(todos![1].status, "in_progress");
});

Deno.test("extractTodosFromEvent: extracts from todo_read result JSON", () => {
  const jsonResult = JSON.stringify({
    todos: [
      makeTodo({ id: "t1", content: "Read task", status: "completed" }),
    ],
  });
  const todos = extractTodosFromEvent("todo_read", { result: jsonResult });
  assert(todos !== null);
  assertEquals(todos!.length, 1);
  assertEquals(todos![0].content, "Read task");
});

Deno.test("extractTodosFromEvent: returns null for todo_read with no-todos message", () => {
  const todos = extractTodosFromEvent("todo_read", {
    result: "No todos. Use todo_write to create your task list.",
  });
  assertEquals(todos, null);
});

Deno.test("extractTodosFromEvent: returns null for non-todo tools", () => {
  const todos = extractTodosFromEvent("read_file", {
    args: { path: "/etc/passwd" },
    result: "file contents",
  });
  assertEquals(todos, null);
});
