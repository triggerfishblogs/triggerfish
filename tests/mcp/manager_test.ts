/**
 * MCP Server Manager tests.
 *
 * Tests lifecycle management, env var resolution, and graceful degradation.
 */
import { assertEquals, assertExists } from "@std/assert";
import {
  createMcpServerManager,
  resolveEnvVars,
  createMcpServerAdapter,
} from "../../src/mcp/manager.ts";
import type { McpServerConfig } from "../../src/mcp/manager.ts";
import { createMemorySecretStore } from "../../src/secrets/keychain.ts";

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
