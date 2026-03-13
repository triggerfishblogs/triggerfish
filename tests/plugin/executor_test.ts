/**
 * Tests for the composite plugin executor.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createPluginRegistry } from "../../src/plugin/registry.ts";
import { createPluginExecutor } from "../../src/plugin/executor.ts";
import { resolveEffectiveTrust } from "../../src/plugin/sandboxed_executor.ts";
import type { RegisteredPlugin } from "../../src/plugin/types.ts";

function makePlugin(
  name: string,
  handler: (
    toolName: string,
    input: Record<string, unknown>,
  ) => Promise<string | null>,
): RegisteredPlugin {
  return {
    loaded: {
      exports: {
        manifest: {
          name,
          version: "1.0.0",
          description: `Plugin ${name}`,
          classification: "PUBLIC",
          trust: "sandboxed",
          declaredEndpoints: [],
        },
        toolDefinitions: [],
        createExecutor: () => handler,
      },
      sourcePath: `/plugins/${name}/mod.ts`,
    },
    executor: handler,
    namespacedTools: [],
  };
}

Deno.test("createPluginExecutor dispatches to correct plugin", async () => {
  const registry = createPluginRegistry();
  registry.registerPlugin(
    // deno-lint-ignore require-await
    makePlugin("alpha", async (name) => {
      if (name === "greet") return "hello from alpha";
      return null;
    }),
  );
  registry.registerPlugin(
    // deno-lint-ignore require-await
    makePlugin("beta", async (name) => {
      if (name === "greet") return "hello from beta";
      return null;
    }),
  );

  const executor = createPluginExecutor(registry);
  assertEquals(await executor("plugin_alpha_greet", {}), "hello from alpha");
  assertEquals(await executor("plugin_beta_greet", {}), "hello from beta");
});

Deno.test("createPluginExecutor returns null for non-plugin tools", async () => {
  const registry = createPluginRegistry();
  const executor = createPluginExecutor(registry);
  assertEquals(await executor("web_fetch", {}), null);
  assertEquals(await executor("mcp_server_tool", {}), null);
});

Deno.test("createPluginExecutor passes input to plugin executor", async () => {
  const registry = createPluginRegistry();
  registry.registerPlugin(
    // deno-lint-ignore require-await
    makePlugin("echo", async (_name, input) => {
      return JSON.stringify(input);
    }),
  );

  const executor = createPluginExecutor(registry);
  const result = await executor("plugin_echo_anything", { key: "value" });
  assertEquals(result, '{"key":"value"}');
});

Deno.test("createPluginExecutor returns null for unknown plugin", async () => {
  const registry = createPluginRegistry();
  registry.registerPlugin(
    // deno-lint-ignore require-await
    makePlugin("known", async () => "ok"),
  );
  const executor = createPluginExecutor(registry);
  assertEquals(await executor("plugin_unknown_tool", {}), null);
});

// ─── Trust resolution ──────────────────────────────────────────────────────────

Deno.test("resolveEffectiveTrust: both trusted yields trusted", () => {
  assertEquals(resolveEffectiveTrust("trusted", "trusted"), "trusted");
});

Deno.test("resolveEffectiveTrust: manifest sandboxed always sandboxed", () => {
  assertEquals(resolveEffectiveTrust("sandboxed", "trusted"), "sandboxed");
  assertEquals(resolveEffectiveTrust("sandboxed", "sandboxed"), "sandboxed");
});

Deno.test("resolveEffectiveTrust: config sandboxed overrides manifest trusted", () => {
  assertEquals(resolveEffectiveTrust("trusted", "sandboxed"), "sandboxed");
});
