/**
 * Tests for per-classification LLM provider/model support.
 *
 * Covers: config validation, registry classification overrides,
 * provider loading with classification_models, and provider
 * selection in the agent loop.
 */
import { assertEquals, assertExists, assert } from "@std/assert";
import {
  createProviderRegistry,
  type LlmProvider,
} from "../../src/agent/llm.ts";
import { loadProvidersFromConfig } from "../../src/agent/providers/config.ts";
import { validateConfig } from "../../src/core/config.ts";

// ── Test helpers ──────────────────────────────────────────────────────────────

function createMockProvider(name: string, contextWindow?: number): LlmProvider {
  return {
    name,
    supportsStreaming: true,
    contextWindow,
    complete: () => Promise.resolve({ content: "", toolCalls: [], usage: { inputTokens: 0, outputTokens: 0 } }),
  };
}

// ── Registry: getForClassification ────────────────────────────────────────────

Deno.test("Registry: getForClassification returns override when registered", () => {
  const registry = createProviderRegistry();
  const defaultProvider = createMockProvider("anthropic");
  const ollamaProvider = createMockProvider("ollama");

  registry.register(defaultProvider);
  registry.setDefault("anthropic");
  registry.registerClassificationOverride("CONFIDENTIAL", ollamaProvider);

  const result = registry.getForClassification("CONFIDENTIAL");
  assertExists(result);
  assertEquals(result!.name, "ollama");
});

Deno.test("Registry: getForClassification falls back to default when no override", () => {
  const registry = createProviderRegistry();
  const defaultProvider = createMockProvider("anthropic");

  registry.register(defaultProvider);
  registry.setDefault("anthropic");

  const result = registry.getForClassification("PUBLIC");
  assertExists(result);
  assertEquals(result!.name, "anthropic");
});

Deno.test("Registry: getForClassification handles all four levels", () => {
  const registry = createProviderRegistry();
  const defaultProvider = createMockProvider("anthropic");
  const ollamaProvider = createMockProvider("ollama");
  const openaiProvider = createMockProvider("openai");

  registry.register(defaultProvider);
  registry.register(ollamaProvider);
  registry.register(openaiProvider);
  registry.setDefault("anthropic");

  registry.registerClassificationOverride("RESTRICTED", ollamaProvider);
  registry.registerClassificationOverride("CONFIDENTIAL", openaiProvider);

  assertEquals(registry.getForClassification("RESTRICTED")!.name, "ollama");
  assertEquals(registry.getForClassification("CONFIDENTIAL")!.name, "openai");
  assertEquals(registry.getForClassification("INTERNAL")!.name, "anthropic");
  assertEquals(registry.getForClassification("PUBLIC")!.name, "anthropic");
});

Deno.test("Registry: getForClassification returns undefined when no providers registered", () => {
  const registry = createProviderRegistry();
  const result = registry.getForClassification("PUBLIC");
  assertEquals(result, undefined);
});

// ── Config validation: classification_models ──────────────────────────────────

Deno.test("validateConfig: accepts config without classification_models", () => {
  const result = validateConfig({
    models: {
      primary: { provider: "anthropic", model: "claude-sonnet-4-5" },
      providers: {},
    },
  });
  assertEquals(result.ok, true);
});

Deno.test("validateConfig: accepts valid classification_models", () => {
  const result = validateConfig({
    models: {
      primary: { provider: "anthropic", model: "claude-sonnet-4-5" },
      providers: { ollama: { model: "llama3" } },
      classification_models: {
        CONFIDENTIAL: { provider: "ollama", model: "llama3" },
        RESTRICTED: { provider: "ollama", model: "llama3" },
      },
    },
  });
  assertEquals(result.ok, true);
});

Deno.test("validateConfig: rejects invalid classification level", () => {
  const result = validateConfig({
    models: {
      primary: { provider: "anthropic", model: "claude-sonnet-4-5" },
      providers: {},
      classification_models: {
        INVALID_LEVEL: { provider: "ollama", model: "llama3" },
      },
    },
  });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assert(result.error.includes("invalid classification level"));
  }
});

Deno.test("validateConfig: rejects classification_models entry missing provider", () => {
  const result = validateConfig({
    models: {
      primary: { provider: "anthropic", model: "claude-sonnet-4-5" },
      providers: {},
      classification_models: {
        CONFIDENTIAL: { provider: "", model: "llama3" },
      },
    },
  });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assert(result.error.includes("provider"));
  }
});

Deno.test("validateConfig: rejects classification_models entry missing model", () => {
  const result = validateConfig({
    models: {
      primary: { provider: "anthropic", model: "claude-sonnet-4-5" },
      providers: {},
      classification_models: {
        CONFIDENTIAL: { provider: "ollama", model: "" },
      },
    },
  });
  assertEquals(result.ok, false);
  if (!result.ok) {
    assert(result.error.includes("model"));
  }
});

Deno.test("validateConfig: rejects non-object classification_models entry", () => {
  const result = validateConfig({
    models: {
      primary: { provider: "anthropic", model: "claude-sonnet-4-5" },
      providers: {},
      classification_models: {
        CONFIDENTIAL: "not-an-object",
      },
    },
  });
  assertEquals(result.ok, false);
});

// ── loadProvidersFromConfig: classification overrides ──────────────────────────

Deno.test("loadProvidersFromConfig: registers classification overrides", () => {
  const registry = createProviderRegistry();
  loadProvidersFromConfig({
    primary: { provider: "anthropic", model: "claude-sonnet-4-5" },
    providers: {
      anthropic: { model: "claude-sonnet-4-5" },
      ollama: { model: "llama3", endpoint: "http://localhost:11434" },
    },
    classification_models: {
      CONFIDENTIAL: { provider: "ollama", model: "llama3" },
      RESTRICTED: { provider: "ollama", model: "llama3" },
    },
  }, registry);

  // Default is anthropic
  assertEquals(registry.getDefault()!.name, "anthropic");

  // Classification overrides resolve to ollama
  const confProvider = registry.getForClassification("CONFIDENTIAL");
  assertExists(confProvider);
  assertEquals(confProvider!.name, "ollama");

  const restProvider = registry.getForClassification("RESTRICTED");
  assertExists(restProvider);
  assertEquals(restProvider!.name, "ollama");

  // PUBLIC falls back to default
  assertEquals(registry.getForClassification("PUBLIC")!.name, "anthropic");
});

Deno.test("loadProvidersFromConfig: warns on missing provider for classification override", () => {
  const registry = createProviderRegistry();
  // No "ollama" in providers block, so override should be skipped
  loadProvidersFromConfig({
    primary: { provider: "anthropic", model: "claude-sonnet-4-5" },
    providers: {
      anthropic: { model: "claude-sonnet-4-5" },
    },
    classification_models: {
      CONFIDENTIAL: { provider: "ollama", model: "llama3" },
    },
  }, registry);

  // CONFIDENTIAL should fall back to default since ollama isn't configured
  assertEquals(registry.getForClassification("CONFIDENTIAL")!.name, "anthropic");
});

Deno.test("loadProvidersFromConfig: works without classification_models", () => {
  const registry = createProviderRegistry();
  loadProvidersFromConfig({
    primary: { provider: "anthropic", model: "claude-sonnet-4-5" },
    providers: {
      anthropic: { model: "claude-sonnet-4-5" },
    },
  }, registry);

  assertEquals(registry.getDefault()!.name, "anthropic");
  assertEquals(registry.getForClassification("CONFIDENTIAL")!.name, "anthropic");
});
