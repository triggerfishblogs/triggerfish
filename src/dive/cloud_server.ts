/**
 * Triggerfish Gateway callback server and browser opener.
 *
 * Provides the local HTTP server that receives license keys from
 * the cloud gateway callback, and the platform-specific browser opener.
 *
 * @module
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Production gateway URL. */
export const PRODUCTION_GATEWAY_URL = "https://api.trigger.fish";

/** Sandbox gateway URL (for tf_test_ keys). */
export const SANDBOX_GATEWAY_URL = "https://triggerfish-cloud-sandbox.fly.dev";

// ─── Types ────────────────────────────────────────────────────────────────────

/** Result of a callback server awaiting a license key. */
export interface CallbackServer {
  /** Port the server is listening on. */
  readonly port: number;
  /** Resolves with the license key when callback is received. */
  readonly keyPromise: Promise<string>;
  /** Close the server. */
  readonly close: () => void;
}

// ─── Callback Server ──────────────────────────────────────────────────────────

/**
 * Start a local HTTP server to receive the license key callback.
 *
 * The cloud gateway redirects the user's browser to
 * `http://127.0.0.1:PORT/callback?key=tf_...&flow_id=...` after checkout
 * or magic link. This server catches that redirect and extracts the key.
 *
 * @param signal - Optional abort signal to stop the server
 * @param expectedFlowId - Flow ID to validate on the callback (prevents local theft)
 * @returns A CallbackServer with port, key promise, and close function
 */
export function startCallbackServer(
  signal?: AbortSignal,
  expectedFlowId?: string,
): CallbackServer {
  let resolveKey: (key: string) => void;
  let rejectKey: (err: Error) => void;
  const keyPromise = new Promise<string>((resolve, reject) => {
    resolveKey = resolve;
    rejectKey = reject;
  });

  const server = Deno.serve(
    { port: 0, hostname: "127.0.0.1", signal, onListen: () => {} },
    (req) => {
      const url = new URL(req.url);
      if (url.pathname === "/callback") {
        const key = url.searchParams.get("key");
        const flowId = url.searchParams.get("flow_id");
        if (expectedFlowId && flowId !== expectedFlowId) {
          return new Response("Invalid flow", { status: 403 });
        }
        if (key && key.length > 0) {
          resolveKey!(key);
          const html = "<html><body><h2>Triggerfish setup complete!</h2>" +
            "<p>You can close this tab and return to the terminal.</p>" +
            "</body></html>";
          return new Response(html, {
            headers: { "Content-Type": "text/html" },
          });
        }
      }
      return new Response("Not found", { status: 404 });
    },
  );

  const addr = server.addr as Deno.NetAddr;

  // If aborted before key arrives, silently reject (callers use Promise.race)
  signal?.addEventListener("abort", () => {
    rejectKey!(new Error("Callback server aborted"));
  });

  // Prevent unhandled rejection when abort fires after no one is awaiting
  keyPromise.catch((_: unknown) => {
    // Intentional no-op: callers use Promise.race and may not await keyPromise.
    // The abort error is expected and already logged at the abort site.
  });

  return {
    port: addr.port,
    keyPromise,
    close: () => server.shutdown(),
  };
}

// ─── Gateway URL Resolution ──────────────────────────────────────────────────

/**
 * Determine the gateway URL based on a license key prefix.
 *
 * Keys prefixed with `tf_test_` use the sandbox gateway.
 * All other keys use the production gateway.
 */
export function resolveGatewayUrl(licenseKey: string): string {
  if (licenseKey.startsWith("tf_test_")) {
    return SANDBOX_GATEWAY_URL;
  }
  return PRODUCTION_GATEWAY_URL;
}

// ─── Browser Opener ───────────────────────────────────────────────────────────

/**
 * Open a URL in the user's default browser.
 *
 * Uses platform-specific commands: `open` (macOS), `xdg-open` (Linux),
 * `start` (Windows).
 */
export async function openInBrowser(url: string): Promise<void> {
  const os = Deno.build.os;
  const cmd = os === "darwin"
    ? ["open", url]
    : os === "windows"
    ? ["cmd", "/c", "start", url]
    : ["xdg-open", url];

  const command = new Deno.Command(cmd[0], {
    args: cmd.slice(1),
    stdout: "null",
    stderr: "null",
  });
  const child = command.spawn();
  await child.status;
}
