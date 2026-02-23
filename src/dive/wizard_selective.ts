/**
 * Selective reconfiguration wizard.
 *
 * Lets the user choose which sections to update while preserving
 * the rest of their existing config.
 *
 * @module
 */

import { Checkbox, Confirm, Input, Select } from "@cliffy/prompt";
import { join } from "@std/path";
import { parse as parseYaml, stringify as stringifyYaml } from "@std/yaml";

import { expandTilde } from "../cli/config/paths.ts";
import { promptChannelConfig } from "../cli/config/config.ts";
import { verifyProvider } from "./verify.ts";
import { generateSpine } from "./wizard_generators.ts";
import { runWizard } from "./wizard.ts";

import type {
  ChannelChoice,
  DiveResult,
  ProviderChoice,
  SearchProviderChoice,
  ToneChoice,
  WizardAnswers,
  WizardSection,
} from "./wizard_types.ts";

import { DEFAULT_MODELS, PROVIDER_LABELS } from "./wizard_types.ts";

/** Safely read a nested value from a config object by dot path. */
function readNestedConfigValue(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  let current: unknown = obj;
  for (const key of path.split(".")) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

// ── LLM Provider helpers ──────────────────────────────────────────────────

/** Prompt the user to select an LLM provider from available options. */
async function promptLlmProviderChoice(
  currentProvider: string,
): Promise<ProviderChoice> {
  return (await Select.prompt({
    message: "LLM provider",
    default: currentProvider || undefined,
    options: [
      { name: PROVIDER_LABELS.anthropic, value: "anthropic" },
      { name: PROVIDER_LABELS.google, value: "google" },
      { name: PROVIDER_LABELS.lmstudio, value: "lmstudio" },
      { name: PROVIDER_LABELS.ollama, value: "ollama" },
      { name: PROVIDER_LABELS.openai, value: "openai" },
      { name: PROVIDER_LABELS.openrouter, value: "openrouter" },
      { name: PROVIDER_LABELS.zai, value: "zai" },
      { name: PROVIDER_LABELS.zenmux, value: "zenmux" },
    ],
  })) as ProviderChoice;
}

/** Resolve the environment variable name for a cloud LLM provider's API key. */
function resolveApiKeyEnvVar(provider: ProviderChoice): string {
  const mapping: Partial<Record<ProviderChoice, string>> = {
    openai: "OPENAI_API_KEY",
    google: "GOOGLE_API_KEY",
    zenmux: "ZENMUX_API_KEY",
    zai: "ZAI_API_KEY",
  };
  return mapping[provider] ?? "OPENROUTER_API_KEY";
}

/** Prompt for API key and local endpoint based on the chosen provider. */
async function promptLlmApiKey(
  provider: ProviderChoice,
  currentEndpoint: string,
): Promise<{ apiKey: string; localEndpoint: string }> {
  let apiKey = "";
  let localEndpoint = currentEndpoint || "http://localhost:11434";

  if (provider === "anthropic") {
    apiKey = await Input.prompt({
      message: "Anthropic API key (or press Enter to keep existing)",
    });
  } else if (provider === "ollama" || provider === "lmstudio") {
    console.log("  \u2713 Local provider \u2014 no API key needed");
    localEndpoint = await Input.prompt({
      message: `${provider === "ollama" ? "Ollama" : "LM Studio"} endpoint`,
      default: localEndpoint ||
        (provider === "lmstudio"
          ? "http://localhost:1234"
          : "http://localhost:11434"),
    });
  } else {
    const envVarName = resolveApiKeyEnvVar(provider);
    const existingKey = Deno.env.get(envVarName) ?? "";
    if (existingKey.length > 0) {
      console.log(`  \u2713 Detected ${envVarName} in environment`);
      apiKey = existingKey;
    } else {
      apiKey = await Input.prompt({
        message: `API key (or press Enter to set ${envVarName} later)`,
      });
    }
  }

  return { apiKey, localEndpoint };
}

/** Mutable state passed through the LLM verification retry loop. */
interface LlmVerifyState {
  apiKey: string;
  providerModel: string;
  localEndpoint: string;
}

/** Build the retry-action prompt options based on provider type. */
function buildLlmRetryOptions(
  provider: ProviderChoice,
): Array<{ name: string; value: string }> {
  const options: Array<{ name: string; value: string }> = [];
  if (provider === "ollama" || provider === "lmstudio") {
    options.push({ name: "Re-enter endpoint", value: "endpoint" });
  } else {
    options.push({ name: "Re-enter API key", value: "apikey" });
  }
  options.push({ name: "Re-enter model name", value: "model" });
  options.push({ name: "Keep this setting anyway", value: "keep" });
  return options;
}

/** Apply user's chosen retry action by re-prompting the relevant field. */
async function applyLlmRetryAction(
  action: string,
  provider: ProviderChoice,
  state: LlmVerifyState,
): Promise<void> {
  if (action === "endpoint") {
    state.localEndpoint = await Input.prompt({
      message: "Endpoint URL",
      default: state.localEndpoint,
    });
  } else if (action === "model") {
    state.providerModel = await Input.prompt({
      message: "Model name",
      default: state.providerModel,
    });
  } else {
    state.apiKey = await Input.prompt({
      message: provider === "anthropic" ? "Anthropic API key" : "API key",
    });
  }
}

/** Verify LLM connection in a retry loop, updating state on each attempt. */
async function verifyLlmConnection(
  provider: ProviderChoice,
  state: LlmVerifyState,
): Promise<void> {
  const isLocal = provider === "ollama" || provider === "lmstudio";
  const shouldVerify = isLocal || state.apiKey.length > 0;
  if (!shouldVerify) return;

  let verified = false;
  while (!verified) {
    console.log("");
    console.log("  Verifying connection...");
    const endpoint = isLocal ? state.localEndpoint : undefined;
    const result = await verifyProvider(
      provider,
      state.apiKey,
      state.providerModel,
      endpoint,
    );
    if (result.ok) {
      console.log("  \u2713 Connection verified");
      verified = true;
    } else {
      console.log(`  \u2717 ${result.error}`);
      console.log("");
      const action = await Select.prompt({
        message: "What would you like to do?",
        options: buildLlmRetryOptions(provider),
      });
      if (action === "keep") {
        verified = true;
      } else {
        await applyLlmRetryAction(action, provider, state);
      }
    }
  }
}

/** Build the final models config section from collected LLM settings. */
function buildLlmModelsConfig(
  provider: ProviderChoice,
  state: LlmVerifyState,
): Record<string, unknown> {
  const providers: Record<string, Record<string, string>> = {};
  if (provider === "ollama" || provider === "lmstudio") {
    providers[provider] = {
      model: state.providerModel,
      endpoint: state.localEndpoint,
    };
  } else {
    const pc: Record<string, string> = { model: state.providerModel };
    if (state.apiKey.length > 0) pc["apiKey"] = state.apiKey;
    providers[provider] = pc;
  }

  return {
    primary: { provider, model: state.providerModel },
    providers,
  };
}

/** Reconfigure the LLM provider section interactively. */
async function reconfigureLlmProvider(
  existingConfig: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  console.log("");
  console.log("  LLM Provider");
  console.log("");

  const currentProvider = (readNestedConfigValue(
    existingConfig,
    "models.primary.provider",
  ) as string | undefined) ?? "";
  const currentModel = (readNestedConfigValue(
    existingConfig,
    "models.primary.model",
  ) as string | undefined) ?? "";

  const provider = await promptLlmProviderChoice(currentProvider);

  const providerModel = await Input.prompt({
    message: "Model name",
    default: currentModel || DEFAULT_MODELS[provider],
  });

  const currentEndpoint = (readNestedConfigValue(
    existingConfig,
    `models.providers.${provider}.endpoint`,
  ) as string | undefined) ?? "";

  const credentials = await promptLlmApiKey(provider, currentEndpoint);
  const state: LlmVerifyState = {
    apiKey: credentials.apiKey,
    providerModel,
    localEndpoint: credentials.localEndpoint,
  };

  await verifyLlmConnection(provider, state);
  return buildLlmModelsConfig(provider, state);
}

// ── Agent Identity helpers ────────────────────────────────────────────────

/** Parse agent name and mission from an existing SPINE.md. */
function parseSpineDefaults(
  existingSpine: string,
): { agentName: string; mission: string } {
  const nameMatch = existingSpine.match(/^# (.+)$/m);
  const agentName = nameMatch?.[1] ?? "Triggerfish";

  const lines = existingSpine.split("\n");
  const headingIdx = lines.findIndex((l) => l.startsWith("# "));
  let mission = "A helpful AI assistant that keeps my data safe.";
  if (headingIdx >= 0) {
    for (let i = headingIdx + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length > 0 && !line.startsWith("#")) {
        mission = line;
        break;
      }
    }
  }

  return { agentName, mission };
}

/** Reconfigure agent name, mission, and tone, writing an updated SPINE.md. */
async function reconfigureAgentIdentity(
  existingSpine: string,
  spinePath: string,
): Promise<void> {
  console.log("");
  console.log("  Agent Name & Personality");
  console.log("");

  const defaults = parseSpineDefaults(existingSpine);

  const agentName = await Input.prompt({
    message: "Agent name",
    default: defaults.agentName,
  });
  const mission = await Input.prompt({
    message: "Mission (one sentence)",
    default: defaults.mission,
  });
  const tone = (await Select.prompt({
    message: "Communication tone",
    options: [
      { name: "Professional", value: "professional" },
      { name: "Casual", value: "casual" },
      { name: "Terse", value: "terse" },
      { name: "Custom", value: "custom" },
    ],
  })) as ToneChoice;

  let customTone = "";
  if (tone === "custom") {
    customTone = await Input.prompt({
      message: "Describe the tone you want",
    });
  }

  const spineContent = generateSpine({
    agentName,
    mission,
    tone,
    customTone,
  } as WizardAnswers);
  await Deno.writeTextFile(spinePath, spineContent);
  console.log(`  \u2713 Updated: ${spinePath}`);
}

// ── Channels helpers ──────────────────────────────────────────────────────

/** Prompt user to select which channels to enable. */
async function promptChannelChoices(
  existingChannels: Record<string, unknown>,
): Promise<ChannelChoice[]> {
  return (await Checkbox.prompt({
    message: "Enable additional channels",
    options: [
      {
        name: "WebChat (browser-based, zero config)",
        value: "webchat",
        checked: "webchat" in existingChannels,
      },
      {
        name: "Telegram (requires bot token)",
        value: "telegram",
        checked: "telegram" in existingChannels,
      },
      {
        name: "Discord (requires bot token)",
        value: "discord",
        checked: "discord" in existingChannels,
      },
      {
        name: "Signal (requires signal-cli)",
        value: "signal",
        checked: "signal" in existingChannels,
      },
    ],
  })) as ChannelChoice[];
}

/** Remove wizard-managed channels that the user deselected. */
function removeDeselectedChannels(
  channels: Record<string, unknown>,
  choices: ChannelChoice[],
): void {
  const managed: ChannelChoice[] = ["webchat", "telegram", "discord", "signal"];
  for (const ch of managed) {
    if (!choices.includes(ch)) delete channels[ch];
  }
}

/** Configure the WebChat channel and return its config fragment. */
async function configureWebchatChannel(
  existingConfig: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const currentPort = String(
    (readNestedConfigValue(
      existingConfig,
      "channels.webchat.port",
    ) as number | undefined) ?? 8765,
  );
  const portStr = await Input.prompt({
    message: "WebChat port",
    default: currentPort,
  });
  return { port: parseInt(portStr, 10) || 8765, classification: "PUBLIC" };
}

/** Configure the Telegram channel and return its config fragment or undefined. */
async function configureTelegramChannel(
  existingConfig: Record<string, unknown>,
): Promise<Record<string, unknown> | undefined> {
  const currentOwnerId = String(
    (readNestedConfigValue(
      existingConfig,
      "channels.telegram.ownerId",
    ) as number | undefined) ?? "",
  );
  const botToken = await Input.prompt({
    message: "Telegram bot token (from @BotFather)",
  });
  const ownerId = await Input.prompt({
    message: "Your Telegram user ID (numeric)",
    default: currentOwnerId || undefined,
  });
  if (botToken.length === 0) return undefined;

  const tc: Record<string, unknown> = {
    botToken,
    classification: "INTERNAL",
  };
  if (ownerId.length > 0) {
    tc["ownerId"] = parseInt(ownerId, 10) || 0;
  }
  console.log("  \u2713 Telegram bot token saved to config");
  return tc;
}

/** Configure the Signal channel and return its config fragment or undefined. */
async function configureSignalChannel(
  existingConfig: Record<string, unknown>,
): Promise<Record<string, unknown> | undefined> {
  const currentPhone = (readNestedConfigValue(
    existingConfig,
    "channels.signal.account",
  ) as string | undefined) ?? "";
  const currentEndpoint = (readNestedConfigValue(
    existingConfig,
    "channels.signal.endpoint",
  ) as string | undefined) ?? "tcp://127.0.0.1:7583";

  const phoneNumber = await Input.prompt({
    message: "Your Signal phone number (E.164 format, e.g. +15551234567)",
    default: currentPhone || undefined,
  });
  const endpoint = await Input.prompt({
    message: "signal-cli daemon endpoint",
    default: currentEndpoint,
  });
  if (phoneNumber.length === 0) return undefined;

  console.log("  \u2713 Signal account saved to config");
  return {
    endpoint,
    account: phoneNumber,
    classification: "INTERNAL",
    ownerPhone: phoneNumber,
  };
}

/** Reconfigure all wizard-managed channels interactively. */
async function reconfigureChannels(
  existingConfig: Record<string, unknown>,
  activeChannels: string[],
): Promise<Record<string, unknown>> {
  console.log("");
  console.log("  Channels");
  console.log("");

  const existingChannels = (readNestedConfigValue(
    existingConfig,
    "channels",
  ) ?? {}) as Record<string, unknown>;
  const choices = await promptChannelChoices(existingChannels);
  const channels: Record<string, unknown> = { ...existingChannels };

  removeDeselectedChannels(channels, choices);

  if (choices.includes("webchat")) {
    activeChannels.push("webchat");
    channels["webchat"] = await configureWebchatChannel(existingConfig);
  }
  if (choices.includes("telegram")) {
    activeChannels.push("telegram");
    const tc = await configureTelegramChannel(existingConfig);
    if (tc) channels["telegram"] = tc;
  }
  if (choices.includes("discord")) {
    activeChannels.push("discord");
    const dc = await promptChannelConfig("discord");
    if ((dc.botToken as string)?.length > 0) {
      channels["discord"] = dc;
      console.log("  \u2713 Discord bot token saved to config");
    }
  }
  if (choices.includes("signal")) {
    activeChannels.push("signal");
    const sc = await configureSignalChannel(existingConfig);
    if (sc) channels["signal"] = sc;
  }

  return channels;
}

// ── Plugins helpers ───────────────────────────────────────────────────────

/** Prompt and validate a path to an Obsidian vault directory. */
async function promptObsidianVaultPath(
  currentVaultPath: string,
): Promise<string> {
  let vaultPath = "";
  while (true) {
    vaultPath = await Input.prompt({
      message: "Path to your Obsidian vault",
      default: currentVaultPath || undefined,
    });
    if (vaultPath.length === 0) {
      console.log("  Vault path is required for Obsidian plugin.");
      continue;
    }
    vaultPath = expandTilde(vaultPath);
    try {
      await Deno.stat(join(vaultPath, ".obsidian"));
      return vaultPath;
    } catch {
      console.log(
        `  Not a valid Obsidian vault (no .obsidian/ folder at ${vaultPath})`,
      );
    }
  }
}

/** Reconfigure the plugins section interactively. */
async function reconfigurePlugins(
  existingConfig: Record<string, unknown>,
): Promise<Record<string, unknown> | undefined> {
  console.log("");
  console.log("  Plugins");
  console.log("");

  const hasObsidian =
    readNestedConfigValue(existingConfig, "plugins.obsidian.enabled") === true;

  const selectedPlugins = await Checkbox.prompt({
    message: "Which plugins would you like to configure?",
    options: [
      {
        name: "Obsidian (local vault integration)",
        value: "obsidian",
        checked: hasObsidian,
      },
    ],
  });

  if (!selectedPlugins.includes("obsidian")) {
    console.log("  No plugins selected.");
    return undefined;
  }

  const currentVaultPath = (readNestedConfigValue(
    existingConfig,
    "plugins.obsidian.vault_path",
  ) as string | undefined) ?? "";
  const vaultPath = await promptObsidianVaultPath(currentVaultPath);

  const currentClassification = (readNestedConfigValue(
    existingConfig,
    "plugins.obsidian.classification",
  ) as string | undefined) ?? "INTERNAL";
  const classification = await Select.prompt({
    message: "Vault classification level",
    options: ["INTERNAL", "PUBLIC", "CONFIDENTIAL", "RESTRICTED"],
    default: currentClassification,
  });

  console.log("  \u2713 Obsidian vault configured");
  return {
    obsidian: {
      enabled: true,
      vault_path: vaultPath,
      classification,
      daily_notes: { folder: "daily", date_format: "YYYY-MM-DD" },
    },
  };
}

// ── Search Provider helpers ───────────────────────────────────────────────

/** Prompt for which search provider to use and return its config or undefined. */
async function reconfigureSearchProvider(
  existingConfig: Record<string, unknown>,
): Promise<Record<string, unknown> | undefined> {
  console.log("");
  console.log("  Search Provider");
  console.log("");

  const currentProvider = (readNestedConfigValue(
    existingConfig,
    "web.search.provider",
  ) as string | undefined) ?? "";

  const choice = (await Select.prompt({
    message: "Which search engine should your agent use?",
    default: currentProvider || undefined,
    options: [
      {
        name: "Brave Search API (recommended, free tier available)",
        value: "brave",
      },
      { name: "SearXNG (self-hosted)", value: "searxng" },
      { name: "Skip for now", value: "skip" },
    ],
  })) as SearchProviderChoice;

  if (choice === "brave") {
    const apiKey = await Input.prompt({
      message: "Brave Search API key (or press Enter to keep existing)",
    });
    if (apiKey.length > 0) {
      return { search: { provider: "brave", api_key: apiKey } };
    }
    return undefined;
  }
  if (choice === "searxng") {
    const currentUrl = (readNestedConfigValue(
      existingConfig,
      "web.search.endpoint",
    ) as string | undefined) ?? "http://localhost:8888";
    const url = await Input.prompt({
      message: "SearXNG instance URL",
      default: currentUrl,
    });
    return { search: { provider: "searxng", endpoint: url } };
  }
  return undefined;
}

// ── Main entry point ──────────────────────────────────────────────────────

/**
 * Run a selective dive wizard that lets the user choose which sections to
 * reconfigure while preserving the rest of their existing config.
 * Defaults are pre-populated from the existing configuration.
 */
export async function runWizardSelective(
  baseDir: string,
): Promise<DiveResult> {
  const configPath = join(baseDir, "triggerfish.yaml");
  const spinePath = join(baseDir, "SPINE.md");

  if (!Deno.stdin.isTerminal()) {
    console.error("");
    console.error(
      "  Error: the dive wizard requires an interactive terminal.",
    );
    console.error("");
    Deno.exit(1);
  }

  // Load existing config
  let existingConfig: Record<string, unknown> = {};
  try {
    const raw = await Deno.readTextFile(configPath);
    existingConfig = (parseYaml(raw) as Record<string, unknown> | null) ?? {};
  } catch {
    // No existing config — fall through to full wizard
    return runWizard(baseDir);
  }

  // Load existing SPINE.md for agent defaults
  let existingSpine = "";
  try {
    existingSpine = await Deno.readTextFile(spinePath);
  } catch {
    // No existing SPINE.md
  }

  console.log("");
  console.log("  Reconfigure Triggerfish");
  console.log("  ======================");
  console.log("");
  console.log("  Select which sections you want to change.");
  console.log("  Unselected sections will keep their current settings.");
  console.log("");

  const sections = (await Checkbox.prompt({
    message: "Which sections do you want to update?",
    options: [
      { name: "LLM Provider (model, API key)", value: "llm" },
      { name: "Agent Name & Personality (SPINE.md)", value: "agent" },
      {
        name: "Channels (Telegram, Discord, Signal, WebChat)",
        value: "channels",
      },
      { name: "Plugins (Obsidian)", value: "plugins" },
      { name: "Google Workspace", value: "google" },
      { name: "GitHub", value: "github" },
      { name: "Search Provider", value: "search" },
      { name: "Daemon Settings", value: "daemon" },
    ],
  })) as WizardSection[];

  if (sections.length === 0) {
    console.log("");
    console.log("  No sections selected — config unchanged.");
    console.log("");
    return {
      configPath,
      spinePath,
      installDaemon: false,
      channels: [],
    };
  }

  // We'll merge changes into the existing config object
  const config = { ...existingConfig };

  // Track values needed for DiveResult
  let installDaemon = false;
  const activeChannels: string[] = [];

  if (sections.includes("llm")) {
    config["models"] = await reconfigureLlmProvider(existingConfig);
  }

  if (sections.includes("agent")) {
    await reconfigureAgentIdentity(existingSpine, spinePath);
  }

  if (sections.includes("channels")) {
    config["channels"] = await reconfigureChannels(
      existingConfig,
      activeChannels,
    );
  }

  if (sections.includes("plugins")) {
    const pluginsResult = await reconfigurePlugins(existingConfig);
    if (pluginsResult) {
      config["plugins"] = pluginsResult;
    } else {
      delete config["plugins"];
    }
  }

  // ── Google Workspace ──────────────────────────────────────────────────────
  if (sections.includes("google")) {
    console.log("");
    console.log("  Google Workspace");
    console.log("");
    const connectGoogle = await Confirm.prompt({
      message: "Connect a Google account?",
      default: false,
    });
    if (connectGoogle) {
      console.log("");
      console.log("  Run: triggerfish connect google");
    } else {
      console.log("  \u2192 Skipped.");
    }
  }

  // ── GitHub ────────────────────────────────────────────────────────────────
  if (sections.includes("github")) {
    console.log("");
    console.log("  GitHub");
    console.log("");
    const connectGitHub = await Confirm.prompt({
      message: "Connect a GitHub account?",
      default: false,
    });
    if (connectGitHub) {
      console.log("");
      console.log("  Run: triggerfish connect github");
    } else {
      console.log("  \u2192 Skipped.");
    }
  }

  if (sections.includes("search")) {
    const webResult = await reconfigureSearchProvider(existingConfig);
    if (webResult) {
      config["web"] = webResult;
    } else {
      delete config["web"];
    }
  }

  // ── Daemon ────────────────────────────────────────────────────────────────
  if (sections.includes("daemon")) {
    console.log("");
    console.log("  Daemon Settings");
    console.log("");
    installDaemon = await Confirm.prompt({
      message: "Start on login and run in background?",
      default: true,
    });
  }

  // ── Write updated config ──────────────────────────────────────────────────

  // Ensure classification defaults
  if (!config["classification"]) {
    config["classification"] = { mode: "personal", levels: "standard" };
  }

  const yaml = stringifyYaml(config as Record<string, unknown>);
  const content =
    `# Triggerfish Configuration\n# Generated by triggerfish dive\n\n${yaml}`;
  await Deno.writeTextFile(configPath, content);
  console.log("");
  console.log(`  \u2713 Updated: ${configPath}`);
  console.log("");

  return {
    configPath,
    spinePath,
    installDaemon,
    channels: activeChannels,
  };
}
