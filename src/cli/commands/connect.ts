/**
 * CLI connect / disconnect commands.
 *
 * Provides GOOGLE_SCOPES, createOAuthCallbackServer, performGoogleOAuth,
 * runConnectGoogle, runConnectGithub, runConnect, runDisconnect.
 * @module
 */

import { Input } from "@cliffy/prompt";
import { createKeychain } from "../../core/secrets/keychain.ts";
import type { SecretStore } from "../../core/secrets/keychain.ts";
import { createGoogleAuthManager } from "../../integrations/google/mod.ts";
import type { GoogleAuthConfig } from "../../integrations/google/mod.ts";

/** Google OAuth2 scopes for all Workspace services. */
export const GOOGLE_SCOPES: readonly string[] = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/tasks",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/spreadsheets",
];

/** HTML page shown after successful OAuth callback. */
export const OAUTH_SUCCESS_HTML = `<!DOCTYPE html>
<html><head><title>Triggerfish</title>
<style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f5f5f5}
.card{text-align:center;padding:2rem;background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
h1{color:#22c55e;margin-bottom:0.5rem}p{color:#666}</style></head>
<body><div class="card"><h1>Connected</h1><p>Google account linked to Triggerfish.<br>You can close this window.</p></div></body></html>`;

/** Build the OAuth callback HTTP request handler. */
function buildOAuthRequestHandler(
  resolveCode: (code: string) => void,
  rejectCode: (err: Error) => void,
): (req: Request) => Response {
  return (req: Request): Response => {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");

    if (error) {
      rejectCode(new Error(`Google returned error: ${error}`));
      return new Response(
        "Authorization failed. You can close this window.",
        { status: 400, headers: { "Content-Type": "text/plain" } },
      );
    }
    if (code) {
      resolveCode(code);
      return new Response(OAUTH_SUCCESS_HTML, {
        headers: { "Content-Type": "text/html" },
      });
    }
    return new Response("Waiting for OAuth callback...", {
      headers: { "Content-Type": "text/plain" },
    });
  };
}

/**
 * Create a temporary localhost server that captures the OAuth callback code.
 *
 * Returns the server, its port, and a promise that resolves with the auth code.
 */
export function createOAuthCallbackServer(): {
  server: Deno.HttpServer;
  port: number;
  codePromise: Promise<string>;
} {
  let resolveCode: (code: string) => void;
  let rejectCode: (err: Error) => void;
  const codePromise = new Promise<string>((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  const handler = buildOAuthRequestHandler(resolveCode!, rejectCode!);
  const server = Deno.serve(
    { hostname: "127.0.0.1", port: 0, onListen() {} },
    handler,
  );
  const addr = server.addr as Deno.NetAddr;

  const timeout = setTimeout(() => {
    rejectCode(new Error("OAuth callback timed out after 5 minutes"));
  }, 5 * 60 * 1000);
  codePromise.finally(() => clearTimeout(timeout));

  return { server, port: addr.port, codePromise };
}

/** Prompt for Google OAuth client credentials. Returns null if cancelled. */
async function promptGoogleCredentials(): Promise<
  {
    clientId: string;
    clientSecret: string;
  } | null
> {
  const clientId = await Input.prompt({ message: "Google OAuth Client ID" });
  if (!clientId.trim()) {
    console.log("Client ID is required.");
    return null;
  }
  const clientSecret = await Input.prompt({
    message: "Google OAuth Client Secret",
  });
  if (!clientSecret.trim()) {
    console.log("Client Secret is required.");
    return null;
  }
  return { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
}

/** Wait for the OAuth callback code, racing against server shutdown. */
async function awaitOAuthCode(
  codePromise: Promise<string>,
  server: Deno.HttpServer,
): Promise<string> {
  return Promise.race([
    codePromise,
    server.finished.then(() => {
      throw new Error("OAuth callback server stopped unexpectedly");
    }),
  ]);
}

/**
 * Run the Google OAuth2 flow: prompt for credentials, open browser, exchange code.
 *
 * Shared by both `triggerfish connect google` and the dive wizard.
 *
 * @param secretStore - Where to store tokens (defaults to OS keychain)
 */
export async function performGoogleOAuth(
  secretStore?: SecretStore,
): Promise<boolean> {
  const creds = await promptGoogleCredentials();
  if (!creds) return false;

  const store = secretStore ?? createKeychain();
  const authManager = createGoogleAuthManager(store);
  const { server, port, codePromise } = createOAuthCallbackServer();
  const keepAlive = setInterval(() => {}, 60_000);

  try {
    const config: GoogleAuthConfig = {
      clientId: creds.clientId,
      clientSecret: creds.clientSecret,
      redirectUri: `http://127.0.0.1:${port}`,
      scopes: GOOGLE_SCOPES,
    };

    const consentUrl = authManager.getConsentUrl(config);
    console.log("\nOpen this URL in your browser to authorize Triggerfish:\n");
    console.log(`  ${consentUrl}\n`);
    console.log("Waiting for authorization...\n");

    const code = await awaitOAuthCode(codePromise, server);
    console.log("Authorization received. Exchanging code for tokens...");
    const result = await authManager.exchangeCode(code, config);

    if (result.ok) {
      console.log("\nGoogle account connected successfully.");
      console.log(
        "Your agent can now use Gmail, Calendar, Tasks, Drive, and Sheets.",
      );
      return true;
    } else {
      console.log(`\nFailed to connect: ${result.error.message}`);
      console.log(
        "Please verify your Client ID and Client Secret, then try again.",
      );
      return false;
    }
  } finally {
    clearInterval(keepAlive);
    await server.shutdown();
  }
}

/** Print the OAuth credential creation steps. */
function printOAuthCredentialSteps(): void {
  console.log("  Quick setup:");
  console.log("    1. Go to https://console.cloud.google.com ");
  console.log("    2. Create a project (or select an existing one)");
  console.log('    3. Navigate to "APIs & Services" → "Credentials"');
  console.log(
    '    4. Click "+ CREATE CREDENTIALS" and select "OAuth client ID"',
  );
  console.log("    5. If prompted, configure the OAuth consent screen first");
  console.log(
    "       IMPORTANT: Add yourself as a test user on the consent screen,",
  );
  console.log('       or you\'ll get "Access blocked" when authorizing.');
  console.log(
    "       Full walkthrough: https://trigger.fish/integrations/google-workspace.html#google-workspace",
  );
  console.log(
    '    6. On the Create OAuth client ID screen, select "Desktop app" from',
  );
  console.log("       the Application type dropdown");
  console.log('    7. Name it "Triggerfish" (or anything you like)');
  console.log(
    "    8. Click Create, then copy the Client ID and Client Secret\n",
  );
}

/** Print the required Google API list. */
function printRequiredGoogleApis(): void {
  console.log("  You'll also need to enable these APIs in your project:");
  console.log("    • Gmail API");
  console.log("    • Google Calendar API");
  console.log("    • Google Tasks API");
  console.log("    • Google Drive API");
  console.log("    • Google Sheets API");
  console.log(
    "  Enable them at: https://console.cloud.google.com/apis/library\n",
  );
}

/** Print Google Workspace OAuth setup instructions. */
function printGoogleSetupInstructions(): void {
  console.log("Connect Google Workspace\n");
  console.log(
    "This will connect your Google account for Gmail, Calendar, Tasks, Drive, and Sheets.\n",
  );
  console.log("You'll need OAuth2 credentials from Google Cloud Console.\n");
  printOAuthCredentialSteps();
  printRequiredGoogleApis();
}

/**
 * Interactive Google OAuth2 authentication flow.
 */
export async function runConnectGoogle(): Promise<void> {
  printGoogleSetupInstructions();
  await performGoogleOAuth();
}

/** Print GitHub PAT setup instructions. */
function printGithubSetupInstructions(): void {
  console.log("Connect GitHub\n");
  console.log(
    "This will connect your GitHub account for repos, PRs, issues, and Actions.\n",
  );
  console.log("You need a Personal Access Token (PAT) from GitHub.\n");
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
  console.log("    6. Click Generate token and copy it\n");
}

/** Fetch the GitHub user endpoint with a PAT. */
function fetchGithubUser(token: string): Promise<Response> {
  return fetch("https://api.github.com/user", {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
}

/** Report a failed GitHub token verification. */
async function reportGithubTokenFailure(resp: Response): Promise<null> {
  const body = await resp.json().catch(
    () => ({}) as Record<string, unknown>,
  );
  console.log(
    `\nToken verification failed (${resp.status}): ${
      (body as Record<string, string>).message ?? "Unknown error"
    }`,
  );
  console.log(
    "Check that your token is correct and has the required permissions.",
  );
  return null;
}

/** Verify a GitHub PAT against the API. Returns login name or null on failure. */
async function verifyGithubToken(token: string): Promise<string | null> {
  try {
    const resp = await fetchGithubUser(token);
    if (!resp.ok) return await reportGithubTokenFailure(resp);
    const user = await resp.json();
    return (user as Record<string, string>).login;
  } catch (err: unknown) {
    console.log(
      `\nCould not reach GitHub API: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    console.log("Check your network connection and try again.");
    return null;
  }
}

/** Prompt for a GitHub PAT and warn if it looks malformed. Returns trimmed token or null. */
async function promptGithubToken(): Promise<string | null> {
  const token = await Input.prompt({ message: "Paste your token" });
  if (!token.trim()) {
    console.log("No token provided. Aborted.");
    return null;
  }
  const trimmed = token.trim();
  if (!trimmed.startsWith("ghp_") && !trimmed.startsWith("github_pat_")) {
    console.log(
      "Warning: token doesn't look like a GitHub PAT (expected ghp_... or github_pat_...)",
    );
    console.log("Continuing anyway...\n");
  }
  return trimmed;
}

/** Store a verified GitHub PAT in the OS keychain. */
async function storeGithubToken(token: string): Promise<boolean> {
  const secretStore = createKeychain();
  const result = await secretStore.setSecret("github-pat", token);
  if (!result.ok) {
    console.log(`\nFailed to store token: ${result.error}`);
    return false;
  }
  console.log(
    "GitHub connected. Your agent can now use repos, PRs, issues, and Actions.",
  );
  return true;
}

/**
 * Interactive GitHub PAT setup flow.
 */
export async function runConnectGithub(): Promise<void> {
  printGithubSetupInstructions();
  const trimmed = await promptGithubToken();
  if (!trimmed) return;

  console.log("Verifying token...");
  const login = await verifyGithubToken(trimmed);
  if (login === null) return;
  console.log(`\nAuthenticated as: ${login}`);

  await storeGithubToken(trimmed);
}

/**
 * Handle `triggerfish connect <service>`.
 */
export async function runConnect(
  subcommand: string | undefined,
  _flags: Readonly<Record<string, boolean | string>>,
): Promise<void> {
  switch (subcommand) {
    case "google":
      await runConnectGoogle();
      break;
    case "github":
      await runConnectGithub();
      break;
    default:
      console.log(`
CONNECT USAGE:
  triggerfish connect google    Authenticate with Google Workspace
  triggerfish connect github    Authenticate with GitHub
`);
      break;
  }
}

/**
 * Handle `triggerfish disconnect <service>`.
 */
export async function runDisconnect(
  subcommand: string | undefined,
  _flags: Readonly<Record<string, boolean | string>>,
): Promise<void> {
  switch (subcommand) {
    case "google": {
      const secretStore = createKeychain();
      const authManager = createGoogleAuthManager(secretStore);
      const hadTokens = await authManager.hasTokens();
      await authManager.clearTokens();
      if (hadTokens) {
        console.log(
          "Google account disconnected. Tokens removed from keychain.",
        );
      } else {
        console.log("No Google account was connected.");
      }
      break;
    }
    case "github": {
      const secretStore = createKeychain();
      const result = await secretStore.deleteSecret("github-pat");
      if (result.ok) {
        console.log("GitHub disconnected. Token removed from keychain.");
      } else {
        console.log("No GitHub account was connected.");
      }
      break;
    }
    default:
      console.log(`
DISCONNECT USAGE:
  triggerfish disconnect google    Remove Google authentication
  triggerfish disconnect github    Remove GitHub authentication
`);
      break;
  }
}
