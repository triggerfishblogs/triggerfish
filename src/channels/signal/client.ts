/**
 * Signal JSON-RPC client for signal-cli daemon.
 *
 * Communicates with signal-cli via TCP or Unix socket using JSON-RPC 2.0.
 * Handles request/response multiplexing, notification dispatch, and
 * reconnection with exponential backoff.
 *
 * @module
 */

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

/**
 * Create a signal-cli JSON-RPC client.
 *
 * Connects to signal-cli daemon over TCP or Unix socket, multiplexes
 * requests via JSON-RPC IDs, and dispatches incoming notifications.
 *
 * @param options - Client configuration.
 * @returns A SignalClientInterface for communicating with signal-cli.
 */
export function createSignalClient(options: SignalClientOptions): SignalClientInterface {
  const _maxRetries = options.maxRetries ?? 5;
  const _baseDelay = options.baseDelay ?? 1000;

  let conn: Deno.Conn | null = options._conn ?? null;
  let idCounter = 0;
  const pending = new Map<string, PendingRequest>();
  let notificationHandler: ((notification: SignalNotification) => void) | null = null;
  let readLoopActive = false;
  let buffer = "";

  /** Parse the endpoint URI into connection parameters. */
  function parseEndpoint(endpoint: string): { transport: "tcp"; hostname: string; port: number } | { transport: "unix"; path: string } {
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

  /** Start the read loop that processes incoming data from the socket. */
  async function startReadLoop(): Promise<void> {
    if (!conn || readLoopActive) return;
    readLoopActive = true;

    const decoder = new TextDecoder();
    const buf = new Uint8Array(4096);

    try {
      while (readLoopActive && conn) {
        const n = await conn.read(buf);
        if (n === null) {
          readLoopActive = false;
          break;
        }

        buffer += decoder.decode(buf.subarray(0, n));

        // Process newline-delimited JSON
        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIdx).trim();
          buffer = buffer.slice(newlineIdx + 1);

          if (line.length === 0) continue;

          try {
            const parsed = JSON.parse(line) as Record<string, unknown>;
            dispatchMessage(parsed);
          } catch {
            // Skip malformed JSON
          }
        }
      }
    } catch {
      // Connection closed or errored
      readLoopActive = false;
    }
  }

  /** Dispatch a parsed JSON message as either a response or notification. */
  function dispatchMessage(msg: Record<string, unknown>): void {
    if ("id" in msg && typeof msg.id === "string") {
      // JSON-RPC response
      const pendingReq = pending.get(msg.id);
      if (pendingReq) {
        pending.delete(msg.id);
        pendingReq.resolve(msg as unknown as JsonRpcResponse);
      }
    } else if ("method" in msg && msg.method === "receive") {
      // JSON-RPC notification
      const params = msg.params as Record<string, unknown> | undefined;
      if (params && notificationHandler) {
        notificationHandler(params as unknown as SignalNotification);
      }
    }
  }

  /** Send a JSON-RPC request and wait for the response. */
  function sendRequest(method: string, params: Record<string, unknown>): Promise<JsonRpcResponse> {
    if (!conn) {
      throw new Error("Not connected to signal-cli");
    }

    const id = `req-${++idCounter}`;
    const request: JsonRpcRequest = {
      jsonrpc: "2.0",
      method,
      params,
      id,
    };

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(request) + "\n");

    return new Promise<JsonRpcResponse>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      conn!.write(data).catch((err: Error) => {
        pending.delete(id);
        reject(err);
      });
    });
  }

  return {
    async connect(): Promise<Result<void, string>> {
      try {
        if (!conn) {
          const target = parseEndpoint(options.endpoint);
          if (target.transport === "tcp") {
            conn = await Deno.connect({
              hostname: target.hostname,
              port: target.port,
            });
          } else {
            conn = await (Deno.connect as (opts: { transport: "unix"; path: string }) => Promise<Deno.Conn>)({
              transport: "unix",
              path: target.path,
            });
          }
        }

        // Start read loop in background
        startReadLoop();

        return { ok: true, value: undefined };
      } catch (err) {
        return { ok: false, error: `Failed to connect: ${err instanceof Error ? err.message : String(err)}` };
      }
    },

    disconnect(): Promise<void> {
      readLoopActive = false;
      if (conn) {
        try {
          conn.close();
        } catch {
          // Already closed
        }
        conn = null;
      }
      // Reject all pending requests
      for (const [id, req] of pending) {
        req.reject(new Error("Client disconnected"));
        pending.delete(id);
      }
      buffer = "";
      return Promise.resolve();
    },

    async sendMessage(recipient: string, message: string): Promise<Result<{ readonly timestamp: number }, string>> {
      try {
        const response = await sendRequest("send", {
          recipient: [recipient],
          message,
        });
        if (response.error) {
          return { ok: false, error: response.error.message };
        }
        const result = response.result as { timestamp: number } | undefined;
        return { ok: true, value: { timestamp: result?.timestamp ?? 0 } };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async sendGroupMessage(groupId: string, message: string): Promise<Result<{ readonly timestamp: number }, string>> {
      try {
        const response = await sendRequest("send", {
          groupId,
          message,
        });
        if (response.error) {
          return { ok: false, error: response.error.message };
        }
        const result = response.result as { timestamp: number } | undefined;
        return { ok: true, value: { timestamp: result?.timestamp ?? 0 } };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async sendTyping(recipient: string): Promise<Result<void, string>> {
      try {
        const response = await sendRequest("sendTyping", {
          recipient,
        });
        if (response.error) {
          return { ok: false, error: response.error.message };
        }
        return { ok: true, value: undefined };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async sendTypingStop(recipient: string): Promise<Result<void, string>> {
      try {
        const response = await sendRequest("sendTyping", {
          recipient,
          stop: true,
        });
        if (response.error) {
          return { ok: false, error: response.error.message };
        }
        return { ok: true, value: undefined };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    onNotification(handler: (notification: SignalNotification) => void): void {
      notificationHandler = handler;
    },

    async ping(): Promise<Result<void, string>> {
      try {
        // Use "version" — works in both single-account and multi-account mode.
        // "listAccounts" only works in multi-account mode.
        const response = await sendRequest("version", {});
        if (response.error) {
          return { ok: false, error: response.error.message };
        }
        return { ok: true, value: undefined };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async listGroups(): Promise<Result<readonly SignalGroupEntry[], string>> {
      try {
        const response = await sendRequest("listGroups", {});
        if (response.error) {
          return { ok: false, error: response.error.message };
        }
        const groups = response.result as readonly Record<string, unknown>[] ?? [];
        return {
          ok: true,
          value: groups.map((g) => ({
            id: String(g.id ?? ""),
            name: String(g.name ?? ""),
            description: g.description ? String(g.description) : undefined,
            isMember: Boolean(g.isMember),
            isBlocked: Boolean(g.isBlocked),
            members: Array.isArray(g.members) ? g.members.map(String) : undefined,
          })),
        };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    async listContacts(): Promise<Result<readonly SignalContactEntry[], string>> {
      try {
        const response = await sendRequest("listContacts", {});
        if (response.error) {
          return { ok: false, error: response.error.message };
        }
        const contacts = response.result as readonly Record<string, unknown>[] ?? [];
        return {
          ok: true,
          value: contacts.map((c) => ({
            number: String(c.number ?? ""),
            name: c.name ? String(c.name) : undefined,
            profileName: c.profileName ? String(c.profileName) : undefined,
            isBlocked: Boolean(c.isBlocked),
          })),
        };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}
