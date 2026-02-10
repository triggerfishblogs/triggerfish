/**
 * Remote access tunnel management.
 *
 * Provides a unified interface for establishing remote tunnels to the
 * Triggerfish gateway using Tailscale, WireGuard, or Cloudflare Tunnel.
 * Commands are executed through an injectable {@link CommandRunner}
 * for testability.
 *
 * @module
 */

import type { Result } from "../core/types/classification.ts";

/** Supported tunnel provider types. */
export type TunnelProvider = "tailscale" | "wireguard" | "cloudflared";

/** Configuration for remote access tunnel. */
export interface TunnelConfig {
  /** Which tunnel provider to use. */
  readonly provider: TunnelProvider;
  /** Port the gateway is listening on. */
  readonly gatewayPort: number;
  /** Optional hostname for the tunnel endpoint. */
  readonly hostname?: string;
  /** Optional auth key (used by Tailscale). */
  readonly authKey?: string;
}

/** Status of a tunnel connection. */
export interface TunnelStatus {
  /** Whether the tunnel is currently connected. */
  readonly connected: boolean;
  /** Which provider this status applies to. */
  readonly provider: TunnelProvider;
  /** Public access URL when connected. */
  readonly url?: string;
  /** IP address assigned by the tunnel provider. */
  readonly ip?: string;
  /** When the tunnel was established. */
  readonly since?: Date;
  /** Error message if something went wrong. */
  readonly error?: string;
}

/** Result of running an external command. */
export interface CommandResult {
  /** Whether the command exited successfully (code 0). */
  readonly success: boolean;
  /** Captured standard output. */
  readonly stdout: string;
  /** Captured standard error. */
  readonly stderr: string;
  /** Process exit code. */
  readonly code: number;
}

/**
 * Injectable interface for executing external commands.
 *
 * Allows tests to substitute a mock implementation so no real
 * Tailscale/WireGuard/cloudflared binary is needed.
 */
export interface CommandRunner {
  /** Run a command with the given arguments. */
  run(cmd: string, args: readonly string[]): Promise<CommandResult>;
}

/**
 * Service for managing a single remote access tunnel.
 *
 * Each instance is bound to the provider specified in its config.
 */
export interface TunnelService {
  /** Enable the tunnel. Returns the access URL on success. */
  enable(): Promise<Result<string, string>>;
  /** Disable the tunnel. */
  disable(): Promise<Result<void, string>>;
  /** Get current tunnel status. */
  status(): Promise<TunnelStatus>;
}

/**
 * Create a {@link CommandRunner} backed by `Deno.Command`.
 *
 * This is the production runner used when no mock is injected.
 */
export function createDefaultCommandRunner(): CommandRunner {
  return {
    async run(cmd: string, args: readonly string[]): Promise<CommandResult> {
      const command = new Deno.Command(cmd, {
        args: [...args],
        stdout: "piped",
        stderr: "piped",
      });
      const output = await command.output();
      return {
        success: output.success,
        stdout: new TextDecoder().decode(output.stdout),
        stderr: new TextDecoder().decode(output.stderr),
        code: output.code,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Internal: Tailscale provider
// ---------------------------------------------------------------------------

/** JSON shape returned by `tailscale status --json`. */
interface TailscaleStatusJson {
  readonly BackendState?: string;
  readonly Self?: {
    readonly TailscaleIPs?: readonly string[];
    readonly Online?: boolean;
  };
}

function createTailscaleService(
  config: TunnelConfig,
  runner: CommandRunner,
): TunnelService {
  return {
    async enable(): Promise<Result<string, string>> {
      // Build `tailscale up` arguments.
      const upArgs: string[] = ["up"];
      if (config.hostname) {
        upArgs.push(`--hostname=${config.hostname}`);
      }
      if (config.authKey) {
        upArgs.push(`--authkey=${config.authKey}`);
      }

      const upResult = await runner.run("tailscale", upArgs);
      if (!upResult.success) {
        return {
          ok: false,
          error: `tailscale up failed (code ${upResult.code}): ${upResult.stderr}`,
        };
      }

      // Retrieve status to obtain the Tailscale IP.
      const statusResult = await runner.run("tailscale", [
        "status",
        "--json",
      ]);
      if (!statusResult.success) {
        return {
          ok: false,
          error: `tailscale status failed (code ${statusResult.code}): ${statusResult.stderr}`,
        };
      }

      const parsed = parseTailscaleStatus(statusResult.stdout);
      if (!parsed.ok) {
        return parsed;
      }

      const url = `http://${parsed.value}:${config.gatewayPort}`;
      return { ok: true, value: url };
    },

    async disable(): Promise<Result<void, string>> {
      const result = await runner.run("tailscale", ["down"]);
      if (!result.success) {
        return {
          ok: false,
          error: `tailscale down failed (code ${result.code}): ${result.stderr}`,
        };
      }
      return { ok: true, value: undefined };
    },

    async status(): Promise<TunnelStatus> {
      const result = await runner.run("tailscale", ["status", "--json"]);
      if (!result.success) {
        return {
          connected: false,
          provider: "tailscale",
          error: `tailscale status failed (code ${result.code}): ${result.stderr}`,
        };
      }

      const parsed = parseTailscaleStatus(result.stdout);
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
        url: `http://${parsed.value}:${config.gatewayPort}`,
        since: new Date(),
      };
    },
  };
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

// ---------------------------------------------------------------------------
// Internal: WireGuard provider
// ---------------------------------------------------------------------------

/** WireGuard interface name used by Triggerfish. */
const WG_INTERFACE = "wg-triggerfish";

function createWireGuardService(
  config: TunnelConfig,
  runner: CommandRunner,
): TunnelService {
  return {
    async enable(): Promise<Result<string, string>> {
      const result = await runner.run("wg-quick", ["up", WG_INTERFACE]);
      if (!result.success) {
        return {
          ok: false,
          error: `wg-quick up failed (code ${result.code}): ${result.stderr}`,
        };
      }

      // After bringing the interface up, query it for the endpoint IP.
      const showResult = await runner.run("wg", ["show", WG_INTERFACE]);
      if (!showResult.success) {
        // Interface is up but we cannot determine the IP -- still a success
        // but without a URL.
        return {
          ok: true,
          value: `wireguard://${WG_INTERFACE}:${config.gatewayPort}`,
        };
      }

      const ip = parseWgShowEndpoint(showResult.stdout);
      if (ip) {
        return { ok: true, value: `http://${ip}:${config.gatewayPort}` };
      }
      return {
        ok: true,
        value: `wireguard://${WG_INTERFACE}:${config.gatewayPort}`,
      };
    },

    async disable(): Promise<Result<void, string>> {
      const result = await runner.run("wg-quick", ["down", WG_INTERFACE]);
      if (!result.success) {
        return {
          ok: false,
          error: `wg-quick down failed (code ${result.code}): ${result.stderr}`,
        };
      }
      return { ok: true, value: undefined };
    },

    async status(): Promise<TunnelStatus> {
      const result = await runner.run("wg", ["show", WG_INTERFACE]);
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
        url: ip
          ? `http://${ip}:${config.gatewayPort}`
          : `wireguard://${WG_INTERFACE}:${config.gatewayPort}`,
        since: new Date(),
      };
    },
  };
}

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

// ---------------------------------------------------------------------------
// Internal: Cloudflare Tunnel (cloudflared) provider
// ---------------------------------------------------------------------------

function createCloudflaredService(
  config: TunnelConfig,
  runner: CommandRunner,
): TunnelService {
  /** PID of the running cloudflared process, if any. */
  let cloudflaredUrl: string | null = null;

  return {
    async enable(): Promise<Result<string, string>> {
      const result = await runner.run("cloudflared", [
        "tunnel",
        "--url",
        `http://localhost:${config.gatewayPort}`,
      ]);
      if (!result.success) {
        return {
          ok: false,
          error: `cloudflared tunnel failed (code ${result.code}): ${result.stderr}`,
        };
      }

      // cloudflared prints the public URL to stdout/stderr.
      const url = parseCloudflaredUrl(result.stdout + result.stderr);
      if (url) {
        cloudflaredUrl = url;
        return { ok: true, value: url };
      }

      // Fallback: we know it started but cannot parse the URL.
      const fallback = `cloudflared://localhost:${config.gatewayPort}`;
      cloudflaredUrl = fallback;
      return { ok: true, value: fallback };
    },

    async disable(): Promise<Result<void, string>> {
      // Signal cloudflared to stop. In practice this may be a SIGTERM;
      // here we use `pkill` via the command runner.
      const result = await runner.run("pkill", ["-f", "cloudflared"]);
      cloudflaredUrl = null;
      if (!result.success && result.code !== 1) {
        // code 1 means no matching process, which is fine
        return {
          ok: false,
          error: `pkill cloudflared failed (code ${result.code}): ${result.stderr}`,
        };
      }
      return { ok: true, value: undefined };
    },

    async status(): Promise<TunnelStatus> {
      // Check whether a cloudflared process is running.
      const result = await runner.run("pgrep", ["-f", "cloudflared"]);
      if (!result.success) {
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

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------

/**
 * Create a {@link TunnelService} for the given configuration.
 *
 * @param config   - Tunnel configuration specifying provider and port.
 * @param commandRunner - Optional command runner; defaults to Deno.Command.
 * @returns A TunnelService instance for the requested provider.
 */
export function createTunnelService(
  config: TunnelConfig,
  commandRunner?: CommandRunner,
): TunnelService {
  const runner = commandRunner ?? createDefaultCommandRunner();

  switch (config.provider) {
    case "tailscale":
      return createTailscaleService(config, runner);
    case "wireguard":
      return createWireGuardService(config, runner);
    case "cloudflared":
      return createCloudflaredService(config, runner);
  }
}
