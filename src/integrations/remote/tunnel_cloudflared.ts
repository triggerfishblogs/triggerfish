/**
 * Cloudflare Tunnel (cloudflared) provider implementation.
 *
 * Creates a {@link TunnelService} that manages connectivity through
 * Cloudflare's `cloudflared tunnel` quick-tunnel mode.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import type {
  CommandRunner,
  TunnelConfig,
  TunnelService,
  TunnelStatus,
} from "./tunnel_types.ts";

/**
 * Attempt to extract the tunnel URL from cloudflared output.
 *
 * cloudflared typically emits a line like:
 *   https://some-random-name.trycloudflare.com
 */
function parseCloudflaredUrl(raw: string): string | null {
  const match = raw.match(/(https:\/\/[^\s]+\.trycloudflare\.com)/);
  return match ? match[1] : null;
}

/** Build a fallback URL when cloudflared does not emit a public URL. */
function formatCloudflaredFallback(port: number): string {
  return `cloudflared://localhost:${port}`;
}

/** Check whether a cloudflared process is currently running. */
async function isCloudflaredRunning(runner: CommandRunner): Promise<boolean> {
  const result = await runner.runCommand("pgrep", ["-f", "cloudflared"]);
  return result.success;
}

/**
 * Create a {@link TunnelService} backed by Cloudflare Tunnel.
 *
 * @param config - Tunnel configuration with provider "cloudflared".
 * @param runner - Command runner for executing cloudflared CLI commands.
 */
export function createCloudflaredService(
  config: TunnelConfig,
  runner: CommandRunner,
): TunnelService {
  let cloudflaredUrl: string | null = null;

  return {
    async enable(): Promise<Result<string, string>> {
      const result = await runner.runCommand("cloudflared", [
        "tunnel",
        "--url",
        `http://localhost:${config.gatewayPort}`,
      ]);
      if (!result.success) {
        return {
          ok: false,
          error:
            `cloudflared tunnel failed (code ${result.code}): ${result.stderr}`,
        };
      }

      const url = parseCloudflaredUrl(result.stdout + result.stderr);
      if (url) {
        cloudflaredUrl = url;
        return { ok: true, value: url };
      }

      const fallback = formatCloudflaredFallback(config.gatewayPort);
      cloudflaredUrl = fallback;
      return { ok: true, value: fallback };
    },

    async disable(): Promise<Result<void, string>> {
      const result = await runner.runCommand("pkill", ["-f", "cloudflared"]);
      cloudflaredUrl = null;
      if (!result.success && result.code !== 1) {
        return {
          ok: false,
          error:
            `pkill cloudflared failed (code ${result.code}): ${result.stderr}`,
        };
      }
      return { ok: true, value: undefined };
    },

    async status(): Promise<TunnelStatus> {
      const running = await isCloudflaredRunning(runner);
      if (!running) {
        cloudflaredUrl = null;
        return {
          connected: false,
          provider: "cloudflared",
        };
      }

      return {
        connected: true,
        provider: "cloudflared",
        url: cloudflaredUrl ?? undefined,
        since: new Date(),
      };
    },
  };
}
