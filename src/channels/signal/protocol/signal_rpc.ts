/**
 * Signal JSON-RPC 2.0 protocol encoding, dispatching, and buffer draining.
 *
 * Handles the wire protocol for communicating with signal-cli daemon:
 * encoding outbound requests, parsing inbound newline-delimited JSON,
 * and routing responses/notifications to the correct handlers.
 *
 * @module
 */

import { createLogger } from "../../../core/logger/logger.ts";
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  SignalNotification,
} from "../types.ts";

/** Pending request awaiting a JSON-RPC response. */
export interface PendingRequest {
  readonly resolve: (response: JsonRpcResponse) => void;
  readonly reject: (error: Error) => void;
}

/** Reject all pending requests with the given reason and clear the map. */
export function rejectPendingSignalRequests(
  pending: Map<string, PendingRequest>,
  reason: string,
): void {
  for (const [id, req] of pending) {
    req.reject(new Error(reason));
    pending.delete(id);
  }
}

/** Format an unknown error value as a string. */
export function formatSignalError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Dispatch a parsed JSON message as either a response or notification.
 *
 * Messages with an `id` field are matched to pending requests.
 * Messages with `method: "receive"` are forwarded to the notification handler.
 */
export function dispatchSignalMessage(
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
export function drainSignalBuffer(
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

/**
 * Encode a JSON-RPC request as newline-delimited bytes.
 *
 * Assigns a unique ID from the given counter value and returns the
 * assigned ID and the encoded payload.
 */
export function encodeSignalRpcRequest(
  idCounter: number,
  method: string,
  params: Record<string, unknown>,
): { readonly id: string; readonly data: Uint8Array } {
  const id = `req-${idCounter}`;
  const request: JsonRpcRequest = {
    jsonrpc: "2.0",
    method,
    params,
    id,
  };
  const encoder = new TextEncoder();
  return { id, data: encoder.encode(JSON.stringify(request) + "\n") };
}
