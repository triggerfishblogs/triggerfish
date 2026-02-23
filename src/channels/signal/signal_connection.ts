/**
 * Signal socket read loop and reconnection logic.
 *
 * Manages the persistent TCP/Unix connection to signal-cli daemon,
 * including reading incoming data, draining the JSON-RPC buffer,
 * and reconnecting with exponential backoff on disconnection.
 *
 * @module
 */

import { createLogger } from "../../core/logger/logger.ts";
import type { SignalNotification } from "./types.ts";
import {
  openSignalConnection,
  parseSignalEndpoint,
} from "./signal_endpoint.ts";
import {
  drainSignalBuffer,
  type PendingRequest,
  rejectPendingSignalRequests,
} from "./signal_rpc.ts";

/** Mutable client state shared across closure helpers. */
export interface ClientState {
  conn: Deno.Conn | null;
  idCounter: number;
  readonly pending: Map<string, PendingRequest>;
  notificationHandler: ((notification: SignalNotification) => void) | null;
  readLoopActive: boolean;
  buffer: string;
  destroyed: boolean;
  reconnecting: boolean;
}

/** Read from connection and drain messages until disconnected. */
export async function readSignalSocketLoop(
  state: ClientState,
  log: ReturnType<typeof createLogger>,
): Promise<string | null> {
  const decoder = new TextDecoder();
  const buf = new Uint8Array(4096);
  while (state.readLoopActive && state.conn) {
    const n = await state.conn.read(buf);
    if (n === null) return "Connection closed";
    state.buffer += decoder.decode(buf.subarray(0, n));
    state.buffer = drainSignalBuffer(
      state.buffer,
      state.pending,
      state.notificationHandler,
      log,
    );
  }
  return null;
}

/** Try a single reconnection attempt. */
export async function attemptSignalReconnect(
  state: ClientState,
  endpoint: string,
): Promise<void> {
  const target = parseSignalEndpoint(endpoint);
  state.conn = await openSignalConnection(target);
  state.buffer = "";
}

/** Disconnect and clean up client state. */
export function destroySignalConnection(
  state: ClientState,
  log: ReturnType<typeof createLogger>,
): void {
  state.destroyed = true;
  state.readLoopActive = false;
  if (state.conn) {
    try {
      state.conn.close();
    } catch (_err: unknown) {
      log.debug("Signal disconnect: connection already closed");
    }
    state.conn = null;
  }
  rejectPendingSignalRequests(state.pending, "Client disconnected");
  state.buffer = "";
}
