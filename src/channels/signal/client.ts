/**
 * Signal JSON-RPC client factory for signal-cli daemon.
 *
 * Creates a multiplexed JSON-RPC client that communicates with signal-cli
 * via TCP or Unix socket. Delegates protocol encoding to signal_rpc,
 * connection management to signal_connection, and interface assembly
 * to signal_interface.
 *
 * @module
 */

import { createLogger } from "../../core/logger/logger.ts";
import type { JsonRpcResponse, SignalClientInterface } from "./types.ts";
import {
  encodeSignalRpcRequest,
  type PendingRequest,
  rejectPendingSignalRequests,
} from "./signal_rpc.ts";
import {
  attemptSignalReconnect,
  type ClientState,
  readSignalSocketLoop,
} from "./signal_connection.ts";
import { buildSignalClientInterface } from "./signal_interface.ts";

/** Options for creating a SignalClient. */
export interface SignalClientOptions {
  /** signal-cli endpoint: "tcp://host:port" or "unix:///path/to/socket" */
  readonly endpoint: string;
  /** Maximum reconnection retries. Default: 5 */
  readonly maxRetries?: number;
  /** Base delay in ms for exponential backoff. Default: 1000 */
  readonly baseDelay?: number;
  /** Injected connection for testing. */
  readonly _conn?: Deno.Conn;
}

/**
 * Create a signal-cli JSON-RPC client.
 *
 * Connects to signal-cli daemon over TCP or Unix socket, multiplexes
 * requests via JSON-RPC IDs, and dispatches incoming notifications.
 *
 * @param options - Client configuration.
 * @returns A SignalClientInterface for communicating with signal-cli.
 */
export function createSignalClient(
  options: SignalClientOptions,
): SignalClientInterface {
  const log = createLogger("signal");
  const maxRetries = options.maxRetries ?? 5;
  const baseDelay = options.baseDelay ?? 1000;

  const state: ClientState = {
    conn: options._conn ?? null,
    idCounter: 0,
    pending: new Map<string, PendingRequest>(),
    notificationHandler: null,
    readLoopActive: false,
    buffer: "",
    destroyed: false,
    reconnecting: false,
  };

  /** Start the read loop that processes incoming socket data. */
  async function startReadLoop(): Promise<void> {
    if (!state.conn || state.readLoopActive) return;
    state.readLoopActive = true;
    try {
      const reason = await readSignalSocketLoop(state, log);
      if (reason) handleReadLoopDisconnect(reason);
    } catch (err: unknown) {
      log.warn("Signal TCP read loop exited with error", { error: err });
      handleReadLoopDisconnect("Connection error");
    }
  }

  /** Clean up after a disconnect and trigger reconnect. */
  function handleReadLoopDisconnect(reason: string): void {
    state.readLoopActive = false;
    state.conn = null;
    rejectPendingSignalRequests(state.pending, reason);
    reconnectSignalDaemon();
  }

  /** Attempt to reconnect using exponential backoff. */
  async function reconnectSignalDaemon(): Promise<void> {
    if (state.destroyed || state.reconnecting) return;
    state.reconnecting = true;
    for (let attempt = 0; !state.destroyed && attempt < maxRetries; attempt++) {
      await new Promise((r) => setTimeout(r, baseDelay * Math.pow(2, attempt)));
      if (state.destroyed) break;
      try {
        await attemptSignalReconnect(state, options.endpoint);
        startReadLoop();
        state.reconnecting = false;
        return;
      } catch (err: unknown) {
        log.debug("Signal TCP reconnect attempt failed", {
          attempt: attempt + 1,
          error: err,
        });
        state.conn = null;
      }
    }
    state.reconnecting = false;
  }

  /** Send a JSON-RPC request and wait for the response. */
  function submitSignalRpcRequest(
    method: string,
    params: Record<string, unknown>,
    timeoutMs = 10000,
  ): Promise<JsonRpcResponse> {
    if (!state.conn) {
      throw new Error("Not connected to signal-cli");
    }

    const { id, data } = encodeSignalRpcRequest(
      ++state.idCounter,
      method,
      params,
    );
    const currentConn = state.conn;

    return new Promise<JsonRpcResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        state.pending.delete(id);
        reject(
          new Error(
            `JSON-RPC request "${method}" timed out after ${timeoutMs}ms`,
          ),
        );
      }, timeoutMs);

      state.pending.set(id, {
        resolve: (response) => {
          clearTimeout(timer);
          resolve(response);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });

      currentConn.write(data).catch((err: Error) => {
        clearTimeout(timer);
        state.pending.delete(id);
        reject(err);
      });
    });
  }

  return buildSignalClientInterface({
    state,
    endpoint: options.endpoint,
    log,
    startReadLoop,
    submitRpc: submitSignalRpcRequest,
  });
}
