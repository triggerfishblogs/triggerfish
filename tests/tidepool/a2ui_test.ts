/**
 * Tests for the Tide Pool / A2UI module.
 *
 * Covers component constructors, A2UIHost WebSocket broadcasting,
 * and TidePoolTools render/update/clear operations.
 */
import { assertEquals, assertExists, assert } from "jsr:@std/assert";
import {
  card,
  table,
  markdown,
  layout,
  createA2UIHost,
  createTidePoolTools,
} from "../../src/tidepool/mod.ts";
import type {
  A2UIComponent,
  ComponentTree,
} from "../../src/tidepool/mod.ts";

// ---------------------------------------------------------------------------
// Component constructors
// ---------------------------------------------------------------------------

Deno.test("card: produces correct shape", () => {
  const c = card("c1", "My Title", "Body text");
  assertEquals(c.type, "card");
  assertEquals(c.id, "c1");
  assertEquals(c.props.title, "My Title");
  assertEquals(c.props.content, "Body text");
  assertEquals(c.children, undefined);
});

Deno.test("table: produces correct shape", () => {
  const t = table("t1", ["Name", "Age"], [["Alice", "30"], ["Bob", "25"]]);
  assertEquals(t.type, "table");
  assertEquals(t.id, "t1");
  assertEquals(t.props.headers, ["Name", "Age"]);
  assertEquals(t.props.rows, [["Alice", "30"], ["Bob", "25"]]);
});

Deno.test("markdown: produces correct shape", () => {
  const m = markdown("m1", "# Hello");
  assertEquals(m.type, "markdown");
  assertEquals(m.id, "m1");
  assertEquals(m.props.content, "# Hello");
});

Deno.test("layout: produces correct shape with children", () => {
  const child1 = card("c1", "A", "a");
  const child2 = card("c2", "B", "b");
  const l = layout("l1", "row", [child1, child2]);
  assertEquals(l.type, "layout");
  assertEquals(l.id, "l1");
  assertEquals(l.props.direction, "row");
  assertExists(l.children);
  assertEquals(l.children!.length, 2);
  assertEquals(l.children![0].id, "c1");
  assertEquals(l.children![1].id, "c2");
});

Deno.test("layout: column direction", () => {
  const l = layout("l2", "column", []);
  assertEquals(l.props.direction, "column");
  assertEquals(l.children!.length, 0);
});

// ---------------------------------------------------------------------------
// A2UIHost WebSocket tests
// ---------------------------------------------------------------------------

const TEST_PORT = 9877;

Deno.test({
  name: "A2UIHost: tracks connections",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const host = createA2UIHost();
    await host.start(TEST_PORT);

    try {
      assertEquals(host.connections, 0);

      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}`);
      await new Promise<void>((resolve) => { ws.onopen = () => resolve(); });

      // Give the server a moment to register the connection
      await new Promise<void>((resolve) => setTimeout(resolve, 50));

      assertEquals(host.connections, 1);

      ws.close();
      // Wait for close to propagate
      await new Promise<void>((resolve) => setTimeout(resolve, 100));

      assertEquals(host.connections, 0);
    } finally {
      await host.stop();
    }
  },
});

Deno.test({
  name: "A2UIHost: broadcasts tree to all connected clients",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const host = createA2UIHost();
    await host.start(TEST_PORT + 1);

    try {
      const ws1 = new WebSocket(`ws://127.0.0.1:${TEST_PORT + 1}`);
      const ws2 = new WebSocket(`ws://127.0.0.1:${TEST_PORT + 1}`);

      await Promise.all([
        new Promise<void>((resolve) => { ws1.onopen = () => resolve(); }),
        new Promise<void>((resolve) => { ws2.onopen = () => resolve(); }),
      ]);

      // Wait for server-side registration
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      assertEquals(host.connections, 2);

      const tree: ComponentTree = {
        root: card("r1", "Root", "Hello"),
        version: 1,
      };

      const received1 = new Promise<ComponentTree>((resolve) => {
        ws1.onmessage = (event: MessageEvent) => {
          resolve(JSON.parse(event.data as string));
        };
      });

      const received2 = new Promise<ComponentTree>((resolve) => {
        ws2.onmessage = (event: MessageEvent) => {
          resolve(JSON.parse(event.data as string));
        };
      });

      host.broadcast(tree);

      const [result1, result2] = await Promise.all([received1, received2]);

      assertEquals(result1.version, 1);
      assertEquals(result1.root.type, "card");
      assertEquals(result1.root.id, "r1");
      assertEquals(result2.version, 1);
      assertEquals(result2.root.id, "r1");

      ws1.close();
      ws2.close();
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    } finally {
      await host.stop();
    }
  },
});

Deno.test({
  name: "A2UIHost: sends current tree on new connection",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const host = createA2UIHost();
    await host.start(TEST_PORT + 2);

    try {
      const tree: ComponentTree = {
        root: markdown("intro", "# Welcome"),
        version: 5,
      };
      host.broadcast(tree);

      // Connect after broadcast — should get current tree immediately
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT + 2}`);

      const received = new Promise<ComponentTree>((resolve) => {
        ws.onmessage = (event: MessageEvent) => {
          resolve(JSON.parse(event.data as string));
        };
      });

      await new Promise<void>((resolve) => { ws.onopen = () => resolve(); });

      const result = await received;
      assertEquals(result.version, 5);
      assertEquals(result.root.id, "intro");
      assertEquals(result.root.type, "markdown");

      ws.close();
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    } finally {
      await host.stop();
    }
  },
});

Deno.test({
  name: "A2UIHost: disconnected client does not cause errors",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const host = createA2UIHost();
    await host.start(TEST_PORT + 3);

    try {
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT + 3}`);
      await new Promise<void>((resolve) => { ws.onopen = () => resolve(); });
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
      assertEquals(host.connections, 1);

      // Close the client
      ws.close();
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
      assertEquals(host.connections, 0);

      // Broadcast after disconnect — should not throw
      const tree: ComponentTree = {
        root: card("orphan", "Title", "No receivers"),
        version: 1,
      };
      host.broadcast(tree);

      // No error means success
      assertEquals(host.connections, 0);
    } finally {
      await host.stop();
    }
  },
});

// ---------------------------------------------------------------------------
// TidePoolTools tests
// ---------------------------------------------------------------------------

Deno.test({
  name: "TidePoolTools: render sends tree to host",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const host = createA2UIHost();
    await host.start(TEST_PORT + 4);

    try {
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT + 4}`);
      await new Promise<void>((resolve) => { ws.onopen = () => resolve(); });
      await new Promise<void>((resolve) => setTimeout(resolve, 50));

      const tools = createTidePoolTools(host);

      const tree: ComponentTree = {
        root: card("main", "Dashboard", "Content"),
        version: 1,
      };

      const received = new Promise<ComponentTree>((resolve) => {
        ws.onmessage = (event: MessageEvent) => {
          resolve(JSON.parse(event.data as string));
        };
      });

      const result = tools.render(tree);
      assert(result.ok);

      const clientReceived = await received;
      assertEquals(clientReceived.version, 1);
      assertEquals(clientReceived.root.id, "main");

      ws.close();
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    } finally {
      await host.stop();
    }
  },
});

Deno.test({
  name: "TidePoolTools: update patches component by ID",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const host = createA2UIHost();
    await host.start(TEST_PORT + 5);

    try {
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT + 5}`);
      await new Promise<void>((resolve) => { ws.onopen = () => resolve(); });
      await new Promise<void>((resolve) => setTimeout(resolve, 50));

      const tools = createTidePoolTools(host);

      const tree: ComponentTree = {
        root: layout("root", "column", [
          card("header", "Old Title", "Old Content"),
          markdown("body", "# Old"),
        ]),
        version: 1,
      };

      // Render initial tree
      tools.render(tree);

      // Drain the initial render message
      await new Promise<void>((resolve) => {
        ws.onmessage = () => resolve();
      });

      // Set up listener for the update
      const updated = new Promise<ComponentTree>((resolve) => {
        ws.onmessage = (event: MessageEvent) => {
          resolve(JSON.parse(event.data as string));
        };
      });

      // Update the header card
      const updateResult = tools.update("header", {
        title: "New Title",
        content: "New Content",
      });
      assert(updateResult.ok);

      const received = await updated;
      assertEquals(received.version, 2); // version incremented
      // Find the header in children
      const headerChild = received.root.children?.find(
        (c: A2UIComponent) => c.id === "header",
      );
      assertExists(headerChild);
      assertEquals(headerChild!.props.title, "New Title");
      assertEquals(headerChild!.props.content, "New Content");

      ws.close();
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    } finally {
      await host.stop();
    }
  },
});

Deno.test("TidePoolTools: update returns error when no tree rendered", () => {
  // Use a mock host that doesn't need a server
  const broadcasts: ComponentTree[] = [];
  const mockHost = {
    start: async (_port: number) => {},
    stop: async () => {},
    broadcast: (tree: ComponentTree) => { broadcasts.push(tree); },
    get connections() { return 0; },
  };

  const tools = createTidePoolTools(mockHost);
  const result = tools.update("nonexistent", { title: "X" });
  assert(!result.ok);
  if (!result.ok) {
    assertEquals(result.error, "No tree rendered yet");
  }
});

Deno.test("TidePoolTools: update returns error for unknown component ID", () => {
  const broadcasts: ComponentTree[] = [];
  const mockHost = {
    start: async (_port: number) => {},
    stop: async () => {},
    broadcast: (tree: ComponentTree) => { broadcasts.push(tree); },
    get connections() { return 0; },
  };

  const tools = createTidePoolTools(mockHost);
  tools.render({
    root: card("only-card", "Title", "Body"),
    version: 1,
  });

  const result = tools.update("nonexistent-id", { title: "X" });
  assert(!result.ok);
  if (!result.ok) {
    assertEquals(result.error, "Component not found: nonexistent-id");
  }
});

Deno.test({
  name: "TidePoolTools: clear resets tree",
  sanitizeResources: false,
  sanitizeOps: false,
  fn: async () => {
    const host = createA2UIHost();
    await host.start(TEST_PORT + 6);

    try {
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT + 6}`);
      await new Promise<void>((resolve) => { ws.onopen = () => resolve(); });
      await new Promise<void>((resolve) => setTimeout(resolve, 50));

      const tools = createTidePoolTools(host);

      // Render a tree first
      tools.render({
        root: card("main", "Title", "Body"),
        version: 1,
      });

      // Drain the render message
      await new Promise<void>((resolve) => {
        ws.onmessage = () => resolve();
      });

      // Listen for clear broadcast
      const cleared = new Promise<ComponentTree>((resolve) => {
        ws.onmessage = (event: MessageEvent) => {
          resolve(JSON.parse(event.data as string));
        };
      });

      const result = tools.clear();
      assert(result.ok);

      const received = await cleared;
      assertEquals(received.version, 2); // version 1 + 1
      assertEquals(received.root.id, "__empty");
      assertEquals(received.root.type, "layout");
      assertEquals(received.root.children!.length, 0);

      ws.close();
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    } finally {
      await host.stop();
    }
  },
});

Deno.test("TidePoolTools: clear without prior render uses version 0", () => {
  const broadcasts: ComponentTree[] = [];
  const mockHost = {
    start: async (_port: number) => {},
    stop: async () => {},
    broadcast: (tree: ComponentTree) => { broadcasts.push(tree); },
    get connections() { return 0; },
  };

  const tools = createTidePoolTools(mockHost);
  const result = tools.clear();
  assert(result.ok);
  assertEquals(broadcasts.length, 1);
  assertEquals(broadcasts[0].version, 0);
  assertEquals(broadcasts[0].root.id, "__empty");
});
