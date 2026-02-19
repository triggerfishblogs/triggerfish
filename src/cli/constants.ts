/**
 * CLI-facing port constants for the Triggerfish gateway components.
 *
 * Single source of truth for well-known port numbers referenced by CLI
 * commands, startup output, and probe functions.
 * @module
 */

/** Port that the Tidepool A2UI server listens on. */
export const TIDEPOOL_PORT = 18790;

/** Port that the Gateway WebSocket server listens on. */
export const GATEWAY_PORT = 18789;
