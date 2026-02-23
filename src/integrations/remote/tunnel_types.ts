/**
 * Types and interfaces for remote access tunnel management.
 *
 * Defines the provider enum, configuration, status, command runner,
 * and tunnel service contracts used by all provider implementations.
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";

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
  /** Run a system command with the given arguments. */
  runCommand(cmd: string, args: readonly string[]): Promise<CommandResult>;
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
