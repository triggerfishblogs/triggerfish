/**
 * WireGuard tunnel provider implementation.
 *
 * Creates a {@link TunnelService} that manages connectivity through
 * WireGuard via `wg-quick up/down` and `wg show`.
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

/** WireGuard interface name used by Triggerfish. */
const WG_INTERFACE = "wg-triggerfish";

/**
 * Parse the output of `wg show <iface>` looking for an endpoint IP.
 *
 * The output typically contains lines like:
 *   endpoint: 198.51.100.1:51820
 *
 * Returns the IP portion (without port) or null.
 */
function parseWgShowEndpoint(raw: string): string | null {
  const match = raw.match(/endpoint:\s*([^:\s]+)/i);
  return match ? match[1] : null;
}

/** Build a URL from the WireGuard endpoint IP and gateway port. */
function formatWireguardUrl(ip: string | null, port: number): string {
  if (ip) {
    return `http://${ip}:${port}`;
  }
  return `wireguard://${WG_INTERFACE}:${port}`;
}

/** Query the WireGuard interface and extract the endpoint IP. */
async function fetchWireguardEndpoint(
  runner: CommandRunner,
): Promise<string | null> {
  const showResult = await runner.runCommand("wg", ["show", WG_INTERFACE]);
  if (!showResult.success) {
    return null;
  }
  return parseWgShowEndpoint(showResult.stdout);
}

/**
 * Create a {@link TunnelService} backed by WireGuard.
 *
 * @param config - Tunnel configuration with provider "wireguard".
 * @param runner - Command runner for executing wg/wg-quick CLI commands.
 */
export function createWireGuardService(
  config: TunnelConfig,
  runner: CommandRunner,
): TunnelService {
  return {
    async enable(): Promise<Result<string, string>> {
      const result = await runner.runCommand("wg-quick", ["up", WG_INTERFACE]);
      if (!result.success) {
        return {
          ok: false,
          error: `wg-quick up failed (code ${result.code}): ${result.stderr}`,
        };
      }

      const ip = await fetchWireguardEndpoint(runner);
      return { ok: true, value: formatWireguardUrl(ip, config.gatewayPort) };
    },

    async disable(): Promise<Result<void, string>> {
      const result = await runner.runCommand("wg-quick", [
        "down",
        WG_INTERFACE,
      ]);
      if (!result.success) {
        return {
          ok: false,
          error: `wg-quick down failed (code ${result.code}): ${result.stderr}`,
        };
      }
      return { ok: true, value: undefined };
    },

    async status(): Promise<TunnelStatus> {
      const result = await runner.runCommand("wg", ["show", WG_INTERFACE]);
      if (!result.success) {
        return {
          connected: false,
          provider: "wireguard",
          error: result.stderr || "WireGuard interface not active",
        };
      }

      const ip = parseWgShowEndpoint(result.stdout);
      return {
        connected: true,
        provider: "wireguard",
        ip: ip ?? undefined,
        url: formatWireguardUrl(ip, config.gatewayPort),
        since: new Date(),
      };
    },
  };
}
