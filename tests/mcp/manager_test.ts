/**
 * MCP Server Manager tests.
 *
 * Tests lifecycle management, env var resolution, and graceful degradation.
 */
import { assertEquals } from "@std/assert";
import {
  createMcpServerManager,
  resolveEnvVars,
  createMcpServerAdapter,
  enforceCommandAllowlist,
  DEFAULT_ALLOWED_MCP_COMMANDS,
} from "../../src/mcp/manager.ts";
import type { McpServerConfig } from "../../src/mcp/manager.ts";
import { createMemorySecretStore } from "../../src/core/secrets/keychain/keychain.ts";

// --- resolveEnvVars ---

Deno.test("resolveEnvVars: passes plain string values through", async () => {
  const result = await resolveEnvVars({ FOO: "bar", BAZ: "qux" });
  assertEquals(result, { FOO: "bar", BAZ: "qux" });
});

Deno.test("resolveEnvVars: resolves keychain: prefixed values from SecretStore", async () => {
  const store = createMemorySecretStore();
  await store.setSecret("my-token", "secret123");

  const result = await resolveEnvVars(
    { TOKEN: "keychain:my-token", PLAIN: "value" },
    store,
  );
  assertEquals(result.TOKEN, "secret123");
  assertEquals(result.PLAIN, "value");
});

Deno.test("resolveEnvVars: skips keychain: values when secret not found", async () => {
  const store = createMemorySecretStore();

  const result = await resolveEnvVars(
    { TOKEN: "keychain:nonexistent", PLAIN: "value" },
    store,
  );
  // TOKEN should be absent since the secret wasn't found
  assertEquals(result.PLAIN, "value");
  assertEquals(result.TOKEN, undefined);
});

Deno.test("resolveEnvVars: skips keychain: values when no SecretStore", async () => {
  const result = await resolveEnvVars({ TOKEN: "keychain:my-token" });
  assertEquals(result.TOKEN, undefined);
});

// --- createMcpServerAdapter ---

Deno.test("createMcpServerAdapter: wraps callTool errors into Result", async () => {
  const mockClient = {
    initialize: () => Promise.reject(new Error("not needed")),
    listTools: () => Promise.reject(new Error("not needed")),
    listResources: () => Promise.reject(new Error("not needed")),
    callTool: () => Promise.reject(new Error("connection refused")),
  };

  const adapter = createMcpServerAdapter(mockClient, "INTERNAL");
  const result = await adapter.callTool("test_tool", {});
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("connection refused"), true);
  }
});

Deno.test("createMcpServerAdapter: returns successful result with content", async () => {
  const mockClient = {
    initialize: () => Promise.reject(new Error("not needed")),
    listTools: () => Promise.reject(new Error("not needed")),
    listResources: () => Promise.reject(new Error("not needed")),
    callTool: () =>
      Promise.resolve({
        content: [{ type: "text", text: "hello world" }],
      }),
  };

  const adapter = createMcpServerAdapter(mockClient, "CONFIDENTIAL");
  const result = await adapter.callTool("test_tool", {});
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.content, "hello world");
    assertEquals(result.value.classification, "CONFIDENTIAL");
  }
});

// --- McpServerManager ---

Deno.test("McpServerManager: connectAll with no configs returns empty", async () => {
  const manager = createMcpServerManager();
  const connected = await manager.connectAll([]);
  assertEquals(connected.length, 0);
  assertEquals(manager.getConnected().length, 0);
});

Deno.test("McpServerManager: skips disabled servers", async () => {
  const manager = createMcpServerManager();
  const configs: McpServerConfig[] = [
    {
      id: "disabled-server",
      command: "echo",
      args: ["hello"],
      enabled: false,
    },
  ];
  const connected = await manager.connectAll(configs);
  assertEquals(connected.length, 0);
});

Deno.test("McpServerManager: skips servers with no command or url", async () => {
  const manager = createMcpServerManager();
  const configs: McpServerConfig[] = [
    {
      id: "no-transport",
      // No command or url
    },
  ];
  const connected = await manager.connectAll(configs);
  assertEquals(connected.length, 0);
});

Deno.test("McpServerManager: graceful degradation on connect failure", async () => {
  const manager = createMcpServerManager();
  const configs: McpServerConfig[] = [
    {
      id: "bad-server",
      command: "nonexistent-binary-that-does-not-exist-12345",
      args: [],
    },
  ];
  // Should not throw — graceful degradation
  const connected = await manager.connectAll(configs);
  assertEquals(connected.length, 0);
});

Deno.test("McpServerManager: disconnectAll is safe when empty", async () => {
  const manager = createMcpServerManager();
  // Should not throw
  await manager.disconnectAll();
  assertEquals(manager.getConnected().length, 0);
});

Deno.test("McpServerManager: disconnectAll after connectAll with no servers", async () => {
  const manager = createMcpServerManager();
  await manager.connectAll([]);
  await manager.disconnectAll();
  assertEquals(manager.getConnected().length, 0);
});

// --- startAll / getStatus / getConfiguredCount / onStatusChange ---

Deno.test("McpServerManager: getConfiguredCount returns 0 before startAll", () => {
  const manager = createMcpServerManager();
  assertEquals(manager.getConfiguredCount(), 0);
});

Deno.test("McpServerManager: getStatus returns empty array before startAll", () => {
  const manager = createMcpServerManager();
  assertEquals(manager.getStatus().length, 0);
});

Deno.test("McpServerManager: startAll with no configs sets configuredCount to 0", () => {
  const manager = createMcpServerManager();
  manager.startAll([]);
  assertEquals(manager.getConfiguredCount(), 0);
  assertEquals(manager.getStatus().length, 0);
});

Deno.test(
  { name: "McpServerManager: startAll counts non-disabled configs", sanitizeOps: false, sanitizeResources: false },
  () => {
    const manager = createMcpServerManager();
    const configs: McpServerConfig[] = [
      { id: "a", command: "echo", args: [] },
      { id: "b", command: "echo", args: [], enabled: false },
      { id: "c", url: "http://localhost:9999" },
    ];
    // startAll is non-blocking; we only check configuredCount immediately
    manager.startAll(configs);
    // 2 active configs (a + c); b is disabled
    assertEquals(manager.getConfiguredCount(), 2);
  },
);

Deno.test(
  {
    name: "McpServerManager: onStatusChange callback is invoked on status update",
    sanitizeOps: false,
    sanitizeResources: false,
  },
  async () => {
    const manager = createMcpServerManager();
    const received: number[] = [];
    const unsub = manager.onStatusChange((statuses) => {
      received.push(statuses.length);
    });

    // Manually simulate status notification by calling startAll with a bad server
    // The first status change fires almost immediately (connecting state)
    const configs: McpServerConfig[] = [
      { id: "bad", command: "nonexistent-binary-that-does-not-exist-99999", args: [] },
    ];
    manager.startAll(configs);

    // Wait briefly for the first status notification (connecting state)
    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    // Should have received at least one notification
    assertEquals(received.length > 0, true);
    // The notification should report 1 status entry
    assertEquals(received[0], 1);

    unsub();
  },
);

Deno.test(
  {
    name: "McpServerManager: onStatusChange unsubscribe stops notifications",
    sanitizeOps: false,
    sanitizeResources: false,
  },
  async () => {
    const manager = createMcpServerManager();
    let callCount = 0;
    const unsub = manager.onStatusChange(() => {
      callCount++;
    });

    // Unsubscribe immediately
    unsub();

    // Start with a bad server — would normally fire notifications
    manager.startAll([
      { id: "bad2", command: "nonexistent-binary-xyz", args: [] },
    ]);

    await new Promise<void>((resolve) => setTimeout(resolve, 50));

    // No callbacks should have fired after unsubscribe
    assertEquals(callCount, 0);
  },
);

Deno.test("McpServerManager: startAll with no-transport server marks it as failed", () => {
  const manager = createMcpServerManager();
  manager.startAll([{ id: "no-transport" }]);
  // no-transport entry goes directly to "failed"
  const statuses = manager.getStatus();
  assertEquals(statuses.length, 1);
  assertEquals(statuses[0].id, "no-transport");
  assertEquals(statuses[0].state, "failed");
});

Deno.test("McpServerManager: getConnected reflects newly connected servers", async () => {
  // Initially empty
  const manager = createMcpServerManager();
  assertEquals(manager.getConnected().length, 0);
  // connectAll still works for backward compat
  const result = await manager.connectAll([]);
  assertEquals(result.length, 0);
  assertEquals(manager.getConnected().length, 0);
});

// --- enforceCommandAllowlist ---

Deno.test("enforceCommandAllowlist: rejects commands not in allowlist", () => {
  const result = enforceCommandAllowlist("curl");
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("curl"), true);
    assertEquals(result.error.includes("allowlist"), true);
  }
});

Deno.test("enforceCommandAllowlist: allows all built-in commands", () => {
  for (const cmd of DEFAULT_ALLOWED_MCP_COMMANDS) {
    const result = enforceCommandAllowlist(cmd);
    assertEquals(result.ok, true, `Expected "${cmd}" to be allowed`);
  }
});

Deno.test("enforceCommandAllowlist: strips path prefix and validates by basename", () => {
  assertEquals(enforceCommandAllowlist("/usr/bin/node").ok, true);
  assertEquals(enforceCommandAllowlist("/usr/local/bin/npx").ok, true);
  assertEquals(enforceCommandAllowlist("/usr/bin/curl").ok, false);
  assertEquals(enforceCommandAllowlist("C:\\Windows\\System32\\cmd.exe").ok, false);
});

Deno.test("enforceCommandAllowlist: extraAllowed extends built-in allowlist", () => {
  assertEquals(enforceCommandAllowlist("my-mcp-server", ["my-mcp-server"]).ok, true);
  assertEquals(enforceCommandAllowlist("npx", ["my-mcp-server"]).ok, true);
  assertEquals(enforceCommandAllowlist("other-tool", ["my-mcp-server"]).ok, false);
});

Deno.test("McpServerManager: connectAll rejects disallowed command gracefully", async () => {
  const manager = createMcpServerManager();
  const configs: McpServerConfig[] = [
    { id: "bad-cmd", command: "curl", args: ["http://example.com"] },
  ];
  // Should not throw — graceful degradation same as connect failure
  const connected = await manager.connectAll(configs);
  assertEquals(connected.length, 0);
});

Deno.test("createMcpServerAdapter: classification ceiling caps result", async () => {
  const mockClient = {
    initialize: () => Promise.reject(new Error("not needed")),
    listTools: () => Promise.reject(new Error("not needed")),
    listResources: () => Promise.reject(new Error("not needed")),
    callTool: () =>
      Promise.resolve({ content: [{ type: "text", text: "sensitive data" }] }),
  };

  // Server declares RESTRICTED but ceiling caps at INTERNAL
  const adapter = createMcpServerAdapter(mockClient, "RESTRICTED", "INTERNAL");
  const result = await adapter.callTool("test_tool", {});
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.classification, "INTERNAL");
  }
});

Deno.test("createMcpServerAdapter: no ceiling passes declared classification unchanged", async () => {
  const mockClient = {
    initialize: () => Promise.reject(new Error("not needed")),
    listTools: () => Promise.reject(new Error("not needed")),
    listResources: () => Promise.reject(new Error("not needed")),
    callTool: () =>
      Promise.resolve({ content: [{ type: "text", text: "data" }] }),
  };

  const adapter = createMcpServerAdapter(mockClient, "RESTRICTED");
  const result = await adapter.callTool("test_tool", {});
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.classification, "RESTRICTED");
  }
});

Deno.test(
  {
    name: "McpServerManager: retry loop stops after maxRetries and marks server FAILED",
    sanitizeOps: false,
    sanitizeResources: false,
  },
  async () => {
    const manager = createMcpServerManager();
    // "curl" is not in the allowlist — fails validation immediately (no I/O)
    manager.startAll([{
      id: "always-fails",
      command: "curl",
      args: [],
      maxRetries: 1,
    }]);

    // Validation fails synchronously inside the async loop — no sleeps needed
    await new Promise<void>((resolve) => setTimeout(resolve, 100));

    const statuses = manager.getStatus();
    assertEquals(statuses.length, 1);
    assertEquals(statuses[0].id, "always-fails");
    assertEquals(statuses[0].state, "failed");
    assertEquals(statuses[0].lastError?.includes("Max retries"), true);
  },
);
