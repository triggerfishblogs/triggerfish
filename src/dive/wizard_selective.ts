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
import {
  parse as parseYaml,
  stringify as stringifyYaml,
} from "@std/yaml";

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

import {
  DEFAULT_MODELS,
  PROVIDER_LABELS,
} from "./wizard_types.ts";

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
    existingConfig =
      (parseYaml(raw) as Record<string, unknown> | null) ?? {};
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
      { name: "Channels (Telegram, Discord, Signal, WebChat)", value: "channels" },
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

  // ── LLM Provider ──────────────────────────────────────────────────────────
  if (sections.includes("llm")) {
    console.log("");
    console.log("  LLM Provider");
    console.log("");

    const currentProvider = (readNestedConfigValue(existingConfig, "models.primary.provider") as string | undefined) ?? "";
    const currentModel = (readNestedConfigValue(existingConfig, "models.primary.model") as string | undefined) ?? "";

    const provider = (await Select.prompt({
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

    let providerModel = await Input.prompt({
      message: "Model name",
      default: currentModel || DEFAULT_MODELS[provider],
    });

    let apiKey = "";
    const currentEndpoint = (readNestedConfigValue(existingConfig, `models.providers.${provider}.endpoint`) as string | undefined) ?? "";
    let localEndpoint = currentEndpoint || "http://localhost:11434";

    if (provider === "anthropic") {
      apiKey = await Input.prompt({
        message: "Anthropic API key (or press Enter to keep existing)",
      });
    } else if (provider === "ollama" || provider === "lmstudio") {
      console.log("  ✓ Local provider — no API key needed");
      localEndpoint = await Input.prompt({
        message: `${provider === "ollama" ? "Ollama" : "LM Studio"} endpoint`,
        default: localEndpoint || (provider === "lmstudio"
          ? "http://localhost:1234"
          : "http://localhost:11434"),
      });
    } else {
      const envVarName = provider === "openai"
        ? "OPENAI_API_KEY"
        : provider === "google"
        ? "GOOGLE_API_KEY"
        : provider === "zenmux"
        ? "ZENMUX_API_KEY"
        : provider === "zai"
        ? "ZAI_API_KEY"
        : "OPENROUTER_API_KEY";
      const existingKey = Deno.env.get(envVarName) ?? "";
      if (existingKey.length > 0) {
        console.log(`  ✓ Detected ${envVarName} in environment`);
        apiKey = existingKey;
      } else {
        apiKey = await Input.prompt({
          message: `API key (or press Enter to set ${envVarName} later)`,
        });
      }
    }

    // Verify connection
    const shouldVerify = provider === "ollama" || provider === "lmstudio" ||
      apiKey.length > 0;
    if (shouldVerify) {
      let verified = false;
      while (!verified) {
        console.log("");
        console.log("  Verifying connection...");
        const result = await verifyProvider(
          provider,
          apiKey,
          providerModel,
          provider === "ollama" || provider === "lmstudio"
            ? localEndpoint
            : undefined,
        );
        if (result.ok) {
          console.log("  ✓ Connection verified");
          verified = true;
        } else {
          console.log(`  ✗ ${result.error}`);
          console.log("");
          const retryOptions: Array<{ name: string; value: string }> = [];
          if (provider === "ollama" || provider === "lmstudio") {
            retryOptions.push({
              name: "Re-enter endpoint",
              value: "endpoint",
            });
          } else {
            retryOptions.push({ name: "Re-enter API key", value: "apikey" });
          }
          retryOptions.push({ name: "Re-enter model name", value: "model" });
          retryOptions.push({
            name: "Keep this setting anyway",
            value: "keep",
          });
          const action = await Select.prompt({
            message: "What would you like to do?",
            options: retryOptions,
          });
          if (action === "keep") {
            verified = true;
          } else if (action === "endpoint") {
            localEndpoint = await Input.prompt({
              message: "Endpoint URL",
              default: localEndpoint,
            });
          } else if (action === "model") {
            providerModel = await Input.prompt({
              message: "Model name",
              default: providerModel,
            });
          } else {
            apiKey = await Input.prompt({
              message: provider === "anthropic"
                ? "Anthropic API key"
                : "API key",
            });
          }
        }
      }
    }

    // Build providers section
    const providers: Record<string, Record<string, string>> = {};
    if (provider === "ollama" || provider === "lmstudio") {
      providers[provider] = { model: providerModel, endpoint: localEndpoint };
    } else {
      const pc: Record<string, string> = { model: providerModel };
      if (apiKey.length > 0) pc["apiKey"] = apiKey;
      providers[provider] = pc;
    }

    config["models"] = {
      primary: { provider, model: providerModel },
      providers,
    };
  }

  // ── Agent Name & Personality ──────────────────────────────────────────────
  if (sections.includes("agent")) {
    console.log("");
    console.log("  Agent Name & Personality");
    console.log("");

    // Parse existing SPINE.md for defaults
    const spineNameMatch = existingSpine.match(/^# (.+)$/m);
    const currentAgentName = spineNameMatch?.[1] ?? "Triggerfish";
    // Mission is the first non-empty line after the heading
    const spineLines = existingSpine.split("\n");
    const headingIdx = spineLines.findIndex((l) => l.startsWith("# "));
    let currentMission = "A helpful AI assistant that keeps my data safe.";
    if (headingIdx >= 0) {
      for (let i = headingIdx + 1; i < spineLines.length; i++) {
        const line = spineLines[i].trim();
        if (line.length > 0 && !line.startsWith("#")) {
          currentMission = line;
          break;
        }
      }
    }

    const agentName = await Input.prompt({
      message: "Agent name",
      default: currentAgentName,
    });
    const mission = await Input.prompt({
      message: "Mission (one sentence)",
      default: currentMission,
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
    console.log(`  ✓ Updated: ${spinePath}`);
  }

  // ── Channels ──────────────────────────────────────────────────────────────
  if (sections.includes("channels")) {
    console.log("");
    console.log("  Channels");
    console.log("");

    const existingChannels = (readNestedConfigValue(existingConfig, "channels") ?? {}) as Record<string, unknown>;
    const hasWebchat = "webchat" in existingChannels;
    const hasTelegram = "telegram" in existingChannels;
    const hasDiscord = "discord" in existingChannels;
    const hasSignal = "signal" in existingChannels;

    const channelChoices = (await Checkbox.prompt({
      message: "Enable additional channels",
      options: [
        {
          name: "WebChat (browser-based, zero config)",
          value: "webchat",
          checked: hasWebchat,
        },
        {
          name: "Telegram (requires bot token)",
          value: "telegram",
          checked: hasTelegram,
        },
        {
          name: "Discord (requires bot token)",
          value: "discord",
          checked: hasDiscord,
        },
        {
          name: "Signal (requires signal-cli)",
          value: "signal",
          checked: hasSignal,
        },
      ],
    })) as ChannelChoice[];

    // Preserve channels that the wizard doesn't manage (Slack,
    // WhatsApp, Email, iMessage). Only webchat, telegram, discord, and signal
    // are editable here — everything else carries forward unchanged.
    const channels: Record<string, unknown> = { ...existingChannels };

    // Remove managed channels if user deselected them
    if (!channelChoices.includes("webchat")) {
      delete channels["webchat"];
    }
    if (!channelChoices.includes("telegram")) {
      delete channels["telegram"];
    }
    if (!channelChoices.includes("discord")) {
      delete channels["discord"];
    }
    if (!channelChoices.includes("signal")) {
      delete channels["signal"];
    }

    if (channelChoices.includes("webchat")) {
      activeChannels.push("webchat");
      const currentPort = String(
        (readNestedConfigValue(existingConfig, "channels.webchat.port") as number | undefined) ?? 8765,
      );
      const portStr = await Input.prompt({
        message: "WebChat port",
        default: currentPort,
      });
      channels["webchat"] = {
        port: parseInt(portStr, 10) || 8765,
        classification: "PUBLIC",
      };
    }

    if (channelChoices.includes("telegram")) {
      activeChannels.push("telegram");
      const currentOwnerId = String(
        (readNestedConfigValue(existingConfig, "channels.telegram.ownerId") as number | undefined) ?? "",
      );
      const telegramBotToken = await Input.prompt({
        message: "Telegram bot token (from @BotFather)",
      });
      const telegramOwnerId = await Input.prompt({
        message: "Your Telegram user ID (numeric)",
        default: currentOwnerId || undefined,
      });
      if (telegramBotToken.length > 0) {
        const tc: Record<string, unknown> = {
          botToken: telegramBotToken,
          classification: "INTERNAL",
        };
        if (telegramOwnerId.length > 0) {
          tc["ownerId"] = parseInt(telegramOwnerId, 10) || 0;
        }
        channels["telegram"] = tc;
        console.log("  ✓ Telegram bot token saved to config");
      }
    }

    if (channelChoices.includes("discord")) {
      activeChannels.push("discord");
      const discordConfig = await promptChannelConfig("discord");
      if ((discordConfig.botToken as string)?.length > 0) {
        channels["discord"] = discordConfig;
        console.log("  ✓ Discord bot token saved to config");
      }
    }

    if (channelChoices.includes("signal")) {
      activeChannels.push("signal");
      const currentPhone = (readNestedConfigValue(existingConfig, "channels.signal.account") as string | undefined) ?? "";
      const currentEndpoint = (readNestedConfigValue(existingConfig, "channels.signal.endpoint") as string | undefined) ?? "tcp://127.0.0.1:7583";
      const signalPhoneNumber = await Input.prompt({
        message: "Your Signal phone number (E.164 format, e.g. +15551234567)",
        default: currentPhone || undefined,
      });
      const signalEndpoint = await Input.prompt({
        message: "signal-cli daemon endpoint",
        default: currentEndpoint,
      });
      if (signalPhoneNumber.length > 0) {
        channels["signal"] = {
          endpoint: signalEndpoint,
          account: signalPhoneNumber,
          classification: "INTERNAL",
          ownerPhone: signalPhoneNumber,
        };
        console.log("  ✓ Signal account saved to config");
      }
    }

    config["channels"] = channels;
  }

  // ── Plugins ───────────────────────────────────────────────────────────────
  if (sections.includes("plugins")) {
    console.log("");
    console.log("  Plugins");
    console.log("");

    const hasObsidian = readNestedConfigValue(existingConfig, "plugins.obsidian.enabled") === true;

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

    if (selectedPlugins.includes("obsidian")) {
      const currentVaultPath = (readNestedConfigValue(existingConfig, "plugins.obsidian.vault_path") as string | undefined) ?? "";
      let obsidianVaultPath = "";
      while (true) {
        obsidianVaultPath = await Input.prompt({
          message: "Path to your Obsidian vault",
          default: currentVaultPath || undefined,
        });
        if (obsidianVaultPath.length === 0) {
          console.log("  Vault path is required for Obsidian plugin.");
          continue;
        }
        obsidianVaultPath = expandTilde(obsidianVaultPath);
        try {
          await Deno.stat(join(obsidianVaultPath, ".obsidian"));
          break;
        } catch {
          console.log(
            `  Not a valid Obsidian vault (no .obsidian/ folder at ${obsidianVaultPath})`,
          );
        }
      }
      const currentClassification = (readNestedConfigValue(existingConfig, "plugins.obsidian.classification") as string | undefined) ?? "INTERNAL";
      const obsidianClassification = await Select.prompt({
        message: "Vault classification level",
        options: ["INTERNAL", "PUBLIC", "CONFIDENTIAL", "RESTRICTED"],
        default: currentClassification,
      });
      config["plugins"] = {
        obsidian: {
          enabled: true,
          vault_path: obsidianVaultPath,
          classification: obsidianClassification,
          daily_notes: { folder: "daily", date_format: "YYYY-MM-DD" },
        },
      };
      console.log("  ✓ Obsidian vault configured");
    } else {
      delete config["plugins"];
      console.log("  No plugins selected.");
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
      console.log("  → Skipped.");
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
      console.log("  → Skipped.");
    }
  }

  // ── Search Provider ───────────────────────────────────────────────────────
  if (sections.includes("search")) {
    console.log("");
    console.log("  Search Provider");
    console.log("");

    const currentSearchProvider = (readNestedConfigValue(existingConfig, "web.search.provider") as string | undefined) ?? "";

    const searchProvider = (await Select.prompt({
      message: "Which search engine should your agent use?",
      default: currentSearchProvider || undefined,
      options: [
        {
          name: "Brave Search API (recommended, free tier available)",
          value: "brave",
        },
        { name: "SearXNG (self-hosted)", value: "searxng" },
        { name: "Skip for now", value: "skip" },
      ],
    })) as SearchProviderChoice;

    if (searchProvider === "brave") {
      const searchApiKey = await Input.prompt({
        message: "Brave Search API key (or press Enter to keep existing)",
      });
      if (searchApiKey.length > 0) {
        config["web"] = { search: { provider: "brave", api_key: searchApiKey } };
      }
    } else if (searchProvider === "searxng") {
      const currentSearxngUrl = (readNestedConfigValue(existingConfig, "web.search.endpoint") as string | undefined) ?? "http://localhost:8888";
      const searxngUrl = await Input.prompt({
        message: "SearXNG instance URL",
        default: currentSearxngUrl,
      });
      config["web"] = { search: { provider: "searxng", endpoint: searxngUrl } };
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
  console.log(`  ✓ Updated: ${configPath}`);
  console.log("");

  return {
    configPath,
    spinePath,
    installDaemon,
    channels: activeChannels,
  };
}
