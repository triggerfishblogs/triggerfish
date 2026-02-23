/**
 * Interactive dive wizard for first-time Triggerfish setup.
 *
 * Walks the user through an 8-step onboarding flow:
 * 1. Choose LLM provider
 * 2. Name agent + personality -> generates SPINE.md
 * 3. Connect first channel (CLI, WebChat, Telegram)
 * 4. Optional plugins (Obsidian, etc.)
 * 5. Connect Google Workspace (optional)
 * 6. Connect GitHub (optional)
 * 7. Search provider (Brave, SearXNG, skip)
 * 8. Install as daemon?
 *
 * @module
 */

import { Checkbox, Confirm, Input, Select } from "@cliffy/prompt";
import { join } from "@std/path";

import { expandTilde } from "../cli/config/paths.ts";
import { promptChannelConfig } from "../cli/config/config.ts";
import { verifyProvider } from "./verify.ts";
import { createKeychain } from "../core/secrets/keychain.ts";

import type {
  ChannelChoice,
  DiveResult,
  ProviderChoice,
  SearchProviderChoice,
  ToneChoice,
  WizardAnswers,
} from "./wizard_types.ts";

import { DEFAULT_MODELS, PROVIDER_LABELS } from "./wizard_types.ts";

import {
  createDirectoryTree,
  generateConfig,
  generateSpine,
  generateTrigger,
} from "./wizard_generators.ts";

import { storeWizardSecrets } from "./wizard_secrets.ts";

// Re-export all public API from sub-modules for backward compatibility
export type {
  ChannelChoice,
  DiveResult,
  ProviderChoice,
  SearchProviderChoice,
  ToneChoice,
  WizardAnswers,
  WizardSection,
} from "./wizard_types.ts";

export { DEFAULT_MODELS, PROVIDER_LABELS } from "./wizard_types.ts";

export {
  buildToneGuidelines,
  createDirectoryTree,
  generateConfig,
  generateSpine,
  generateTrigger,
} from "./wizard_generators.ts";

export { storeWizardSecrets } from "./wizard_secrets.ts";
export { runWizardSelective } from "./wizard_selective.ts";

// ── Step result interfaces ────────────────────────────────────────────────────

interface LlmProviderResult {
  readonly provider: ProviderChoice;
  readonly providerModel: string;
  readonly apiKey: string;
  readonly localEndpoint: string;
}

interface AgentIdentityResult {
  readonly agentName: string;
  readonly mission: string;
  readonly tone: ToneChoice;
  readonly customTone: string;
}

interface ChannelSelectionResult {
  readonly channels: ChannelChoice[];
  readonly telegramBotToken: string;
  readonly telegramOwnerId: string;
  readonly discordBotToken: string;
  readonly discordOwnerId: string;
  readonly webchatPort: number;
  readonly signalPhoneNumber: string;
  readonly signalEndpoint: string;
}

interface PluginResult {
  readonly selectedPlugins: string[];
  readonly obsidianVaultPath: string;
  readonly obsidianClassification: string;
}

interface SearchProviderResult {
  readonly searchProvider: SearchProviderChoice;
  readonly searchApiKey: string;
  readonly searxngUrl: string;
}

// ── Step 1: LLM Provider ──────────────────────────────────────────────────────

async function selectLlmProvider(): Promise<{
  provider: ProviderChoice;
  providerModel: string;
}> {
  const provider = (await Select.prompt({
    message: "LLM provider",
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

  const providerModel = await Input.prompt({
    message: "Model name",
    default: DEFAULT_MODELS[provider],
  });

  return { provider, providerModel };
}

function resolveEnvVarName(provider: ProviderChoice): string {
  if (provider === "openai") return "OPENAI_API_KEY";
  if (provider === "google") return "GOOGLE_API_KEY";
  if (provider === "zenmux") return "ZENMUX_API_KEY";
  if (provider === "zai") return "ZAI_API_KEY";
  return "OPENROUTER_API_KEY";
}

async function collectLlmApiKey(
  provider: ProviderChoice,
): Promise<{ apiKey: string; localEndpoint: string }> {
  let apiKey = "";
  let localEndpoint = "http://localhost:11434";

  if (provider === "anthropic") {
    apiKey = await Input.prompt({
      message: "Anthropic API key (or press Enter to configure later)",
    });
    return { apiKey, localEndpoint };
  }

  if (provider === "ollama" || provider === "lmstudio") {
    console.log("  \u2713 Local provider \u2014 no API key needed");
    const defaultEndpoint = provider === "ollama"
      ? "http://localhost:11434"
      : "http://localhost:1234";
    localEndpoint = await Input.prompt({
      message: `${provider === "ollama" ? "Ollama" : "LM Studio"} endpoint`,
      default: defaultEndpoint,
    });
    return { apiKey, localEndpoint };
  }

  const envVarName = resolveEnvVarName(provider);
  const existingKey = Deno.env.get(envVarName) ?? "";
  if (existingKey.length > 0) {
    console.log(`  \u2713 Detected ${envVarName} in environment`);
    apiKey = existingKey;
  } else {
    apiKey = await Input.prompt({
      message: `API key (or press Enter to set ${envVarName} later)`,
    });
  }

  return { apiKey, localEndpoint };
}

async function verifyLlmConnection(options: {
  provider: ProviderChoice;
  apiKey: string;
  providerModel: string;
  localEndpoint: string;
}): Promise<{ apiKey: string; providerModel: string; localEndpoint: string }> {
  let { apiKey, providerModel, localEndpoint } = options;
  const { provider } = options;

  const shouldVerify = provider === "ollama" || provider === "lmstudio" ||
    apiKey.length > 0;

  if (!shouldVerify) {
    return { apiKey, providerModel, localEndpoint };
  }

  let verified = false;
  while (!verified) {
    console.log("");
    console.log("  Verifying connection...");
    const endpoint = provider === "ollama" || provider === "lmstudio"
      ? localEndpoint
      : undefined;
    const result = await verifyProvider(
      provider,
      apiKey,
      providerModel,
      endpoint,
    );

    if (result.ok) {
      console.log("  \u2713 Connection verified");
      verified = true;
      continue;
    }

    console.log(`  \u2717 ${result.error}`);
    console.log("");

    const action = await promptVerifyRetryAction(provider);

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
        message: provider === "anthropic" ? "Anthropic API key" : "API key",
      });
    }
  }

  return { apiKey, providerModel, localEndpoint };
}

async function promptVerifyRetryAction(
  provider: ProviderChoice,
): Promise<string> {
  const retryOptions: Array<{ name: string; value: string }> = [];
  if (provider === "ollama" || provider === "lmstudio") {
    retryOptions.push({ name: "Re-enter endpoint", value: "endpoint" });
  } else {
    retryOptions.push({ name: "Re-enter API key", value: "apikey" });
  }
  retryOptions.push({ name: "Re-enter model name", value: "model" });
  retryOptions.push({ name: "Keep this setting anyway", value: "keep" });

  return await Select.prompt({
    message: "What would you like to do?",
    options: retryOptions,
  });
}

async function promptLlmProviderStep(): Promise<LlmProviderResult> {
  console.log("  Step 1/8: Choose your LLM provider");
  console.log("");

  const { provider, providerModel } = await selectLlmProvider();
  const { apiKey, localEndpoint } = await collectLlmApiKey(provider);

  const verified = await verifyLlmConnection({
    provider,
    apiKey,
    providerModel,
    localEndpoint,
  });

  return {
    provider,
    providerModel: verified.providerModel,
    apiKey: verified.apiKey,
    localEndpoint: verified.localEndpoint,
  };
}

// ── Step 2: Agent Identity ────────────────────────────────────────────────────

async function promptAgentIdentityStep(
  spinePath: string,
): Promise<AgentIdentityResult> {
  console.log("  Step 2/8: Name your agent and set its personality");
  console.log("");

  const agentName = await Input.prompt({
    message: "Agent name",
    default: "Triggerfish",
  });

  const mission = await Input.prompt({
    message: "Mission (one sentence)",
    default: "A helpful AI assistant that keeps my data safe.",
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

  console.log(`  \u2192 Will generate SPINE.md (edit anytime at ${spinePath})`);
  console.log("");

  return { agentName, mission, tone, customTone };
}

// ── Step 3: Channel Selection ─────────────────────────────────────────────────

async function collectChannelChoices(): Promise<ChannelChoice[]> {
  const channelChoices = (await Checkbox.prompt({
    message: "Enable additional channels",
    options: [
      {
        name: "WebChat (browser-based, zero config)",
        value: "webchat",
        checked: true,
      },
      { name: "Telegram (requires bot token)", value: "telegram" },
      { name: "Discord (requires bot token)", value: "discord" },
      { name: "Signal (requires signal-cli)", value: "signal" },
    ],
  })) as ChannelChoice[];

  return ["cli", ...channelChoices];
}

async function collectTelegramConfig(): Promise<{
  telegramBotToken: string;
  telegramOwnerId: string;
}> {
  const telegramBotToken = await Input.prompt({
    message: "Telegram bot token (from @BotFather)",
  });
  const telegramOwnerId = await Input.prompt({
    message:
      "Your Telegram user ID (numeric, message @getmyid_bot for your ID number)",
  });
  if (telegramBotToken.length > 0) {
    console.log("  \u2713 Telegram bot token saved to config");
  }
  return { telegramBotToken, telegramOwnerId };
}

async function collectDiscordConfig(): Promise<{
  discordBotToken: string;
  discordOwnerId: string;
}> {
  const discordConfig = await promptChannelConfig("discord");
  const discordBotToken = (discordConfig.botToken as string) ?? "";
  const discordOwnerId = (discordConfig.ownerId as string) ?? "";
  if (discordBotToken.length > 0) {
    console.log("  \u2713 Discord bot token saved to config");
  }
  return { discordBotToken, discordOwnerId };
}

async function collectWebchatConfig(): Promise<number> {
  const portStr = await Input.prompt({
    message: "WebChat port",
    default: "8765",
  });
  return parseInt(portStr, 10) || 8765;
}

async function collectSignalConfig(): Promise<{
  signalPhoneNumber: string;
  signalEndpoint: string;
}> {
  console.log("");
  console.log("  Signal requires signal-cli to be installed and linked.");
  console.log("  Run: triggerfish connect signal   (after setup)");
  console.log("");
  const signalPhoneNumber = await Input.prompt({
    message: "Your Signal phone number (E.164 format, e.g. +15551234567)",
  });
  const signalEndpoint = await Input.prompt({
    message: "signal-cli daemon endpoint",
    default: "tcp://127.0.0.1:7583",
  });
  if (signalPhoneNumber.length > 0) {
    console.log("  \u2713 Signal account saved to config");
  }
  return { signalPhoneNumber, signalEndpoint };
}

async function promptChannelSelectionStep(): Promise<ChannelSelectionResult> {
  console.log("  Step 3/8: Connect your first channel");
  console.log("  (CLI is always available)");
  console.log("");

  const channels = await collectChannelChoices();

  let telegramBotToken = "";
  let telegramOwnerId = "";
  let discordBotToken = "";
  let discordOwnerId = "";
  let webchatPort = 8765;
  let signalPhoneNumber = "";
  let signalEndpoint = "tcp://127.0.0.1:7583";

  if (channels.includes("telegram")) {
    const telegram = await collectTelegramConfig();
    telegramBotToken = telegram.telegramBotToken;
    telegramOwnerId = telegram.telegramOwnerId;
  }

  if (channels.includes("discord")) {
    const discord = await collectDiscordConfig();
    discordBotToken = discord.discordBotToken;
    discordOwnerId = discord.discordOwnerId;
  }

  if (channels.includes("webchat")) {
    webchatPort = await collectWebchatConfig();
  }

  if (channels.includes("signal")) {
    const signal = await collectSignalConfig();
    signalPhoneNumber = signal.signalPhoneNumber;
    signalEndpoint = signal.signalEndpoint;
  }

  console.log("");

  return {
    channels,
    telegramBotToken,
    telegramOwnerId,
    discordBotToken,
    discordOwnerId,
    webchatPort,
    signalPhoneNumber,
    signalEndpoint,
  };
}

// ── Step 4: Plugins ───────────────────────────────────────────────────────────

async function collectObsidianConfig(): Promise<{
  obsidianVaultPath: string;
  obsidianClassification: string;
}> {
  let obsidianVaultPath = "";
  while (true) {
    obsidianVaultPath = await Input.prompt({
      message: "Path to your Obsidian vault",
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
        `  Not a valid Obsidian vault (no .obsidian/ folder found at ${obsidianVaultPath})`,
      );
      console.log("  Please enter the root folder of your Obsidian vault.");
    }
  }

  const obsidianClassification = await Select.prompt({
    message: "Vault classification level",
    options: ["INTERNAL", "PUBLIC", "CONFIDENTIAL", "RESTRICTED"],
    default: "INTERNAL",
  });

  console.log("  \u2713 Obsidian vault configured");
  return { obsidianVaultPath, obsidianClassification };
}

async function promptPluginStep(): Promise<PluginResult> {
  console.log("  Step 4/8: Configure optional plugins");
  console.log("");

  const selectedPlugins = await Checkbox.prompt({
    message: "Which plugins would you like to configure?",
    options: [
      { name: "Obsidian (local vault integration)", value: "obsidian" },
    ],
  });

  let obsidianVaultPath = "";
  let obsidianClassification = "INTERNAL";

  if (selectedPlugins.includes("obsidian")) {
    const obsidian = await collectObsidianConfig();
    obsidianVaultPath = obsidian.obsidianVaultPath;
    obsidianClassification = obsidian.obsidianClassification;
  }

  if (selectedPlugins.length === 0) {
    console.log(
      "  No plugins selected \u2014 add later with: triggerfish config add-plugin",
    );
  }

  console.log("");

  return { selectedPlugins, obsidianVaultPath, obsidianClassification };
}

// ── Step 5: Google Workspace ──────────────────────────────────────────────────

function printGoogleWorkspaceInstructions(): void {
  console.log("");
  console.log(
    "  To connect Google Workspace, you need OAuth2 credentials from Google Cloud Console.",
  );
  console.log("");
  console.log("  Quick setup:");
  console.log("    1. Go to https://console.cloud.google.com ");
  console.log("    2. Create a project (or select an existing one)");
  console.log('    3. Navigate to "APIs & Services" \u2192 "Credentials"');
  console.log(
    '    4. Click "+ CREATE CREDENTIALS" and select "OAuth client ID"',
  );
  console.log("    5. If prompted, configure the OAuth consent screen first");
  console.log(
    "       IMPORTANT: Add yourself as a test user on the consent screen,",
  );
  console.log(
    '       or you\'ll get "Access blocked" when authorizing.',
  );
  console.log(
    "       Full walkthrough: https://trigger.fish/integrations/google-workspace.html#google-workspace",
  );
  console.log(
    '    6. On the Create OAuth client ID screen, select "Desktop app" from',
  );
  console.log("       the Application type dropdown");
  console.log('    7. Name it "Triggerfish" (or anything you like)');
  console.log(
    "    8. Click Create, then copy the Client ID and Client Secret",
  );
  console.log("");
  console.log("  You also need to enable these APIs in your project:");
  console.log("    - Gmail API");
  console.log("    - Google Calendar API");
  console.log("    - Google Tasks API");
  console.log("    - Google Drive API");
  console.log("    - Google Sheets API");
  console.log("");
  console.log(
    "  Enable them at: https://console.cloud.google.com/apis/library",
  );
  console.log("");
}

async function attemptGoogleOAuth(): Promise<void> {
  console.log("");
  const { performGoogleOAuth } = await import("../cli/commands/connect.ts");
  const success = await performGoogleOAuth();
  if (success) {
    console.log("");
    console.log("  \u2192 Google Workspace connected!");
  } else {
    console.log("");
    console.log(
      "  \u2192 Connection failed. Try again later with: triggerfish connect google",
    );
  }
}

async function promptGoogleWorkspaceStep(): Promise<void> {
  console.log("  Step 5/8: Connect Google Workspace (optional)");
  console.log("");

  const connectGoogle = await Confirm.prompt({
    message:
      "Connect a Google account for Gmail, Calendar, Tasks, Drive, and Sheets?",
    default: false,
  });

  if (connectGoogle) {
    printGoogleWorkspaceInstructions();
    const readyNow = await Confirm.prompt({
      message: "Have your credentials ready? Connect now?",
      default: false,
    });
    if (readyNow) {
      await attemptGoogleOAuth();
    } else {
      console.log("  \u2192 Connect later with: triggerfish connect google");
    }
  } else {
    console.log(
      "  \u2192 Skipped. Connect later with: triggerfish connect google",
    );
  }

  console.log("");
}

// ── Step 6: GitHub ────────────────────────────────────────────────────────────

function printGitHubInstructions(): void {
  console.log("");
  console.log(
    "  To connect GitHub, you need a Personal Access Token (fine-grained).",
  );
  console.log("");
  console.log("  Quick setup:");
  console.log("    1. Go to https://github.com/settings/tokens?type=beta");
  console.log('    2. Click "Generate new token"');
  console.log('    3. Name it "triggerfish"');
  console.log("    4. Under Repository access, select the repos you want");
  console.log("    5. Under Permissions, grant:");
  console.log("       - Contents: Read and Write");
  console.log("       - Issues: Read and Write");
  console.log("       - Pull requests: Read and Write");
  console.log("       - Actions: Read-only");
  console.log("    6. Click Generate token and copy it");
  console.log("");
}

async function verifyAndStoreGitHubToken(token: string): Promise<void> {
  const trimmed = token.trim();
  if (trimmed.length === 0) {
    console.log(
      "  \u2192 No token provided. Connect later with: triggerfish connect github",
    );
    return;
  }

  console.log("  Verifying token...");
  try {
    const resp = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${trimmed}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (resp.ok) {
      const user = await resp.json();
      const store = createKeychain();
      const storeResult = await store.setSecret("github-pat", trimmed);
      if (storeResult.ok) {
        console.log(
          `  \u2192 GitHub connected as ${
            (user as Record<string, string>).login
          }!`,
        );
      } else {
        console.log(
          `  \u2192 Token valid but failed to store: ${storeResult.error}`,
        );
        console.log(
          "  \u2192 Try again later with: triggerfish connect github",
        );
      }
    } else {
      console.log(
        "  \u2192 Token verification failed. Check permissions and try again.",
      );
      console.log("  \u2192 Connect later with: triggerfish connect github");
    }
  } catch {
    console.log(
      "  \u2192 Could not reach GitHub API. Check your network.",
    );
    console.log("  \u2192 Connect later with: triggerfish connect github");
  }
}

async function promptGitHubConnectionStep(): Promise<void> {
  console.log("  Step 6/8: Connect GitHub (optional)");
  console.log("");

  const connectGitHub = await Confirm.prompt({
    message: "Connect a GitHub account for repos, PRs, issues, and Actions?",
    default: false,
  });

  if (connectGitHub) {
    printGitHubInstructions();
    const readyGitHub = await Confirm.prompt({
      message: "Have your token ready? Connect now?",
      default: false,
    });
    if (readyGitHub) {
      console.log("");
      const token = await Input.prompt({
        message: "Paste your GitHub token",
      });
      await verifyAndStoreGitHubToken(token);
    } else {
      console.log("  \u2192 Connect later with: triggerfish connect github");
    }
  } else {
    console.log(
      "  \u2192 Skipped. Connect later with: triggerfish connect github",
    );
  }

  console.log("");
}

// ── Step 7: Search Provider ───────────────────────────────────────────────────

async function promptSearchProviderStep(): Promise<SearchProviderResult> {
  console.log("  Step 7/8: Set up web search");
  console.log("");

  const searchProvider = (await Select.prompt({
    message: "Which search engine should your agent use?",
    options: [
      {
        name: "Brave Search API (recommended, free tier available)",
        value: "brave",
      },
      { name: "SearXNG (self-hosted)", value: "searxng" },
      { name: "Skip for now", value: "skip" },
    ],
  })) as SearchProviderChoice;

  let searchApiKey = "";
  let searxngUrl = "";

  if (searchProvider === "brave") {
    searchApiKey = await Input.prompt({
      message: "Brave Search API key (or press Enter to configure later)",
    });
    if (searchApiKey.length > 0) {
      console.log("  \u2713 API key saved to config");
    } else {
      console.log(
        "  \u2192 Skipped. Set later with: triggerfish config set web.search.api_key <key>",
      );
    }
  } else if (searchProvider === "searxng") {
    searxngUrl = await Input.prompt({
      message: "SearXNG instance URL",
      default: "http://localhost:8888",
    });
  }

  console.log("");

  return { searchProvider, searchApiKey, searxngUrl };
}

// ── File generation ───────────────────────────────────────────────────────────

async function writeTriggerFile(baseDir: string): Promise<void> {
  const triggerPath = join(baseDir, "TRIGGER.md");
  try {
    await Deno.stat(triggerPath);
    // Already exists - don't overwrite
  } catch {
    const triggerContent = generateTrigger();
    await Deno.writeTextFile(triggerPath, triggerContent);
    console.log(`  \u2713 Created: ${triggerPath}`);
  }
}

function printCompletionSummary(options: {
  installDaemon: boolean;
  apiKeyPresent: boolean;
  spinePath: string;
  configPath: string;
}): void {
  const { installDaemon, apiKeyPresent, spinePath, configPath } = options;

  if (apiKeyPresent) {
    console.log(
      "  \u2713 API key stored in OS keychain. triggerfish.yaml references it by name.",
    );
  }

  console.log("");
  console.log("  \u2713 Setup complete!");
  console.log("");

  if (installDaemon) {
    console.log("  Starting Triggerfish daemon...");
  } else {
    console.log("  To start Triggerfish later:");
    console.log("    triggerfish start    # Background daemon");
    console.log("    triggerfish run      # Foreground (debug)");
  }

  console.log("");
  console.log(`  Edit your agent's identity: ${spinePath}`);
  console.log(`  Edit configuration:         ${configPath}`);
  console.log("  Run health check:           triggerfish patrol");
  console.log("  Connect integrations:       triggerfish connect google");
  console.log("                              triggerfish connect github");
  console.log("");
}

async function writeWizardOutputFiles(
  baseDir: string,
  answers: WizardAnswers,
): Promise<{ configPath: string; spinePath: string }> {
  const configPath = join(baseDir, "triggerfish.yaml");
  const spinePath = join(baseDir, "SPINE.md");

  await createDirectoryTree(baseDir);

  const storedKeys = await storeWizardSecrets(answers);
  if (storedKeys.length > 0) {
    console.log(
      `  \u2713 Secrets stored in OS keychain (${storedKeys.length} key(s))`,
    );
  }

  const configContent = generateConfig(answers);
  await Deno.writeTextFile(configPath, configContent);
  console.log(`  \u2713 Created: ${configPath}`);

  const spineContent = generateSpine(answers);
  await Deno.writeTextFile(spinePath, spineContent);
  console.log(`  \u2713 Created: ${spinePath}`);

  await writeTriggerFile(baseDir);

  printCompletionSummary({
    installDaemon: answers.installDaemon,
    apiKeyPresent: answers.apiKey.length > 0,
    spinePath,
    configPath,
  });

  return { configPath, spinePath };
}

// ── Guard ─────────────────────────────────────────────────────────────────────

function enforceTerminalRequirement(): void {
  if (!Deno.stdin.isTerminal()) {
    console.error("");
    console.error(
      "  Error: the dive wizard requires an interactive terminal.",
    );
    console.error("");
    console.error(
      "  If you installed via curl|bash, run the wizard manually:",
    );
    console.error("    triggerfish dive");
    console.error("");
    Deno.exit(1);
  }
}

function printWelcomeBanner(): void {
  console.log("");
  console.log("  Welcome to Triggerfish");
  console.log("  ======================");
  console.log("");
  console.log("  Let's get you set up. This takes about 2 minutes.");
  console.log("");
}

// ── Assemble WizardAnswers ────────────────────────────────────────────────────

function assembleWizardAnswers(options: {
  llm: LlmProviderResult;
  identity: AgentIdentityResult;
  channelSelection: ChannelSelectionResult;
  plugins: PluginResult;
  search: SearchProviderResult;
  installDaemon: boolean;
}): WizardAnswers {
  const { llm, identity, channelSelection, plugins, search } = options;
  return {
    provider: llm.provider,
    providerModel: llm.providerModel,
    apiKey: llm.apiKey,
    localEndpoint: llm.localEndpoint,
    agentName: identity.agentName,
    mission: identity.mission,
    tone: identity.tone,
    customTone: identity.customTone,
    channels: channelSelection.channels,
    telegramBotToken: channelSelection.telegramBotToken,
    telegramOwnerId: channelSelection.telegramOwnerId,
    discordBotToken: channelSelection.discordBotToken,
    discordOwnerId: channelSelection.discordOwnerId,
    webchatPort: channelSelection.webchatPort,
    signalPhoneNumber: channelSelection.signalPhoneNumber,
    signalEndpoint: channelSelection.signalEndpoint,
    selectedPlugins: plugins.selectedPlugins,
    obsidianVaultPath: plugins.obsidianVaultPath,
    obsidianClassification: plugins.obsidianClassification,
    searchProvider: search.searchProvider,
    searchApiKey: search.searchApiKey,
    searxngUrl: search.searxngUrl,
    installDaemon: options.installDaemon,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Run the full 9-step interactive dive wizard. */
export async function runWizard(baseDir: string): Promise<DiveResult> {
  enforceTerminalRequirement();
  printWelcomeBanner();

  const llm = await promptLlmProviderStep();
  console.log("");

  const spinePath = join(baseDir, "SPINE.md");
  const identity = await promptAgentIdentityStep(spinePath);
  const channelSelection = await promptChannelSelectionStep();
  const plugins = await promptPluginStep();

  await promptGoogleWorkspaceStep();
  await promptGitHubConnectionStep();

  const search = await promptSearchProviderStep();

  // Step 8: Daemon Installation (small enough to stay inline)
  console.log("  Step 8/8: Install as daemon?");
  console.log("");
  const installDaemon = await Confirm.prompt({
    message: "Start on login and run in background?",
    default: true,
  });
  console.log("");

  const answers = assembleWizardAnswers({
    llm,
    identity,
    channelSelection,
    plugins,
    search,
    installDaemon,
  });

  const { configPath, spinePath: writtenSpinePath } =
    await writeWizardOutputFiles(baseDir, answers);

  return {
    configPath,
    spinePath: writtenSpinePath,
    installDaemon,
    channels: channelSelection.channels.filter((c) => c !== "skip"),
  };
}
