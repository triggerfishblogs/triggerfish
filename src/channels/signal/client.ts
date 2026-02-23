/**
 * Signal JSON-RPC client for signal-cli daemon.
 *
 * Communicates with signal-cli via TCP or Unix socket using JSON-RPC 2.0.
 * Handles request/response multiplexing, notification dispatch, and
 * reconnection with exponential backoff.
 *
 * @module
 */

import { createLogger } from "../../core/logger/logger.ts";
import type { Result } from "../../core/types/classification.ts";
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  SignalClientInterface,
  SignalContactEntry,
  SignalGroupEntry,
  SignalNotification,
} from "./types.ts";

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

/** Pending request awaiting a JSON-RPC response. */
interface PendingRequest {
  readonly resolve: (response: JsonRpcResponse) => void;
  readonly reject: (error: Error) => void;
}

/** Parsed TCP endpoint. */
interface TcpEndpoint {
  readonly transport: "tcp";
  readonly hostname: string;
  readonly port: number;
}

/** Parsed Unix socket endpoint. */
interface UnixEndpoint {
  readonly transport: "unix";
  readonly path: string;
}

/** Mutable client state shared across helper functions. */
interface ClientState {
  conn: Deno.Conn | null;
  idCounter: number;
  readonly pending: Map<string, PendingRequest>;
  notificationHandler: ((notification: SignalNotification) => void) | null;
  readLoopActive: boolean;
  buffer: string;
  destroyed: boolean;
  reconnecting: boolean;
}

/** Parse the endpoint URI into connection parameters. */
function parseSignalEndpoint(endpoint: string): TcpEndpoint | UnixEndpoint {
  if (endpoint.startsWith("tcp://")) {
    const url = new URL(endpoint.replace("tcp://", "http://"));
    // Normalize "localhost" to "127.0.0.1" — signal-cli binds on IPv4,
    // and "localhost" may resolve to ::1 (IPv6) on some systems.
    const hostname = url.hostname === "localhost" ? "127.0.0.1" : url.hostname;
    return {
      transport: "tcp",
      hostname,
      port: parseInt(url.port || "7583", 10),
    };
  }
  if (endpoint.startsWith("unix://")) {
    return {
      transport: "unix",
      path: endpoint.slice("unix://".length),
    };
  }
  throw new Error(`Unsupported endpoint scheme: ${endpoint}`);
}

/** Open a connection to the signal-cli daemon using the parsed endpoint. */
async function openSignalConnection(
  target: TcpEndpoint | UnixEndpoint,
): Promise<Deno.Conn> {
  if (target.transport === "tcp") {
    return await Deno.connect({
      hostname: target.hostname,
      port: target.port,
    });
  }
  return await (Deno.connect as (
    opts: { transport: "unix"; path: string },
  ) => Promise<Deno.Conn>)({
    transport: "unix",
    path: target.path,
  });
}

/** Reject all pending requests with the given reason and clear the map. */
function rejectPendingSignalRequests(
  pending: Map<string, PendingRequest>,
  reason: string,
): void {
  for (const [id, req] of pending) {
    req.reject(new Error(reason));
    pending.delete(id);
  }
}

/** Format an unknown error value as a string. */
function formatSignalError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Dispatch a parsed JSON message as either a response or notification.
 *
 * Messages with an `id` field are matched to pending requests.
 * Messages with `method: "receive"` are forwarded to the notification handler.
 */
function dispatchSignalMessage(
  msg: Record<string, unknown>,
  pending: Map<string, PendingRequest>,
  notificationHandler: ((notification: SignalNotification) => void) | null,
): void {
  if ("id" in msg && typeof msg.id === "string") {
    const pendingReq = pending.get(msg.id);
    if (pendingReq) {
      pending.delete(msg.id);
      pendingReq.resolve(msg as unknown as JsonRpcResponse);
    }
    return;
  }
  if ("method" in msg && msg.method === "receive") {
    const params = msg.params as Record<string, unknown> | undefined;
    if (params && notificationHandler) {
      notificationHandler(params as unknown as SignalNotification);
    }
  }
}

/**
 * Drain newline-delimited JSON messages from the buffer.
 *
 * Parses each complete line as JSON and dispatches it. Returns the
 * remaining (incomplete) buffer content.
 */
function drainSignalBuffer(
  currentBuffer: string,
  pending: Map<string, PendingRequest>,
  notificationHandler: ((notification: SignalNotification) => void) | null,
  log: ReturnType<typeof createLogger>,
): string {
  let buf = currentBuffer;
  let newlineIdx: number;
  while ((newlineIdx = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, newlineIdx).trim();
    buf = buf.slice(newlineIdx + 1);

    if (line.length === 0) continue;

    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      dispatchSignalMessage(parsed, pending, notificationHandler);
    } catch (err: unknown) {
      log.warn("Signal JSON-RPC message parse failed", { error: err });
    }
  }
  return buf;
}

/** Map a raw signal-cli group record to a typed SignalGroupEntry. */
function marshalSignalGroupEntry(
  g: Record<string, unknown>,
): SignalGroupEntry {
  return {
    id: String(g.id ?? ""),
    name: String(g.name ?? ""),
    description: g.description ? String(g.description) : undefined,
    isMember: Boolean(g.isMember),
    isBlocked: Boolean(g.isBlocked),
    members: Array.isArray(g.members) ? g.members.map(String) : undefined,
  };
}

/** Map a raw signal-cli contact record to a typed SignalContactEntry. */
function marshalSignalContactEntry(
  c: Record<string, unknown>,
): SignalContactEntry {
  return {
    number: String(c.number ?? ""),
    name: c.name ? String(c.name) : undefined,
    profileName: c.profileName ? String(c.profileName) : undefined,
    isBlocked: Boolean(c.isBlocked),
  };
}

/**
 * Encode a JSON-RPC request as newline-delimited bytes.
 *
 * Assigns a unique ID from the state counter and returns both
 * the assigned ID and the encoded payload.
 */
function encodeSignalRpcRequest(
  state: ClientState,
  method: string,
  params: Record<string, unknown>,
): { readonly id: string; readonly data: Uint8Array } {
  const id = `req-${++state.idCounter}`;
  const request: JsonRpcRequest = {
    jsonrpc: "2.0",
    method,
    params,
    id,
  };
  const encoder = new TextEncoder();
  return { id, data: encoder.encode(JSON.stringify(request) + "\n") };
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

  /** Start the read loop that processes incoming data from the socket. */
  async function startReadLoop(): Promise<void> {
    if (!state.conn || state.readLoopActive) return;
    state.readLoopActive = true;

    const decoder = new TextDecoder();
    const buf = new Uint8Array(4096);

    try {
      while (state.readLoopActive && state.conn) {
        const n = await state.conn.read(buf);
        if (n === null) {
          handleReadLoopDisconnect("Connection closed");
          break;
        }
        state.buffer += decoder.decode(buf.subarray(0, n));
        state.buffer = drainSignalBuffer(
          state.buffer,
          state.pending,
          state.notificationHandler,
          log,
        );
      }
    } catch (err: unknown) {
      log.warn("Signal TCP read loop exited with error", { error: err });
      handleReadLoopDisconnect("Connection error");
    }
  }

  /** Clean up after the read loop loses its connection and trigger reconnect. */
  function handleReadLoopDisconnect(reason: string): void {
    state.readLoopActive = false;
    state.conn = null;
    rejectPendingSignalRequests(state.pending, reason);
    reconnectSignalDaemon();
  }

  /** Attempt to reconnect using exponential backoff. Fire-and-forget. */
  async function reconnectSignalDaemon(): Promise<void> {
    if (state.destroyed || state.reconnecting) return;
    state.reconnecting = true;

    let attempt = 0;
    while (!state.destroyed && attempt < maxRetries) {
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
      if (state.destroyed) break;
      attempt++;
      try {
        const target = parseSignalEndpoint(options.endpoint);
        state.conn = await openSignalConnection(target);
        state.buffer = "";
        startReadLoop();
        state.reconnecting = false;
        return;
      } catch (err: unknown) {
        log.debug("Signal TCP reconnect attempt failed", {
          attempt,
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

    const { id, data } = encodeSignalRpcRequest(state, method, params);
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

  return {
    async connect(): Promise<Result<void, string>> {
      try {
        if (!state.conn) {
          const target = parseSignalEndpoint(options.endpoint);
          state.conn = await openSignalConnection(target);
        }
        startReadLoop();
        return { ok: true, value: undefined };
      } catch (err) {
        return {
          ok: false,
          error: `Failed to connect: ${formatSignalError(err)}`,
        };
      }
    },

    disconnect(): Promise<void> {
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
      return Promise.resolve();
    },

    async sendMessage(
      recipient: string,
      message: string,
    ): Promise<Result<{ readonly timestamp: number }, string>> {
      try {
        const response = await submitSignalRpcRequest("send", {
          recipient: [recipient],
          message,
        });
        if (response.error) {
          return { ok: false, error: response.error.message };
        }
        const result = response.result as { timestamp: number } | undefined;
        return { ok: true, value: { timestamp: result?.timestamp ?? 0 } };
      } catch (err) {
        return { ok: false, error: formatSignalError(err) };
      }
    },

    async sendGroupMessage(
      groupId: string,
      message: string,
    ): Promise<Result<{ readonly timestamp: number }, string>> {
      try {
        const response = await submitSignalRpcRequest("send", {
          groupId,
          message,
        });
        if (response.error) {
          return { ok: false, error: response.error.message };
        }
        const result = response.result as { timestamp: number } | undefined;
        return { ok: true, value: { timestamp: result?.timestamp ?? 0 } };
      } catch (err) {
        return { ok: false, error: formatSignalError(err) };
      }
    },

    async sendTyping(recipient: string): Promise<Result<void, string>> {
      try {
        const response = await submitSignalRpcRequest("sendTyping", {
          recipient,
        });
        if (response.error) {
          return { ok: false, error: response.error.message };
        }
        return { ok: true, value: undefined };
      } catch (err) {
        return { ok: false, error: formatSignalError(err) };
      }
    },

    async sendTypingStop(recipient: string): Promise<Result<void, string>> {
      try {
        const response = await submitSignalRpcRequest("sendTyping", {
          recipient,
          stop: true,
        });
        if (response.error) {
          return { ok: false, error: response.error.message };
        }
        return { ok: true, value: undefined };
      } catch (err) {
        return { ok: false, error: formatSignalError(err) };
      }
    },

    onNotification(
      handler: (notification: SignalNotification) => void,
    ): void {
      state.notificationHandler = handler;
    },

    async ping(): Promise<Result<void, string>> {
      try {
        // Use "version" — works in both single-account and multi-account mode.
        // "listAccounts" only works in multi-account mode.
        // Short timeout (3s) so the adapter retry loop can cycle quickly.
        const response = await submitSignalRpcRequest("version", {}, 3000);
        if (response.error) {
          return { ok: false, error: response.error.message };
        }
        return { ok: true, value: undefined };
      } catch (err) {
        return { ok: false, error: formatSignalError(err) };
      }
    },

    async listGroups(): Promise<
      Result<readonly SignalGroupEntry[], string>
    > {
      try {
        const response = await submitSignalRpcRequest("listGroups", {});
        if (response.error) {
          return { ok: false, error: response.error.message };
        }
        const groups = response.result as readonly Record<string, unknown>[] ??
          [];
        return { ok: true, value: groups.map(marshalSignalGroupEntry) };
      } catch (err) {
        return { ok: false, error: formatSignalError(err) };
      }
    },

    async listContacts(): Promise<
      Result<readonly SignalContactEntry[], string>
    > {
      try {
        const response = await submitSignalRpcRequest("listContacts", {});
        if (response.error) {
          return { ok: false, error: response.error.message };
        }
        const contacts =
          response.result as readonly Record<string, unknown>[] ??
            [];
        return { ok: true, value: contacts.map(marshalSignalContactEntry) };
      } catch (err) {
        return { ok: false, error: formatSignalError(err) };
      }
    },
  };
}
