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

async function collectLocalProviderEndpoint(
  provider: ProviderChoice,
): Promise<{ apiKey: string; localEndpoint: string }> {
  console.log("  \u2713 Local provider \u2014 no API key needed");
  const defaultEndpoint = provider === "ollama"
    ? "http://localhost:11434"
    : "http://localhost:1234";
  const localEndpoint = await Input.prompt({
    message: `${provider === "ollama" ? "Ollama" : "LM Studio"} endpoint`,
    default: defaultEndpoint,
  });
  return { apiKey: "", localEndpoint };
}

async function collectCloudProviderApiKey(
  provider: ProviderChoice,
): Promise<string> {
  const envVarName = resolveEnvVarName(provider);
  const existingKey = Deno.env.get(envVarName) ?? "";
  if (existingKey.length > 0) {
    console.log(`  \u2713 Detected ${envVarName} in environment`);
    return existingKey;
  }
  return await Input.prompt({
    message: `API key (or press Enter to set ${envVarName} later)`,
  });
}

async function collectLlmApiKey(
  provider: ProviderChoice,
): Promise<{ apiKey: string; localEndpoint: string }> {
  if (provider === "anthropic") {
    const apiKey = await Input.prompt({
      message: "Anthropic API key (or press Enter to configure later)",
    });
    return { apiKey, localEndpoint: "http://localhost:11434" };
  }
  if (provider === "ollama" || provider === "lmstudio") {
    return await collectLocalProviderEndpoint(provider);
  }
  const apiKey = await collectCloudProviderApiKey(provider);
  return { apiKey, localEndpoint: "http://localhost:11434" };
}

function resolveVerifyEndpoint(
  provider: ProviderChoice,
  localEndpoint: string,
): string | undefined {
  return (provider === "ollama" || provider === "lmstudio")
    ? localEndpoint
    : undefined;
}

function requiresVerification(
  provider: ProviderChoice,
  apiKey: string,
): boolean {
  return provider === "ollama" || provider === "lmstudio" ||
    apiKey.length > 0;
}

interface VerifyLoopState {
  apiKey: string;
  providerModel: string;
  localEndpoint: string;
}

async function attemptLlmVerification(
  provider: ProviderChoice,
  state: VerifyLoopState,
): Promise<boolean> {
  console.log("");
  console.log("  Verifying connection...");
  const endpoint = resolveVerifyEndpoint(provider, state.localEndpoint);
  const result = await verifyProvider(
    provider,
    state.apiKey,
    state.providerModel,
    endpoint,
  );
  if (result.ok) {
    console.log("  \u2713 Connection verified");
    return true;
  }
  console.log(`  \u2717 ${result.error}`);
  console.log("");
  return false;
}

async function applyVerifyRetryAction(
  provider: ProviderChoice,
  state: VerifyLoopState,
): Promise<boolean> {
  const action = await promptVerifyRetryAction(provider);
  if (action === "keep") return true;
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
  return false;
}

async function verifyLlmConnection(options: {
  provider: ProviderChoice;
  apiKey: string;
  providerModel: string;
  localEndpoint: string;
}): Promise<{ apiKey: string; providerModel: string; localEndpoint: string }> {
  const state: VerifyLoopState = {
    apiKey: options.apiKey,
    providerModel: options.providerModel,
    localEndpoint: options.localEndpoint,
  };

  if (!requiresVerification(options.provider, state.apiKey)) {
    return { ...state };
  }

  let verified = false;
  while (!verified) {
    verified = await attemptLlmVerification(options.provider, state);
    if (!verified) {
      verified = await applyVerifyRetryAction(options.provider, state);
    }
  }

  return { ...state };
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

async function selectAgentTone(): Promise<{
  tone: ToneChoice;
  customTone: string;
}> {
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
  return { tone, customTone };
}

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
  const { tone, customTone } = await selectAgentTone();

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

interface ChannelConfigAccumulator {
  telegramBotToken: string;
  telegramOwnerId: string;
  discordBotToken: string;
  discordOwnerId: string;
  webchatPort: number;
  signalPhoneNumber: string;
  signalEndpoint: string;
}

function createDefaultChannelConfig(): ChannelConfigAccumulator {
  return {
    telegramBotToken: "",
    telegramOwnerId: "",
    discordBotToken: "",
    discordOwnerId: "",
    webchatPort: 8765,
    signalPhoneNumber: "",
    signalEndpoint: "tcp://127.0.0.1:7583",
  };
}

async function collectSelectedChannelConfigs(
  channels: ChannelChoice[],
): Promise<ChannelConfigAccumulator> {
  const config = createDefaultChannelConfig();
  if (channels.includes("telegram")) {
    const t = await collectTelegramConfig();
    config.telegramBotToken = t.telegramBotToken;
    config.telegramOwnerId = t.telegramOwnerId;
  }
  if (channels.includes("discord")) {
    const d = await collectDiscordConfig();
    config.discordBotToken = d.discordBotToken;
    config.discordOwnerId = d.discordOwnerId;
  }
  if (channels.includes("webchat")) {
    config.webchatPort = await collectWebchatConfig();
  }
  if (channels.includes("signal")) {
    const s = await collectSignalConfig();
    config.signalPhoneNumber = s.signalPhoneNumber;
    config.signalEndpoint = s.signalEndpoint;
  }
  return config;
}

async function promptChannelSelectionStep(): Promise<ChannelSelectionResult> {
  console.log("  Step 3/8: Connect your first channel");
  console.log("  (CLI is always available)");
  console.log("");

  const channels = await collectChannelChoices();
  const config = await collectSelectedChannelConfigs(channels);

  console.log("");

  return { channels, ...config };
}

// ── Step 4: Plugins ───────────────────────────────────────────────────────────

async function promptValidObsidianVaultPath(): Promise<string> {
  while (true) {
    const rawPath = await Input.prompt({
      message: "Path to your Obsidian vault",
    });
    if (rawPath.length === 0) {
      console.log("  Vault path is required for Obsidian plugin.");
      continue;
    }
    const expanded = expandTilde(rawPath);
    try {
      await Deno.stat(join(expanded, ".obsidian"));
      return expanded;
    } catch {
      console.log(
        `  Not a valid Obsidian vault (no .obsidian/ folder found at ${expanded})`,
      );
      console.log("  Please enter the root folder of your Obsidian vault.");
    }
  }
}

async function selectObsidianClassification(): Promise<string> {
  return await Select.prompt({
    message: "Vault classification level",
    options: ["INTERNAL", "PUBLIC", "CONFIDENTIAL", "RESTRICTED"],
    default: "INTERNAL",
  });
}

async function collectObsidianConfig(): Promise<{
  obsidianVaultPath: string;
  obsidianClassification: string;
}> {
  const obsidianVaultPath = await promptValidObsidianVaultPath();
  const obsidianClassification = await selectObsidianClassification();
  console.log("  \u2713 Obsidian vault configured");
  return { obsidianVaultPath, obsidianClassification };
}

async function selectPluginChoices(): Promise<string[]> {
  return await Checkbox.prompt({
    message: "Which plugins would you like to configure?",
    options: [
      { name: "Obsidian (local vault integration)", value: "obsidian" },
    ],
  });
}

async function promptPluginStep(): Promise<PluginResult> {
  console.log("  Step 4/8: Configure optional plugins");
  console.log("");

  const selectedPlugins = await selectPluginChoices();
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

function printGoogleConsentScreenWarning(): void {
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
}

function printGoogleOAuthCredentialSteps(): void {
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
  printGoogleConsentScreenWarning();
  console.log(
    '    6. On the Create OAuth client ID screen, select "Desktop app" from',
  );
  console.log("       the Application type dropdown");
  console.log('    7. Name it "Triggerfish" (or anything you like)');
  console.log(
    "    8. Click Create, then copy the Client ID and Client Secret",
  );
}

function printGoogleApiEnableSteps(): void {
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

function printGoogleWorkspaceInstructions(): void {
  printGoogleOAuthCredentialSteps();
  printGoogleApiEnableSteps();
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

async function offerGoogleOAuthConnection(): Promise<void> {
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
    await offerGoogleOAuthConnection();
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

async function fetchGitHubUser(
  token: string,
): Promise<Response> {
  return await fetch("https://api.github.com/user", {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}

async function storeGitHubPatInKeychain(
  token: string,
  login: string,
): Promise<void> {
  const store = createKeychain();
  const storeResult = await store.setSecret("github-pat", token);
  if (storeResult.ok) {
    console.log(`  \u2192 GitHub connected as ${login}!`);
  } else {
    console.log(
      `  \u2192 Token valid but failed to store: ${storeResult.error}`,
    );
    console.log("  \u2192 Try again later with: triggerfish connect github");
  }
}

async function handleGitHubTokenResponse(
  resp: Response,
  token: string,
): Promise<void> {
  if (resp.ok) {
    const user = await resp.json();
    await storeGitHubPatInKeychain(
      token,
      (user as Record<string, string>).login,
    );
  } else {
    console.log(
      "  \u2192 Token verification failed. Check permissions and try again.",
    );
    console.log("  \u2192 Connect later with: triggerfish connect github");
  }
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
    const resp = await fetchGitHubUser(trimmed);
    await handleGitHubTokenResponse(resp, trimmed);
  } catch {
    console.log("  \u2192 Could not reach GitHub API. Check your network.");
    console.log("  \u2192 Connect later with: triggerfish connect github");
  }
}

async function collectAndVerifyGitHubToken(): Promise<void> {
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
}

async function promptGitHubConnectionStep(): Promise<void> {
  console.log("  Step 6/8: Connect GitHub (optional)");
  console.log("");

  const connectGitHub = await Confirm.prompt({
    message: "Connect a GitHub account for repos, PRs, issues, and Actions?",
    default: false,
  });

  if (connectGitHub) {
    await collectAndVerifyGitHubToken();
  } else {
    console.log(
      "  \u2192 Skipped. Connect later with: triggerfish connect github",
    );
  }

  console.log("");
}

// ── Step 7: Search Provider ───────────────────────────────────────────────────

async function selectSearchProvider(): Promise<SearchProviderChoice> {
  return (await Select.prompt({
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
}

async function collectBraveSearchConfig(): Promise<string> {
  const searchApiKey = await Input.prompt({
    message: "Brave Search API key (or press Enter to configure later)",
  });
  if (searchApiKey.length > 0) {
    console.log("  \u2713 API key saved to config");
  } else {
    console.log(
      "  \u2192 Skipped. Set later with: triggerfish config set web.search.api_key <key>",
    );
  }
  return searchApiKey;
}

async function collectSearxngConfig(): Promise<string> {
  return await Input.prompt({
    message: "SearXNG instance URL",
    default: "http://localhost:8888",
  });
}

async function promptSearchProviderStep(): Promise<SearchProviderResult> {
  console.log("  Step 7/8: Set up web search");
  console.log("");

  const searchProvider = await selectSearchProvider();
  let searchApiKey = "";
  let searxngUrl = "";

  if (searchProvider === "brave") {
    searchApiKey = await collectBraveSearchConfig();
  } else if (searchProvider === "searxng") {
    searxngUrl = await collectSearxngConfig();
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

function printDaemonStartHint(installDaemon: boolean): void {
  if (installDaemon) {
    console.log("  Starting Triggerfish daemon...");
  } else {
    console.log("  To start Triggerfish later:");
    console.log("    triggerfish start    # Background daemon");
    console.log("    triggerfish run      # Foreground (debug)");
  }
}

function printNextStepsHint(spinePath: string, configPath: string): void {
  console.log("");
  console.log(`  Edit your agent's identity: ${spinePath}`);
  console.log(`  Edit configuration:         ${configPath}`);
  console.log("  Run health check:           triggerfish patrol");
  console.log("  Connect integrations:       triggerfish connect google");
  console.log("                              triggerfish connect github");
  console.log("");
}

function printCompletionSummary(options: {
  installDaemon: boolean;
  apiKeyPresent: boolean;
  spinePath: string;
  configPath: string;
}): void {
  if (options.apiKeyPresent) {
    console.log(
      "  \u2713 API key stored in OS keychain. triggerfish.yaml references it by name.",
    );
  }
  console.log("");
  console.log("  \u2713 Setup complete!");
  console.log("");
  printDaemonStartHint(options.installDaemon);
  printNextStepsHint(options.spinePath, options.configPath);
}

async function writeConfigAndSpineFiles(
  baseDir: string,
  answers: WizardAnswers,
): Promise<{ configPath: string; spinePath: string }> {
  const configPath = join(baseDir, "triggerfish.yaml");
  const spinePath = join(baseDir, "SPINE.md");

  const configContent = generateConfig(answers);
  await Deno.writeTextFile(configPath, configContent);
  console.log(`  \u2713 Created: ${configPath}`);

  const spineContent = generateSpine(answers);
  await Deno.writeTextFile(spinePath, spineContent);
  console.log(`  \u2713 Created: ${spinePath}`);

  return { configPath, spinePath };
}

async function writeWizardOutputFiles(
  baseDir: string,
  answers: WizardAnswers,
): Promise<{ configPath: string; spinePath: string }> {
  await createDirectoryTree(baseDir);

  const storedKeys = await storeWizardSecrets(answers);
  if (storedKeys.length > 0) {
    console.log(
      `  \u2713 Secrets stored in OS keychain (${storedKeys.length} key(s))`,
    );
  }

  const paths = await writeConfigAndSpineFiles(baseDir, answers);
  await writeTriggerFile(baseDir);

  printCompletionSummary({
    installDaemon: answers.installDaemon,
    apiKeyPresent: answers.apiKey.length > 0,
    spinePath: paths.spinePath,
    configPath: paths.configPath,
  });

  return paths;
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

function mapLlmToAnswerFields(llm: LlmProviderResult): Partial<WizardAnswers> {
  return {
    provider: llm.provider,
    providerModel: llm.providerModel,
    apiKey: llm.apiKey,
    localEndpoint: llm.localEndpoint,
  };
}

function mapIdentityToAnswerFields(
  identity: AgentIdentityResult,
): Partial<WizardAnswers> {
  return {
    agentName: identity.agentName,
    mission: identity.mission,
    tone: identity.tone,
    customTone: identity.customTone,
  };
}

function mapPluginsToAnswerFields(
  plugins: PluginResult,
): Partial<WizardAnswers> {
  return {
    selectedPlugins: plugins.selectedPlugins,
    obsidianVaultPath: plugins.obsidianVaultPath,
    obsidianClassification: plugins.obsidianClassification,
  };
}

function assembleWizardAnswers(options: {
  llm: LlmProviderResult;
  identity: AgentIdentityResult;
  channelSelection: ChannelSelectionResult;
  plugins: PluginResult;
  search: SearchProviderResult;
  installDaemon: boolean;
}): WizardAnswers {
  return {
    ...mapLlmToAnswerFields(options.llm),
    ...mapIdentityToAnswerFields(options.identity),
    ...options.channelSelection,
    ...mapPluginsToAnswerFields(options.plugins),
    ...options.search,
    installDaemon: options.installDaemon,
  } as WizardAnswers;
}

// ── Public API ────────────────────────────────────────────────────────────────

async function promptDaemonInstallStep(): Promise<boolean> {
  console.log("  Step 8/8: Install as daemon?");
  console.log("");
  const installDaemon = await Confirm.prompt({
    message: "Start on login and run in background?",
    default: true,
  });
  console.log("");
  return installDaemon;
}

async function collectAllWizardSteps(
  baseDir: string,
): Promise<WizardAnswers> {
  const llm = await promptLlmProviderStep();
  console.log("");

  const spinePath = join(baseDir, "SPINE.md");
  const identity = await promptAgentIdentityStep(spinePath);
  const channelSelection = await promptChannelSelectionStep();
  const plugins = await promptPluginStep();

  await promptGoogleWorkspaceStep();
  await promptGitHubConnectionStep();

  const search = await promptSearchProviderStep();
  const installDaemon = await promptDaemonInstallStep();

  return assembleWizardAnswers({
    llm,
    identity,
    channelSelection,
    plugins,
    search,
    installDaemon,
  });
}

function buildDiveResult(
  answers: WizardAnswers,
  configPath: string,
  spinePath: string,
): DiveResult {
  return {
    configPath,
    spinePath,
    installDaemon: answers.installDaemon,
    channels: answers.channels.filter((c) => c !== "skip"),
  };
}

/** Run the full 9-step interactive dive wizard. */
export async function runWizard(baseDir: string): Promise<DiveResult> {
  enforceTerminalRequirement();
  printWelcomeBanner();

  const answers = await collectAllWizardSteps(baseDir);
  const { configPath, spinePath } = await writeWizardOutputFiles(
    baseDir,
    answers,
  );
  return buildDiveResult(answers, configPath, spinePath);
}
