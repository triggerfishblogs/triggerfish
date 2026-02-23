/**
 * Gateway request handlers — JSON-RPC, chat WebSocket, and webhook HTTP.
 *
 * Pure handler functions used by the gateway server. Each handler receives
 * its dependencies as parameters, keeping the server factory clean.
 *
 * @module
 */

import type { SchedulerService } from "../../scheduler/service_types.ts";
import type { EnhancedSessionManager } from "../sessions.ts";
import type { NotificationService } from "../notifications/notifications.ts";
import type { ChatClientMessage, ChatSession } from "../chat.ts";
import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { ChannelId, SessionId, UserId } from "../../core/types/session.ts";
import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("gateway");

// ─── JSON-RPC types ──────────────────────────────────────────────────────────

/** JSON-RPC 2.0 request. */
export interface JsonRpcRequest {
  readonly jsonrpc: "2.0";
  readonly id: number | string;
  readonly method: string;
  readonly params?: Record<string, unknown>;
}

/** JSON-RPC 2.0 response. */
export interface JsonRpcResponse {
  readonly jsonrpc: "2.0";
  readonly id: number | string;
  readonly result?: unknown;
  readonly error?: {
    readonly code: number;
    readonly message: string;
  };
}

// ─── Webhook HTTP handler ────────────────────────────────────────────────────

/**
 * Handle an inbound webhook HTTP request.
 *
 * Routes POST /webhooks/:sourceId to the scheduler service,
 * reading the HMAC signature from standard webhook headers.
 */
export async function routeWebhookHttp(
  request: Request,
  url: URL,
  scheduler: SchedulerService,
): Promise<Response> {
  const sourceId = url.pathname.slice("/webhooks/".length);
  if (!sourceId) {
    return new Response(
      JSON.stringify({ error: "Missing source ID" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const signature = request.headers.get("x-hub-signature-256") ??
    request.headers.get("x-signature") ??
    "";
  const body = await request.text();

  const result = await scheduler.handleWebhookRequest(
    sourceId,
    body,
    signature,
  );

  if (result.ok) {
    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  const status = result.error.includes("Invalid HMAC")
    ? 401
    : result.error.includes("Unknown webhook")
    ? 404
    : 400;

  return new Response(
    JSON.stringify({ error: result.error }),
    { status, headers: { "content-type": "application/json" } },
  );
}

// ─── JSON-RPC helpers ─────────────────────────────────────────────────────────

/** Build a successful JSON-RPC 2.0 response. */
function rpcSuccess(id: number | string, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

/** Build a JSON-RPC 2.0 error response. */
function rpcError(
  id: number | string,
  code: number,
  message: string,
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/** Dispatch a sessions.* JSON-RPC method. Returns null if method not recognized. */
async function dispatchSessionRpc(
  method: string,
  params: Record<string, unknown>,
  sessions: EnhancedSessionManager,
  id: number | string,
): Promise<JsonRpcResponse | null> {
  switch (method) {
    case "sessions.list": {
      const list = await sessions.sessionsList(params.filter as undefined);
      return rpcSuccess(id, list);
    }
    case "sessions.get": {
      const sessionId = params.id as string;
      if (!sessionId) return rpcError(id, -32602, "Missing required param: id");
      const session = await sessions.get(sessionId as SessionId);
      if (!session) {
        return rpcError(id, -32602, `Session not found: ${sessionId}`);
      }
      return rpcSuccess(id, session);
    }
    case "sessions.create": {
      const userId = params.userId as string;
      const channelId = params.channelId as string;
      if (!userId || !channelId) {
        return rpcError(
          id,
          -32602,
          "Missing required params: userId, channelId",
        );
      }
      const created = await sessions.create({
        userId: userId as UserId,
        channelId: channelId as ChannelId,
      });
      return rpcSuccess(id, created);
    }
    case "sessions.send": {
      const fromId = params.fromId as string;
      const toId = params.toId as string;
      const content = params.content as string;
      const targetClassification = params
        .targetClassification as ClassificationLevel;
      if (!fromId || !toId || !content || !targetClassification) {
        return rpcError(
          id,
          -32602,
          "Missing required params: fromId, toId, content, targetClassification",
        );
      }
      const sendResult = await sessions.sessionsSend(
        fromId as SessionId,
        toId as SessionId,
        content,
        targetClassification,
      );
      return sendResult.ok
        ? rpcSuccess(id, { delivered: true })
        : rpcError(id, -32000, sendResult.error);
    }
    case "sessions.spawn": {
      const parentId = params.parentId as string;
      const task = params.task as string;
      if (!parentId) {
        return rpcError(id, -32602, "Missing required param: parentId");
      }
      const spawned = await sessions.sessionsSpawn(
        parentId as SessionId,
        task ?? "background",
      );
      return rpcSuccess(id, spawned);
    }
    default:
      return null;
  }
}

/** Dispatch a notifications.* JSON-RPC method. Returns null if method not recognized. */
async function dispatchNotificationRpc(
  method: string,
  params: Record<string, unknown>,
  notifications: NotificationService,
  id: number | string,
): Promise<JsonRpcResponse | null> {
  switch (method) {
    case "notifications.list": {
      const nUserId = params.userId as string;
      if (!nUserId) {
        return rpcError(id, -32602, "Missing required param: userId");
      }
      const pending = await notifications.getPending(nUserId as UserId);
      return rpcSuccess(id, pending);
    }
    case "notifications.acknowledge": {
      const notifId = params.notificationId as string;
      if (!notifId) {
        return rpcError(id, -32602, "Missing required param: notificationId");
      }
      await notifications.acknowledge(notifId);
      return rpcSuccess(id, { acknowledged: true });
    }
    default:
      return null;
  }
}

// ─── JSON-RPC handler ────────────────────────────────────────────────────────

/**
 * Dispatch a JSON-RPC 2.0 request to the appropriate session or notification handler.
 *
 * Returns a JSON-RPC response with either a result or an error.
 */
export async function dispatchJsonRpc(
  request: JsonRpcRequest,
  sessions: EnhancedSessionManager | undefined,
  notifications: NotificationService | undefined,
): Promise<JsonRpcResponse> {
  const { id, method } = request;
  const params = request.params ?? {};

  try {
    if (method.startsWith("sessions.")) {
      if (!sessions) {
        return rpcError(id, -32601, "Session manager not configured");
      }
      const result = await dispatchSessionRpc(method, params, sessions, id);
      if (result) return result;
    }

    if (method.startsWith("notifications.")) {
      if (!notifications) {
        return rpcError(id, -32601, "Notification service not configured");
      }
      const result = await dispatchNotificationRpc(
        method,
        params,
        notifications,
        id,
      );
      if (result) return result;
    }

    return rpcError(id, -32601, `Method not found: ${method}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return rpcError(id, -32603, msg);
  }
}

// ─── Chat WebSocket handler ──────────────────────────────────────────────────

/** Send JSON data to a WebSocket if open, swallowing errors on disconnect. */
function sendSafeWebSocket(socket: WebSocket, data: unknown): void {
  try {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data));
    }
  } catch {
    // Client disconnected
  }
}

/** Create a ChatEventSender that routes events through a WebSocket. */
function createWebSocketSender(socket: WebSocket): (evt: unknown) => void {
  return (evt: unknown) => sendSafeWebSocket(socket, evt);
}

/** Send connection info and MCP status on WebSocket open. */
function handleChatSocketOpen(
  socket: WebSocket,
  chat: ChatSession,
  chatSockets: Set<WebSocket>,
): void {
  chatSockets.add(socket);
  sendSafeWebSocket(socket, {
    type: "connected",
    provider: chat.providerName,
    model: chat.modelName,
    taint: chat.sessionTaint,
  });
  if (chat.getMcpStatus) {
    const mcpStatus = chat.getMcpStatus();
    if (mcpStatus !== null) {
      sendSafeWebSocket(socket, { type: "mcp_status", ...mcpStatus });
    }
  }
}

/** Route a parsed chat client message to the appropriate handler. */
function routeChatSocketMessage(
  msg: ChatClientMessage,
  chat: ChatSession,
  socket: WebSocket,
  abortRef: { controller: AbortController | null },
): void {
  if (msg.type === "cancel") {
    if (abortRef.controller) {
      abortRef.controller.abort();
      sendSafeWebSocket(socket, { type: "cancelled" });
    }
    return;
  }
  if (msg.type === "clear") {
    chat.clear();
    return;
  }
  if (msg.type === "secret_prompt_response") {
    chat.handleSecretPromptResponse(msg.nonce, msg.value);
    return;
  }
  if (msg.type === "compact") {
    chat.compact(createWebSocketSender(socket)).catch((err: unknown) => {
      log.debug("Compact failed after compact_error event sent", {
        error: err instanceof Error ? err.message : String(err),
      });
    });
    return;
  }
  if (
    msg.type === "message" &&
    (typeof msg.content === "string" ||
      (Array.isArray(msg.content) && msg.content.length > 0))
  ) {
    abortRef.controller = new AbortController();
    const signal = abortRef.controller.signal;
    chat.executeAgentTurn(msg.content, createWebSocketSender(socket), signal)
      .finally(() => {
        abortRef.controller = null;
      });
  }
}

/**
 * Handle a /chat WebSocket connection.
 *
 * Upgrades the request to a WebSocket, sends a `connected` event,
 * and routes incoming chat messages to the ChatSession. Each connection
 * gets its own AbortController for cancel support.
 */
export function upgradeChatWebSocket(
  request: Request,
  chat: ChatSession,
  chatSockets: Set<WebSocket>,
): Response {
  const { socket, response } = Deno.upgradeWebSocket(request);
  const abortRef: { controller: AbortController | null } = { controller: null };

  socket.addEventListener("open", () => {
    handleChatSocketOpen(socket, chat, chatSockets);
  });

  socket.addEventListener("message", (event: MessageEvent) => {
    try {
      const data = typeof event.data === "string"
        ? event.data
        : new TextDecoder().decode(event.data as ArrayBuffer);
      const msg = JSON.parse(data) as ChatClientMessage;
      routeChatSocketMessage(msg, chat, socket, abortRef);
    } catch {
      sendSafeWebSocket(socket, {
        type: "error",
        message: "Invalid message format",
      });
    }
  });

  socket.addEventListener("close", () => {
    chatSockets.delete(socket);
    abortRef.controller?.abort("client_disconnected");
  });

  socket.addEventListener("error", () => {
    chatSockets.delete(socket);
    abortRef.controller?.abort("client_disconnected");
  });

  return response;
}
