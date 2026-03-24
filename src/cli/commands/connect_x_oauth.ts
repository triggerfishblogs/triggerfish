/**
 * X (Twitter) OAuth 2.0 PKCE helpers: callback server, credential
 * prompting, user verification, and URI utilities.
 *
 * Extracted from connect_x.ts to keep each file under 300 lines.
 *
 * @module
 */

import { Input } from "@cliffy/prompt";
import type { SecretStore } from "../../core/secrets/keychain/keychain.ts";
import { createLogger } from "../../core/logger/mod.ts";

const log = createLogger("cli.connect-x-oauth");

// console.log is used intentionally throughout this file for interactive CLI
// output (user-facing prompts and results). Daemon logging uses `log.*`.

/** HTML page shown after successful OAuth callback. */
export const OAUTH_SUCCESS_HTML = `<!DOCTYPE html>
<html><head><title>Triggerfish</title>
<style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f5f5f5}
.card{text-align:center;padding:2rem;background:white;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
h1{color:#22c55e;margin-bottom:0.5rem}p{color:#666}</style></head>
<body><div class="card"><h1>Connected</h1><p>X account linked to Triggerfish.<br>You can close this window.</p></div></body></html>`;

// ─── OAuth callback server ───────────────────────────────────────────────────

/** Build the OAuth callback HTTP request handler. */
export function buildXOAuthRequestHandler(
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
export function createXOAuthCallbackServer(
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
export async function loadStoredClientId(
  store: SecretStore,
): Promise<string | null> {
  const result = await store.getSecret("x:client_id");
  return result.ok ? result.value : null;
}

/** Prompt for X OAuth Client ID. Returns null if cancelled. */
export async function promptXClientId(
  store: SecretStore,
): Promise<string | null> {
  const stored = await loadStoredClientId(store);
  if (stored) {
    console.log(
      `Using existing X Client ID from keychain (${stored.slice(0, 8)}...).`,
    );
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
export async function fetchAndStoreXUser(
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

// ─── URI utilities ───────────────────────────────────────────────────────────

/** Extract the port from a redirect URI. */
export function extractPort(redirectUri: string): number {
  try {
    return new URL(redirectUri).port
      ? parseInt(new URL(redirectUri).port, 10)
      : 3000;
  } catch {
    return 3000;
  }
}
