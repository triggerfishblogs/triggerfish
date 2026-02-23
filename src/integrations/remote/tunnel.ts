/**
 * Remote access tunnel management — factory and default command runner.
 *
 * Provides a unified interface for establishing remote tunnels to the
 * Triggerfish gateway using Tailscale, WireGuard, or Cloudflare Tunnel.
 * Commands are executed through an injectable {@link CommandRunner}
 * for testability.
 *
 * @module
 */

import type {
  CommandResult,
  CommandRunner,
  TunnelConfig,
  TunnelService,
} from "./tunnel_types.ts";
import { createTailscaleService } from "./tunnel_tailscale.ts";
import { createWireGuardService } from "./tunnel_wireguard.ts";
import { createCloudflaredService } from "./tunnel_cloudflared.ts";

// Re-export all types so existing import paths continue to work.
export type {
  CommandResult,
  CommandRunner,
  TunnelConfig,
  TunnelProvider,
  TunnelService,
  TunnelStatus,
} from "./tunnel_types.ts";

/**
 * Create a {@link CommandRunner} backed by `Deno.Command`.
 *
 * This is the production runner used when no mock is injected.
 */
export function createDefaultCommandRunner(): CommandRunner {
  return {
    async runCommand(
      cmd: string,
      args: readonly string[],
    ): Promise<CommandResult> {
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

/**
 * Create a {@link TunnelService} for the given configuration.
 *
 * @param config - Tunnel configuration specifying provider and port.
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
