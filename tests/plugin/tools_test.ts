/**
 * Tests for plugin management tools (hot-reload).
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createPluginRegistry } from "../../src/plugin/registry.ts";
import { createPluginToolExecutor } from "../../src/plugin/tools.ts";
import type { RegisteredPlugin } from "../../src/plugin/types.ts";

function makePlugin(name: string): RegisteredPlugin {
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
        toolDefinitions: [
          { name: "action", description: "Do action", parameters: {} },
        ],
        // deno-lint-ignore require-await
        createExecutor: () => async () => null,
      },
      sourcePath: `/plugins/${name}/mod.ts`,
    },
    // deno-lint-ignore require-await
    executor: async () => null,
    namespacedTools: [
      {
        name: `plugin_${name}_action`,
        description: `[Plugin: ${name}] Do action`,
        parameters: {},
      },
    ],
  };
}

function makeToolExecutor() {
  const registry = createPluginRegistry();
  const toolClassifications = new Map<string, string>();
  const integrationClassifications = new Map<string, string>();
  const executor = createPluginToolExecutor({
    registry,
    getSessionTaint: () => "PUBLIC",
    pluginsConfig: {},
    toolClassifications: toolClassifications as unknown as Map<
      string,
      "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED"
    >,
    integrationClassifications: integrationClassifications as unknown as Map<
      string,
      "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED"
    >,
  });
  return { registry, executor, toolClassifications, integrationClassifications };
}

Deno.test("plugin_list: shows empty when no plugins", async () => {
  const { executor } = makeToolExecutor();
  const result = await executor("plugin_list", {});
  assertEquals(result, "No plugins are currently registered.");
});

Deno.test("plugin_list: shows registered plugins", async () => {
  const { registry, executor } = makeToolExecutor();
  registry.registerPlugin(makePlugin("alpha"));
  const result = await executor("plugin_list", {});
  assertEquals(result !== null, true);
  const parsed = JSON.parse(result!);
  assertEquals(parsed.length, 1);
  assertEquals(parsed[0].name, "alpha");
});

Deno.test("plugin_install: rejects missing name", async () => {
  const { executor } = makeToolExecutor();
  const result = await executor("plugin_install", {});
  assertEquals(result!.includes("requires"), true);
});

Deno.test("plugin_install: rejects plugin not in config", async () => {
  const { executor } = makeToolExecutor();
  const result = await executor("plugin_install", { name: "nonexistent" });
  assertEquals(result!.includes("not enabled"), true);
});

Deno.test("plugin_install: rejects already registered", async () => {
  const { registry, executor } = makeToolExecutor();
  registry.registerPlugin(makePlugin("alpha"));
  const result = await executor("plugin_install", { name: "alpha" });
  assertEquals(result!.includes("already registered"), true);
});

Deno.test("plugin_reload: rejects unregistered plugin", async () => {
  const { executor } = makeToolExecutor();
  const result = await executor("plugin_reload", { name: "nonexistent" });
  assertEquals(result!.includes("not registered"), true);
});

Deno.test("plugin_reload: rejects missing name", async () => {
  const { executor } = makeToolExecutor();
  const result = await executor("plugin_reload", {});
  assertEquals(result!.includes("requires"), true);
});

Deno.test("returns null for unknown tool names", async () => {
  const { executor } = makeToolExecutor();
  const result = await executor("web_fetch", {});
  assertEquals(result, null);
});

Deno.test("plugin_list: returns null for non-matching tools", async () => {
  const { executor } = makeToolExecutor();
  assertEquals(await executor("unknown_tool", {}), null);
});
