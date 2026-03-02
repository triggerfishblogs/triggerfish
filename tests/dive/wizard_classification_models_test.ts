/**
 * Tests for per-classification model wizard generation.
 *
 * Tests the config generation functions with classification model overrides.
 */
import { assert, assertEquals } from "@std/assert";
import { parse as parseYaml } from "@std/yaml";

import { generateConfig } from "../../src/dive/wizard/wizard_generators.ts";
import type { WizardAnswers } from "../../src/dive/wizard/wizard_types.ts";

// ─── Test fixtures ───────────────────────────────────────────────────────────

function makeAnswers(
  overrides: Partial<WizardAnswers> = {},
): WizardAnswers {
  return {
    provider: "anthropic",
    providerModel: "claude-sonnet-4-5",
    apiKey: "",
    agentName: "TestBot",
    mission: "A test agent for unit tests.",
    tone: "professional",
    customTone: "",
    channels: ["cli"],
    telegramBotToken: "",
    telegramOwnerId: "",
    discordBotToken: "",
    discordOwnerId: "",
    webchatPort: 8765,
    signalPhoneNumber: "",
    signalEndpoint: "tcp://127.0.0.1:7583",
    selectedPlugins: [],
    obsidianVaultPath: "",
    obsidianClassification: "INTERNAL",
    searchProvider: "skip",
    searchApiKey: "",
    searxngUrl: "",
    localEndpoint: "http://localhost:11434",
    installDaemon: false,
    ...overrides,
  };
}

// ─── generateConfig: classification_models ────────────────────────────────────

Deno.test("Wizard: generateConfig omits classification_models when not set", () => {
  const answers = makeAnswers();
  const yaml = generateConfig(answers);
  const parsed = parseYaml(yaml) as Record<string, unknown>;
  const models = parsed.models as Record<string, unknown>;
  assertEquals(models.classification_models, undefined);
});

Deno.test("Wizard: generateConfig includes classification_models when set", () => {
  const answers = makeAnswers({
    classificationModels: {
      CONFIDENTIAL: { provider: "ollama", model: "llama3" },
      RESTRICTED: { provider: "ollama", model: "llama3" },
    },
  });
  const yaml = generateConfig(answers);
  const parsed = parseYaml(yaml) as Record<string, unknown>;
  const models = parsed.models as Record<string, unknown>;

  assert(models.classification_models !== undefined);
  const classModels = models.classification_models as Record<
    string,
    Record<string, string>
  >;
  assertEquals(classModels.CONFIDENTIAL.provider, "ollama");
  assertEquals(classModels.CONFIDENTIAL.model, "llama3");
  assertEquals(classModels.RESTRICTED.provider, "ollama");
  assertEquals(classModels.RESTRICTED.model, "llama3");
});

Deno.test("Wizard: generateConfig adds classification model provider to providers block", () => {
  const answers = makeAnswers({
    provider: "anthropic",
    classificationModels: {
      CONFIDENTIAL: { provider: "ollama", model: "llama3" },
    },
  });
  const yaml = generateConfig(answers);
  const parsed = parseYaml(yaml) as Record<string, unknown>;
  const models = parsed.models as Record<string, unknown>;
  const providers = models.providers as Record<string, Record<string, string>>;

  // Primary provider should be present
  assert(providers.anthropic !== undefined);
  // Classification override provider should also be present
  assert(providers.ollama !== undefined);
  assertEquals(providers.ollama.model, "llama3");
});

Deno.test("Wizard: generateConfig does not duplicate provider in providers block", () => {
  const answers = makeAnswers({
    provider: "anthropic",
    classificationModels: {
      CONFIDENTIAL: { provider: "anthropic", model: "claude-sonnet-4-5" },
    },
  });
  const yaml = generateConfig(answers);
  const parsed = parseYaml(yaml) as Record<string, unknown>;
  const models = parsed.models as Record<string, unknown>;
  const providers = models.providers as Record<string, Record<string, string>>;

  // Only one anthropic entry
  assertEquals(
    Object.keys(providers).filter((k) => k === "anthropic").length,
    1,
  );
});

Deno.test("Wizard: generateConfig classification_models single level", () => {
  const answers = makeAnswers({
    classificationModels: {
      RESTRICTED: { provider: "openai", model: "gpt-4o" },
    },
  });
  const yaml = generateConfig(answers);
  const parsed = parseYaml(yaml) as Record<string, unknown>;
  const models = parsed.models as Record<string, unknown>;
  const classModels = models.classification_models as Record<
    string,
    Record<string, string>
  >;

  assertEquals(classModels.RESTRICTED.provider, "openai");
  assertEquals(classModels.RESTRICTED.model, "gpt-4o");
  // CONFIDENTIAL should not be present
  assertEquals(classModels.CONFIDENTIAL, undefined);
});

Deno.test("Wizard: generateConfig with lmstudio classification override adds endpoint", () => {
  const answers = makeAnswers({
    classificationModels: {
      CONFIDENTIAL: { provider: "lmstudio", model: "llama-3.1" },
    },
  });
  const yaml = generateConfig(answers);
  const parsed = parseYaml(yaml) as Record<string, unknown>;
  const models = parsed.models as Record<string, unknown>;
  const providers = models.providers as Record<string, Record<string, string>>;

  assert(providers.lmstudio !== undefined);
  assertEquals(providers.lmstudio.endpoint, "http://localhost:1234");
});
