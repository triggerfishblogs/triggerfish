/**
 * Tests for the healthcheck tool — platform runtime introspection.
 *
 * Covers: all components, single component, healthy state,
 * degraded/error state, default components, null-return chain.
 */
import { assertEquals, assertStringIncludes } from "@std/assert";
import { createMemoryStorage } from "../../src/core/storage/memory.ts";
import {
  createHealthcheckToolExecutor,
  getHealthcheckToolDefinitions,
  HEALTHCHECK_SYSTEM_PROMPT,
} from "../../src/tools/mod.ts";
import type { HealthcheckDeps } from "../../src/tools/mod.ts";
import type { LlmProvider, LlmProviderRegistry, LlmCompletionResult } from "../../src/agent/llm.ts";

/** Create a mock registry with a default provider. */
function createMockRegistry(defaultProvider?: LlmProvider): LlmProviderRegistry {
  return {
    register(): void {},
    get(): LlmProvider | undefined { return undefined; },
    setDefault(): void {},
    getDefault(): LlmProvider | undefined { return defaultProvider; },
  };
}

/** Create a mock provider. */
function createMockProvider(name: string): LlmProvider {
  return {
    name,
    supportsStreaming: false,
    complete(): Promise<LlmCompletionResult> {
      return Promise.resolve({
        content: "OK",
        toolCalls: [],
        usage: { inputTokens: 1, outputTokens: 1 },
      });
    },
  };
}

// ─── Tool definitions ──────────────────────────────────────────

Deno.test("getHealthcheckToolDefinitions returns healthcheck definition", () => {
  const defs = getHealthcheckToolDefinitions();
  assertEquals(defs.length, 1);
  assertEquals(defs[0].name, "healthcheck");
});

Deno.test("HEALTHCHECK_SYSTEM_PROMPT is non-empty", () => {
  assertStringIncludes(HEALTHCHECK_SYSTEM_PROMPT, "healthcheck");
});

// ─── All components ────────────────────────────────────────────

Deno.test("healthcheck: all components returns structured report", async () => {
  const storage = createMemoryStorage();
  const provider = createMockProvider("test-provider");
  const registry = createMockRegistry(provider);
  const deps: HealthcheckDeps = {
    providerRegistry: registry,
    storageProvider: storage,
  };
  const executor = createHealthcheckToolExecutor(deps);

  const result = await executor("healthcheck", {});
  assertStringIncludes(result!, "Healthcheck Report");
  assertStringIncludes(result!, "providers");
  assertStringIncludes(result!, "storage");
  assertStringIncludes(result!, "config");
  assertStringIncludes(result!, "Overall: ");

  await storage.close();
});

// ─── Single component ──────────────────────────────────────────

Deno.test("healthcheck: single component check — providers only", async () => {
  const provider = createMockProvider("test-provider");
  const registry = createMockRegistry(provider);
  const deps: HealthcheckDeps = { providerRegistry: registry };
  const executor = createHealthcheckToolExecutor(deps);

  const result = await executor("healthcheck", { components: ["providers"] });
  assertStringIncludes(result!, "providers");
  assertStringIncludes(result!, "test-provider");
  // Should NOT contain storage/skills/config since not requested
  assertEquals(result!.includes("storage:"), false);
});

Deno.test("healthcheck: single component check — storage only", async () => {
  const storage = createMemoryStorage();
  const deps: HealthcheckDeps = { storageProvider: storage };
  const executor = createHealthcheckToolExecutor(deps);

  const result = await executor("healthcheck", { components: ["storage"] });
  assertStringIncludes(result!, "storage");
  assertStringIncludes(result!, "round-trip OK");

  await storage.close();
});

// ─── Healthy state ─────────────────────────────────────────────

Deno.test("healthcheck: healthy state reports HEALTHY overall", async () => {
  const storage = createMemoryStorage();
  const provider = createMockProvider("test-provider");
  const registry = createMockRegistry(provider);
  const deps: HealthcheckDeps = {
    providerRegistry: registry,
    storageProvider: storage,
  };
  const executor = createHealthcheckToolExecutor(deps);

  const result = await executor("healthcheck", { components: ["providers", "storage", "config"] });
  assertStringIncludes(result!, "Overall: HEALTHY");

  await storage.close();
});

// ─── Degraded/error state ──────────────────────────────────────

Deno.test("healthcheck: missing deps reported as error", async () => {
  const deps: HealthcheckDeps = {};
  const executor = createHealthcheckToolExecutor(deps);

  const result = await executor("healthcheck", { components: ["all"] });
  assertStringIncludes(result!, "[ERR]");
  assertStringIncludes(result!, "No provider registry");
  assertStringIncludes(result!, "No storage provider");
});

Deno.test("healthcheck: no default provider is degraded", async () => {
  const registry = createMockRegistry(undefined);
  const deps: HealthcheckDeps = { providerRegistry: registry };
  const executor = createHealthcheckToolExecutor(deps);

  const result = await executor("healthcheck", { components: ["providers"] });
  assertStringIncludes(result!, "[WARN]");
  assertStringIncludes(result!, "no default provider");
});

// ─── Default components ────────────────────────────────────────

Deno.test("healthcheck: no input defaults to all", async () => {
  const storage = createMemoryStorage();
  const provider = createMockProvider("test-provider");
  const registry = createMockRegistry(provider);
  const deps: HealthcheckDeps = {
    providerRegistry: registry,
    storageProvider: storage,
  };
  const executor = createHealthcheckToolExecutor(deps);

  const result = await executor("healthcheck", {});
  assertStringIncludes(result!, "providers");
  assertStringIncludes(result!, "storage");
  assertStringIncludes(result!, "config");

  await storage.close();
});

// ─── Null-return chain ─────────────────────────────────────────

Deno.test("healthcheck: returns null for unknown tool name", async () => {
  const deps: HealthcheckDeps = {};
  const executor = createHealthcheckToolExecutor(deps);

  const result = await executor("unknown_tool", {});
  assertEquals(result, null);
});
