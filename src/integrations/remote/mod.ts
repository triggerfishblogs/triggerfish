/**
 * Remote access module.
 *
 * Provides tunnel management for accessing the Triggerfish gateway
 * from outside the local network via Tailscale, WireGuard, or
 * Cloudflare Tunnel.
 *
 * @module
 */

export { createTunnelService, createDefaultCommandRunner } from "./tunnel.ts";
export type {
  CommandResult,
  CommandRunner,
  TunnelConfig,
  TunnelProvider,
  TunnelService,
  TunnelStatus,
} from "./tunnel_types.ts";
