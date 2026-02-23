/**
 * Integration steps for the dive wizard.
 *
 * Handles Google Workspace OAuth, GitHub PAT connection,
 * and search provider selection (Brave / SearXNG).
 *
 * @module
 */

import { Confirm, Input, Select } from "@cliffy/prompt";

import { createKeychain } from "../core/secrets/keychain.ts";

import type { SearchProviderChoice } from "./wizard_types.ts";

// ── Result type ───────────────────────────────────────────────────────────────

/** Result of the search provider selection step. */
export interface SearchProviderResult {
  readonly searchProvider: SearchProviderChoice;
  readonly searchApiKey: string;
  readonly searxngUrl: string;
}

// ── Step 5: Google Workspace ──────────────────────────────────────────────────

/** Print the full Google Workspace setup instructions. */
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

/** Attempt the Google OAuth flow via the CLI connect command. */
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

/** Offer to connect Google OAuth now or defer to later. */
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

/** Run the Google Workspace connection wizard step (Step 5/8). */
export async function promptGoogleWorkspaceStep(): Promise<void> {
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

/** Print the GitHub fine-grained PAT creation instructions. */
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

/** Fetch the authenticated GitHub user to verify a PAT. */
async function fetchGitHubUser(token: string): Promise<Response> {
  return await fetch("https://api.github.com/user", {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}

/** Store a verified GitHub PAT in the OS keychain. */
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

/** Handle the GitHub API response after verifying a PAT. */
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

/** Verify a GitHub PAT against the API and store it on success. */
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

/** Offer to collect and verify a GitHub PAT, or defer. */
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

/** Run the GitHub connection wizard step (Step 6/8). */
export async function promptGitHubConnectionStep(): Promise<void> {
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
/** Prompt the user to choose a search provider. */
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

/** Collect the Brave Search API key. */
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

/** Collect the SearXNG instance URL. */
async function collectSearxngConfig(): Promise<string> {
  return await Input.prompt({
    message: "SearXNG instance URL",
    default: "http://localhost:8888",
  });
}

/** Run the search provider selection wizard step (Step 7/8). */
export async function promptSearchProviderStep(): Promise<SearchProviderResult> {
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
