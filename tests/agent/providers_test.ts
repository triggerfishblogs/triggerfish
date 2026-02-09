/**
 * Phase 10: LLM Provider Tests
 *
 * Unit tests for all provider factory functions and config loader.
 * Integration tests (real API calls) run only when credentials are set.
 */
import { assertEquals, assertExists, assert, assertRejects } from "jsr:@std/assert";
import {
  createProviderRegistry,
  type LlmProvider,
} from "../../src/agent/llm.ts";
import { createAnthropicProvider } from "../../src/agent/providers/anthropic.ts";
import { createOpenAiProvider } from "../../src/agent/providers/openai.ts";
import { createGoogleProvider } from "../../src/agent/providers/google.ts";
import { createLocalProvider } from "../../src/agent/providers/local.ts";
import { createOpenRouterProvider } from "../../src/agent/providers/openrouter.ts";
import { loadProvidersFromConfig } from "../../src/agent/providers/config.ts";

// --- Factory function tests (no API calls) ---

Deno.test("AnthropicProvider: factory creates provider with correct name", () => {
  const provider = createAnthropicProvider({ apiKey: "test-key" });
  assertEquals(provider.name, "anthropic");
  assertEquals(provider.supportsStreaming, true);
});

Deno.test("OpenAiProvider: factory creates provider with correct name", () => {
  const provider = createOpenAiProvider({ apiKey: "test-key" });
  assertEquals(provider.name, "openai");
  assertEquals(provider.supportsStreaming, true);
});

Deno.test("GoogleProvider: factory creates provider with correct name", () => {
  const provider = createGoogleProvider({ apiKey: "test-key" });
  assertEquals(provider.name, "google");
  assertEquals(provider.supportsStreaming, true);
});

Deno.test("LocalProvider: factory creates provider with correct name", () => {
  const provider = createLocalProvider({ model: "llama3" });
  assertEquals(provider.name, "local");
  assertEquals(provider.supportsStreaming, false);
});

Deno.test("OpenRouterProvider: factory creates provider with correct name", () => {
  const provider = createOpenRouterProvider({
    apiKey: "test-key",
    model: "anthropic/claude-3.5-sonnet",
  });
  assertEquals(provider.name, "openrouter");
  assertEquals(provider.supportsStreaming, true);
});

// --- Config loader tests ---

Deno.test("loadProvidersFromConfig: registers anthropic provider", () => {
  const registry = createProviderRegistry();
  loadProvidersFromConfig({
    primary: "claude-sonnet-4-5",
    providers: {
      anthropic: { model: "claude-sonnet-4-5" },
    },
  }, registry);

  const provider = registry.get("anthropic");
  assertExists(provider);
  assertEquals(provider!.name, "anthropic");
});

Deno.test("loadProvidersFromConfig: sets default from primary model name", () => {
  const registry = createProviderRegistry();
  loadProvidersFromConfig({
    primary: "claude-sonnet-4-5",
    providers: {
      anthropic: { model: "claude-sonnet-4-5" },
    },
  }, registry);

  const defaultProvider = registry.getDefault();
  assertExists(defaultProvider);
  assertEquals(defaultProvider!.name, "anthropic");
});

Deno.test("loadProvidersFromConfig: resolves openai from gpt model name", () => {
  const registry = createProviderRegistry();
  loadProvidersFromConfig({
    primary: "gpt-4o",
    providers: {
      openai: { model: "gpt-4o" },
    },
  }, registry);

  const defaultProvider = registry.getDefault();
  assertExists(defaultProvider);
  assertEquals(defaultProvider!.name, "openai");
});

Deno.test("loadProvidersFromConfig: resolves google from gemini model name", () => {
  const registry = createProviderRegistry();
  loadProvidersFromConfig({
    primary: "gemini-2.0-flash",
    providers: {
      google: { model: "gemini-2.0-flash" },
    },
  }, registry);

  const defaultProvider = registry.getDefault();
  assertExists(defaultProvider);
  assertEquals(defaultProvider!.name, "google");
});

Deno.test("loadProvidersFromConfig: registers multiple providers", () => {
  const registry = createProviderRegistry();
  loadProvidersFromConfig({
    primary: "claude-sonnet-4-5",
    providers: {
      anthropic: { model: "claude-sonnet-4-5" },
      openai: { model: "gpt-4o" },
      local: { model: "llama3", endpoint: "http://localhost:11434" },
    },
  }, registry);

  assertExists(registry.get("anthropic"));
  assertExists(registry.get("openai"));
  assertExists(registry.get("local"));
  assertEquals(registry.getDefault()!.name, "anthropic");
});

Deno.test("loadProvidersFromConfig: resolves openrouter from model with slash", () => {
  const registry = createProviderRegistry();
  loadProvidersFromConfig({
    primary: "anthropic/claude-3.5-sonnet",
    providers: {
      openrouter: { model: "anthropic/claude-3.5-sonnet" },
    },
  }, registry);

  const defaultProvider = registry.getDefault();
  assertExists(defaultProvider);
  assertEquals(defaultProvider!.name, "openrouter");
});

// --- LocalProvider: HTTP error handling ---

Deno.test("LocalProvider: throws on non-200 response", async () => {
  // Use a port that's unlikely to be listening
  const provider = createLocalProvider({
    endpoint: "http://127.0.0.1:1",
    model: "test",
  });

  await assertRejects(
    () => provider.complete([{ role: "user", content: "hi" }], [], {}),
    Error,
  );
});

// --- Integration tests (skip if no credentials) ---
// OAuth (CLAUDE_CODE_OAUTH_TOKEN) is the primary auth method for Pro/Max users.

Deno.test({
  name: "AnthropicProvider: real API call with OAuth (integration)",
  ignore: !Deno.env.get("CLAUDE_CODE_OAUTH_TOKEN"),
  async fn() {
    const provider = createAnthropicProvider({});
    const result = await provider.complete(
      [{ role: "user", content: "Say just the word 'hello'" }],
      [],
      {},
    );

    assert(result.content.length > 0, "Should get non-empty response");
    assert(result.usage.inputTokens > 0, "Should report input tokens");
    assert(result.usage.outputTokens > 0, "Should report output tokens");
  },
});

Deno.test({
  name: "AnthropicProvider: real API call with API key (integration)",
  ignore: !Deno.env.get("ANTHROPIC_API_KEY"),
  async fn() {
    const provider = createAnthropicProvider({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY"),
    });
    const result = await provider.complete(
      [{ role: "user", content: "Say just the word 'hello'" }],
      [],
      {},
    );

    assert(result.content.length > 0, "Should get non-empty response");
    assert(result.usage.inputTokens > 0, "Should report input tokens");
    assert(result.usage.outputTokens > 0, "Should report output tokens");
  },
});

Deno.test({
  name: "OpenAiProvider: real API call (integration)",
  ignore: !Deno.env.get("OPENAI_API_KEY"),
  async fn() {
    const provider = createOpenAiProvider({});
    const result = await provider.complete(
      [{ role: "user", content: "Say just the word 'hello'" }],
      [],
      {},
    );

    assert(result.content.length > 0, "Should get non-empty response");
    assert(result.usage.inputTokens > 0, "Should report input tokens");
    assert(result.usage.outputTokens > 0, "Should report output tokens");
  },
});

Deno.test({
  name: "GoogleProvider: real API call (integration)",
  ignore: !Deno.env.get("GOOGLE_API_KEY"),
  async fn() {
    const provider = createGoogleProvider({});
    const result = await provider.complete(
      [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Say just the word 'hello'" },
      ],
      [],
      {},
    );

    assert(result.content.length > 0, "Should get non-empty response");
  },
});

Deno.test({
  name: "Providers: all conform to LlmProvider interface",
  fn() {
    // Verify all providers satisfy the interface at compile time
    const providers: readonly LlmProvider[] = [
      createAnthropicProvider({ apiKey: "test" }),
      createOpenAiProvider({ apiKey: "test" }),
      createGoogleProvider({ apiKey: "test" }),
      createLocalProvider({ model: "test" }),
      createOpenRouterProvider({ apiKey: "test", model: "test" }),
    ];

    assertEquals(providers.length, 5);
    for (const p of providers) {
      assertExists(p.name);
      assertExists(p.complete);
      assertEquals(typeof p.supportsStreaming, "boolean");
    }
  },
});
