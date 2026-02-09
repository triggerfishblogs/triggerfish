/**
 * Phase 0: Project Scaffolding
 * These tests MUST FAIL until Phase 0 implementation is complete.
 * They validate: deno.json tasks, directory structure, mod.ts exports.
 */
import { assertEquals, assertExists, assertMatch } from "jsr:@std/assert";

Deno.test("src/mod.ts exports VERSION matching semver", async () => {
  const mod = await import("../src/mod.ts");
  assertExists(mod.VERSION, "VERSION must be exported from src/mod.ts");
  assertMatch(
    mod.VERSION as string,
    /^\d+\.\d+\.\d+/,
    "VERSION must match semver pattern",
  );
});

Deno.test("src/mod.ts exports NAME", async () => {
  const mod = await import("../src/mod.ts");
  assertExists(mod.NAME, "NAME must be exported from src/mod.ts");
  assertEquals(mod.NAME, "triggerfish");
});

Deno.test("directory structure exists", async () => {
  const requiredDirs = [
    "src/core/types",
    "src/core/policy",
    "src/core/session",
    "src/mcp/client",
    "src/mcp/gateway",
    "src/plugin",
    "src/channels/cli",
    "src/agent",
    "src/exec",
    "src/integrations",
    "src/cli",
    "src/gateway",
    "tests/core",
    "tests/mcp",
    "tests/plugin",
    "tests/channels",
    "tests/agent",
    "tests/exec",
    "tests/e2e",
    "tests/cli",
    "config",
  ];

  for (const dir of requiredDirs) {
    try {
      const stat = await Deno.stat(dir);
      assertEquals(stat.isDirectory, true, `${dir} must be a directory`);
    } catch {
      throw new Error(`Required directory missing: ${dir}`);
    }
  }
});

Deno.test("deno.json has required tasks", async () => {
  const raw = await Deno.readTextFile("deno.json");
  const config = JSON.parse(raw);
  const requiredTasks = ["test", "lint", "fmt", "check"];
  for (const task of requiredTasks) {
    assertExists(
      config.tasks?.[task],
      `deno.json must define task: ${task}`,
    );
  }
});

Deno.test("deno.json has strict TypeScript compiler options", async () => {
  const raw = await Deno.readTextFile("deno.json");
  const config = JSON.parse(raw);
  assertEquals(
    config.compilerOptions?.strict,
    true,
    "compilerOptions.strict must be true",
  );
});
