/**
 * Tailscale tunnel provider implementation.
 *
 * Creates a {@link TunnelService} that manages connectivity through
 * the Tailscale daemon via `tailscale up`, `tailscale down`, and
 * `tailscale status --json`.
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

/** JSON shape returned by `tailscale status --json`. */
interface TailscaleStatusJson {
  readonly BackendState?: string;
  readonly Self?: {
    readonly TailscaleIPs?: readonly string[];
    readonly Online?: boolean;
  };
}

/** Build the argument list for `tailscale up`. */
function buildTailscaleUpArgs(config: TunnelConfig): string[] {
  const args: string[] = ["up"];
  if (config.hostname) {
    args.push(`--hostname=${config.hostname}`);
  }
  if (config.authKey) {
    args.push(`--authkey=${config.authKey}`);
  }
  return args;
}

/**
 * Parse the JSON blob produced by `tailscale status --json` and
 * extract the first Tailscale IP.
 */
function parseTailscaleStatus(raw: string): Result<string, string> {
  let json: TailscaleStatusJson;
  try {
    json = JSON.parse(raw) as TailscaleStatusJson;
  } catch {
    return { ok: false, error: "Failed to parse tailscale status JSON" };
  }

  const ips = json.Self?.TailscaleIPs;
  if (!ips || ips.length === 0) {
    return { ok: false, error: "No Tailscale IPs found in status output" };
  }
  return { ok: true, value: ips[0] };
}

/** Fetch and parse the Tailscale IP from `tailscale status --json`. */
async function fetchTailscaleIp(
  runner: CommandRunner,
): Promise<Result<string, string>> {
  const statusResult = await runner.runCommand("tailscale", [
    "status",
    "--json",
  ]);
  if (!statusResult.success) {
    return {
      ok: false,
      error:
        `tailscale status failed (code ${statusResult.code}): ${statusResult.stderr}`,
    };
  }
  return parseTailscaleStatus(statusResult.stdout);
}

/** Build a URL string from a Tailscale IP and gateway port. */
function formatTailscaleUrl(ip: string, port: number): string {
  return `http://${ip}:${port}`;
}

/**
 * Create a {@link TunnelService} backed by the Tailscale daemon.
 *
 * @param config - Tunnel configuration with provider "tailscale".
 * @param runner - Command runner for executing tailscale CLI commands.
 */
export function createTailscaleService(
  config: TunnelConfig,
  runner: CommandRunner,
): TunnelService {
  return {
    async enable(): Promise<Result<string, string>> {
      const upArgs = buildTailscaleUpArgs(config);
      const upResult = await runner.runCommand("tailscale", upArgs);
      if (!upResult.success) {
        return {
          ok: false,
          error:
            `tailscale up failed (code ${upResult.code}): ${upResult.stderr}`,
        };
      }

      const parsed = await fetchTailscaleIp(runner);
      if (!parsed.ok) {
        return parsed;
      }
      return {
        ok: true,
        value: formatTailscaleUrl(parsed.value, config.gatewayPort),
      };
    },

    async disable(): Promise<Result<void, string>> {
      const result = await runner.runCommand("tailscale", ["down"]);
      if (!result.success) {
        return {
          ok: false,
          error:
            `tailscale down failed (code ${result.code}): ${result.stderr}`,
        };
      }
      return { ok: true, value: undefined };
    },

    async status(): Promise<TunnelStatus> {
      const parsed = await fetchTailscaleIp(runner);
      if (!parsed.ok) {
        return {
          connected: false,
          provider: "tailscale",
          error: parsed.error,
        };
      }
      return {
        connected: true,
        provider: "tailscale",
        ip: parsed.value,
        url: formatTailscaleUrl(parsed.value, config.gatewayPort),
        since: new Date(),
      };
    },
  };
}
