/**
 * CLI config loading — integration tests for loadConfigWithSecrets().
 *
 * Tests that the secret-resolving config loader correctly substitutes
 * `secret:<key>` references and fails fast on missing secrets.
 * Uses the in-memory store so no OS keychain is required.
 */

import { assertEquals, assertStringIncludes } from "@std/assert";

import { createMemorySecretStore } from "../../src/core/secrets/keychain/keychain.ts";

// ─── loadConfigWithSecrets ────────────────────────────────────────────────────

Deno.test({
  name:
    "loadConfigWithSecrets: config with no secret refs loads same as loadConfig",
  // SQLite FFI library loaded on import — cannot be closed in test context
  sanitizeResources: false,
  fn: async () => {
    const { loadConfigWithSecrets } = await import("../../src/cli/main.ts");
    const store = createMemorySecretStore();

    // Write a minimal valid config to a temp file
    const configPath = await Deno.makeTempFile({ suffix: ".yaml" });
    try {
      await Deno.writeTextFile(
        configPath,
        `models:\n  primary:\n    provider: anthropic\n    model: claude-sonnet-4-5\n`,
      );

      const result = await loadConfigWithSecrets(configPath, store);
      assertEquals(result.ok, true);
      if (result.ok) {
        const models = result.value.models as Record<string, unknown>;
        assertEquals(typeof models, "object");
      }
    } finally {
      await Deno.remove(configPath);
    }
  },
});

Deno.test({
  name: "loadConfigWithSecrets: resolves secret: refs from in-memory store",
  sanitizeResources: false,
  fn: async () => {
    const { loadConfigWithSecrets } = await import("../../src/cli/main.ts");
    const store = createMemorySecretStore();
    await store.setSecret("provider:anthropic:apiKey", "sk-test-resolved");

    const configPath = await Deno.makeTempFile({ suffix: ".yaml" });
    try {
      await Deno.writeTextFile(
        configPath,
        [
          "models:",
          "  primary:",
          "    provider: anthropic",
          "    model: claude-sonnet-4-5",
          "  providers:",
          "    anthropic:",
          "      model: claude-sonnet-4-5",
          '      apiKey: "secret:provider:anthropic:apiKey"',
        ].join("\n"),
      );

      const result = await loadConfigWithSecrets(configPath, store);
      assertEquals(result.ok, true);
      if (result.ok) {
        const models = result.value.models as Record<string, unknown>;
        const providers = models.providers as Record<string, unknown>;
        const anthropic = providers.anthropic as Record<string, unknown>;
        assertEquals(anthropic.apiKey, "sk-test-resolved");
      }
    } finally {
      await Deno.remove(configPath);
    }
  },
});

Deno.test({
  name:
    "loadConfigWithSecrets: returns error when secret: ref cannot be resolved",
  sanitizeResources: false,
  fn: async () => {
    const { loadConfigWithSecrets } = await import("../../src/cli/main.ts");
    const store = createMemorySecretStore();
    // Do NOT store the secret — it should fail to resolve

    const configPath = await Deno.makeTempFile({ suffix: ".yaml" });
    try {
      await Deno.writeTextFile(
        configPath,
        [
          "models:",
          "  primary:",
          "    provider: anthropic",
          "    model: claude-sonnet-4-5",
          "  providers:",
          "    anthropic:",
          "      model: claude-sonnet-4-5",
          '      apiKey: "secret:provider:anthropic:apiKey"',
        ].join("\n"),
      );

      const result = await loadConfigWithSecrets(configPath, store);
      assertEquals(result.ok, false);
      if (!result.ok) {
        assertStringIncludes(result.error, "provider:anthropic:apiKey");
      }
    } finally {
      await Deno.remove(configPath);
    }
  },
});

Deno.test({
  name: "loadConfigWithSecrets: returns error for invalid YAML file",
  sanitizeResources: false,
  fn: async () => {
    const { loadConfigWithSecrets } = await import("../../src/cli/main.ts");
    const store = createMemorySecretStore();

    const result = await loadConfigWithSecrets(
      "/nonexistent/path/config.yaml",
      store,
    );
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertStringIncludes(result.error, "Failed to load config");
    }
  },
});

Deno.test({
  name:
    "loadConfigWithSecrets: resolves multiple secret: refs across nested paths",
  sanitizeResources: false,
  fn: async () => {
    const { loadConfigWithSecrets } = await import("../../src/cli/main.ts");
    const store = createMemorySecretStore();
    await store.setSecret("provider:anthropic:apiKey", "sk-ant-abc");
    await store.setSecret("telegram:botToken", "bot-token-xyz");
    await store.setSecret("web:search:apiKey", "brave-key-123");

    const configPath = await Deno.makeTempFile({ suffix: ".yaml" });
    try {
      await Deno.writeTextFile(
        configPath,
        [
          "models:",
          "  primary:",
          "    provider: anthropic",
          "    model: claude-sonnet-4-5",
          "  providers:",
          "    anthropic:",
          "      model: claude-sonnet-4-5",
          '      apiKey: "secret:provider:anthropic:apiKey"',
          "channels:",
          "  telegram:",
          '    botToken: "secret:telegram:botToken"',
          "    classification: INTERNAL",
          "web:",
          "  search:",
          "    provider: brave",
          '    api_key: "secret:web:search:apiKey"',
        ].join("\n"),
      );

      const result = await loadConfigWithSecrets(configPath, store);
      assertEquals(result.ok, true);
      if (result.ok) {
        const val = result.value as Record<string, unknown>;
        const models = val.models as Record<string, unknown>;
        const providers = models.providers as Record<string, unknown>;
        const anthropic = providers.anthropic as Record<string, unknown>;
        assertEquals(anthropic.apiKey, "sk-ant-abc");

        const channels = val.channels as Record<string, unknown>;
        const telegram = channels.telegram as Record<string, unknown>;
        assertEquals(telegram.botToken, "bot-token-xyz");

        const web = val.web as Record<string, unknown>;
        const search = web.search as Record<string, unknown>;
        assertEquals(search.api_key, "brave-key-123");
      }
    } finally {
      await Deno.remove(configPath);
    }
  },
});

// ─── parseCommand: migrate-secrets subcommand ─────────────────────────────────

Deno.test({
  name: "CLI: parses 'config migrate-secrets' subcommand",
  sanitizeResources: false,
  fn: async () => {
    const { parseCommand } = await import("../../src/cli/main.ts");
    const cmd = parseCommand(["config", "migrate-secrets"]);
    assertEquals(cmd.command, "config");
    assertEquals(cmd.subcommand, "migrate-secrets");
  },
});
