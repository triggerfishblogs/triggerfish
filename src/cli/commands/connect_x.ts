/**
 * X (Twitter) OAuth 2.0 PKCE connect/disconnect flow.
 *
 * Runs the full PKCE authorization: prompts for Client ID, opens browser
 * consent URL, captures the callback code via localhost server, exchanges
 * for tokens, fetches the authenticated user, and stores everything in
 * the OS keychain.
 *
 * @module
 */

import { Input } from "@cliffy/prompt";
import { createKeychain } from "../../core/secrets/keychain/keychain.ts";
import type { SecretStore } from "../../core/secrets/keychain/keychain.ts";
import { createXAuthManager } from "../../integrations/x/auth/auth.ts";
import type { XAuthConfig } from "../../integrations/x/auth/types_auth.ts";
import { createLogger } from "../../core/logger/mod.ts";

const log = createLogger("cli.connect-x");

// console.log is used intentionally throughout this file for interactive CLI
// output (user-facing prompts and results). Daemon logging uses `log.*`.

/** Default X OAuth 2.0 scopes for full integration access. */
export const X_SCOPES: readonly string[] = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "follows.read",
  "follows.write",
  "like.read",
  "like.write",
  "list.read",
  "list.write",
  "bookmark.read",
  "bookmark.write",
  "offline.access",
];

/** Default redirect URI for the PKCE callback. */
const DEFAULT_REDIRECT_URI = "http://127.0.0.1:3000/auth/x/callback";

/** HTML page shown after successful OAuth callback. */
const OAUTH_SUCCESS_HTML = `<!DOCTYPE html>
<html><head><title>Triggerfish</title>
<style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f5f5f5}
.card{text-align:center;padding:2rem;background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
h1{color:#22c55e;margin-bottom:0.5rem}p{color:#666}</style></head>
<body><div class="card"><h1>Connected</h1><p>X account linked to Triggerfish.<br>You can close this window.</p></div></body></html>`;

// ─── OAuth callback server ───────────────────────────────────────────────────

/** Build the OAuth callback HTTP request handler. */
function buildXOAuthRequestHandler(
  resolveCode: (code: string) => void,
  rejectCode: (err: Error) => void,
  expectedState: string,
): (req: Request) => Response {
  return (req: Request): Response => {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      const description = url.searchParams.get("error_description") ?? error;
      rejectCode(new Error(`X returned error: ${description}`));
      return new Response(
        "Authorization failed. You can close this window.",
        { status: 400, headers: { "Content-Type": "text/plain" } },
      );
    }

    if (state && state !== expectedState) {
      rejectCode(new Error("OAuth state mismatch — possible CSRF"));
      return new Response(
        "State mismatch. Authorization rejected.",
        { status: 400, headers: { "Content-Type": "text/plain" } },
      );
    }

    if (code) {
      resolveCode(code);
      return new Response(OAUTH_SUCCESS_HTML, {
        headers: { "Content-Type": "text/html" },
      });
    }
    return new Response("Waiting for X OAuth callback...", {
      headers: { "Content-Type": "text/plain" },
    });
  };
}

/** Create a temporary localhost server that captures the OAuth callback code. */
function createXOAuthCallbackServer(
  port: number,
  expectedState: string,
): {
  server: Deno.HttpServer;
  codePromise: Promise<string>;
} {
  let resolveCode: (code: string) => void;
  let rejectCode: (err: Error) => void;
  const codePromise = new Promise<string>((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  const handler = buildXOAuthRequestHandler(
    resolveCode!,
    rejectCode!,
    expectedState,
  );
  const server = Deno.serve(
    { hostname: "127.0.0.1", port, onListen() {} },
    handler,
  );

  const timeout = setTimeout(() => {
    rejectCode(new Error("X OAuth callback timed out after 5 minutes"));
  }, 5 * 60 * 1000);
  codePromise.finally(() => clearTimeout(timeout));

  return { server, codePromise };
}

// ─── Credential prompting ────────────────────────────────────────────────────

/** Load a previously stored X Client ID from the keychain. */
async function loadStoredClientId(store: SecretStore): Promise<string | null> {
  const result = await store.getSecret("x:client_id");
  return result.ok ? result.value : null;
}

/** Prompt for X OAuth Client ID. Returns null if cancelled. */
async function promptXClientId(
  store: SecretStore,
): Promise<string | null> {
  const stored = await loadStoredClientId(store);
  if (stored) {
    console.log(`Using existing X Client ID from keychain (${stored.slice(0, 8)}...).`);
    return stored;
  }
  const clientId = await Input.prompt({ message: "X OAuth Client ID" });
  if (!clientId.trim()) {
    console.log("Client ID is required.");
    return null;
  }
  const trimmed = clientId.trim();
  await store.setSecret("x:client_id", trimmed);
  return trimmed;
}

// ─── User verification ───────────────────────────────────────────────────────

/** Fetch and store the authenticated X user's ID and username. */
async function fetchAndStoreXUser(
  accessToken: string,
  store: SecretStore,
): Promise<string | null> {
  try {
    const resp = await fetch("https://api.twitter.com/2/users/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!resp.ok) {
      const body = await resp.text();
      log.error("X user verification failed", {
        operation: "fetchXUser",
        err: { status: resp.status, body },
      });
      console.log(`\nFailed to verify X user (HTTP ${resp.status}).`);
      return null;
    }
    const data = await resp.json();
    const user = (data as { data: { id: string; username: string } }).data;
    await store.setSecret("x:user_id", user.id);
    return user.username;
  } catch (err: unknown) {
    log.error("X user fetch failed", {
      operation: "fetchXUser",
      err,
    });
    console.log("\nCould not reach X API. Check your network connection.");
    return null;
  }
}

// ─── Main flow ───────────────────────────────────────────────────────────────

/** Extract the port from a redirect URI. */
function extractPort(redirectUri: string): number {
  try {
    return new URL(redirectUri).port ? parseInt(new URL(redirectUri).port, 10) : 3000;
  } catch {
    return 3000;
  }
}

/**
 * Run the X OAuth 2.0 PKCE flow.
 *
 * 1. Prompt for Client ID (or reuse stored)
 * 2. Generate PKCE code_verifier + code_challenge
 * 3. Open consent URL for user authorization
 * 4. Capture callback code via localhost server
 * 5. Exchange code for tokens
 * 6. Fetch authenticated user and store user ID
 */
export async function initiateXOAuth(
  secretStore?: SecretStore,
): Promise<boolean> {
  const store = secretStore ?? createKeychain();
  const clientId = await promptXClientId(store);
  if (!clientId) return false;

  const authManager = createXAuthManager(store);
  const redirectUri = DEFAULT_REDIRECT_URI;
  const port = extractPort(redirectUri);

  const config: XAuthConfig = {
    clientId,
    redirectUri,
    scopes: X_SCOPES,
  };

  const consentResult = await authManager.getConsentUrl(config);
  if (!consentResult.ok) {
    log.error("X consent URL generation failed", {
      operation: "connectX",
      err: consentResult.error,
    });
    console.log(`\nFailed to generate consent URL: ${consentResult.error.message}`);
    return false;
  }

  const { url, codeVerifier, state } = consentResult.value;
  const { server, codePromise } = createXOAuthCallbackServer(port, state);
  const keepAlive = setInterval(() => {}, 60_000);

  try {
    console.log("\nOpen this URL in your browser to authorize Triggerfish:\n");
    console.log(`  ${url}\n`);
    console.log("Waiting for authorization...\n");

    const code = await Promise.race([
      codePromise,
      server.finished.then(() => {
        throw new Error("OAuth callback server stopped unexpectedly");
      }),
    ]);

    console.log("Authorization received. Exchanging code for tokens...");
    const tokenResult = await authManager.exchangeCode(code, config, codeVerifier);

    if (!tokenResult.ok) {
      log.error("X token exchange failed", {
        operation: "connectX",
        err: tokenResult.error,
      });
      console.log(`\nFailed to exchange code: ${tokenResult.error.message}`);
      return false;
    }

    console.log("Tokens stored. Verifying user...");
    const username = await fetchAndStoreXUser(tokenResult.value, store);

    if (username) {
      console.log(`\nX account connected as @${username}.`);
      console.log(
        "Your agent can now post, search, engage, and manage lists.",
      );
      return true;
    } else {
      console.log("\nTokens saved but user verification failed.");
      console.log("X tools will attempt to work. You may need to reconnect.");
      return true;
    }
  } catch (err: unknown) {
    log.error("X OAuth flow failed", {
      operation: "connectX",
      err,
    });
    const message = err instanceof Error ? err.message : String(err);
    console.log(`\nX connection failed: ${message}`);
    return false;
  } finally {
    clearInterval(keepAlive);
    await server.shutdown();
  }
}

// ─── Setup instructions ──────────────────────────────────────────────────────

/** Print X developer app setup instructions. */
function printXSetupInstructions(): void {
  console.log("Connect X (Twitter)\n");
  console.log(
    "This will connect your X account for posting, searching, engagement, and lists.\n",
  );
  console.log(
    "You need an OAuth 2.0 Client ID from the X Developer Portal.\n",
  );
  console.log("  Quick setup:");
  console.log(
    "    1. Go to https://developer.x.com/en/portal/projects-and-apps",
  );
  console.log('    2. Create a project and app (or select existing)');
  console.log(
    '    3. Under "User authentication settings", click Set up',
  );
  console.log("    4. Enable OAuth 2.0");
  console.log('    5. Set Type of App to "Native App" (public client)');
  console.log(`    6. Set Callback URL to: ${DEFAULT_REDIRECT_URI}`);
  console.log(
    "    7. Copy the Client ID (from the OAuth 2.0 section, NOT the API Key)\n",
  );
  console.log("  Note: X OAuth 2.0 PKCE does not require a Client Secret.");
  console.log(
    "  You only need the Client ID.\n",
  );
}

/** Interactive X OAuth 2.0 PKCE authentication flow. */
export async function initializeXAuth(): Promise<void> {
  printXSetupInstructions();
  await initiateXOAuth();
}

/** Remove X tokens and user ID from the OS keychain. */
export async function disconnectX(): Promise<void> {
  const store = createKeychain();
  const authManager = createXAuthManager(store);
  const hadTokens = await authManager.hasTokens();
  await authManager.clearTokens();
  await store.deleteSecret("x:user_id");
  await store.deleteSecret("x:client_id");
  if (hadTokens) {
    console.log("X account disconnected. Tokens removed from keychain.");
  } else {
    console.log("No X account was connected.");
  }
}
