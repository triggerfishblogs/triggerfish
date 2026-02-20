/**
 * Gateway request handlers — JSON-RPC, chat WebSocket, and webhook HTTP.
 *
 * Pure handler functions used by the gateway server. Each handler receives
 * its dependencies as parameters, keeping the server factory clean.
 *
 * @module
 */

import type { SchedulerService } from "../scheduler/service.ts";
import type { EnhancedSessionManager } from "./sessions.ts";
import type { NotificationService } from "./notifications.ts";
import type { ChatSession, ChatClientMessage } from "./chat.ts";
import type { ClassificationLevel } from "../core/types/classification.ts";
import type { SessionId, UserId, ChannelId } from "../core/types/session.ts";

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

  const signature = request.headers.get("x-hub-signature-256")
    ?? request.headers.get("x-signature")
    ?? "";
  const body = await request.text();

  const result = await scheduler.handleWebhookRequest(sourceId, body, signature);

  if (result.ok) {
    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }

  const status = result.error.includes("Invalid HMAC") ? 401
    : result.error.includes("Unknown webhook") ? 404
    : 400;

  return new Response(
    JSON.stringify({ error: result.error }),
    { status, headers: { "content-type": "application/json" } },
  );
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
  const id = request.id;

  function success(result: unknown): JsonRpcResponse {
    return { jsonrpc: "2.0", id, result };
  }

  function error(code: number, message: string): JsonRpcResponse {
    return { jsonrpc: "2.0", id, error: { code, message } };
  }

  try {
    const params = request.params ?? {};

    switch (request.method) {
      // --- Session methods ---
      case "sessions.list": {
        if (!sessions) return error(-32601, "Session manager not configured");
        const list = await sessions.sessionsList(params.filter as undefined);
        return success(list);
      }

      case "sessions.get": {
        if (!sessions) return error(-32601, "Session manager not configured");
        const sessionId = params.id as string;
        if (!sessionId) return error(-32602, "Missing required param: id");
        const session = await sessions.get(sessionId as SessionId);
        if (!session) return error(-32602, `Session not found: ${sessionId}`);
        return success(session);
      }

      case "sessions.create": {
        if (!sessions) return error(-32601, "Session manager not configured");
        const userId = params.userId as string;
        const channelId = params.channelId as string;
        if (!userId || !channelId) {
          return error(-32602, "Missing required params: userId, channelId");
        }
        const created = await sessions.create({
          userId: userId as UserId,
          channelId: channelId as ChannelId,
        });
        return success(created);
      }

      case "sessions.send": {
        if (!sessions) return error(-32601, "Session manager not configured");
        const fromId = params.fromId as string;
        const toId = params.toId as string;
        const content = params.content as string;
        const targetClassification = params.targetClassification as ClassificationLevel;
        if (!fromId || !toId || !content || !targetClassification) {
          return error(-32602, "Missing required params: fromId, toId, content, targetClassification");
        }
        const sendResult = await sessions.sessionsSend(
          fromId as SessionId,
          toId as SessionId,
          content,
          targetClassification,
        );
        if (sendResult.ok) {
          return success({ delivered: true });
        }
        return error(-32000, sendResult.error);
      }

      case "sessions.spawn": {
        if (!sessions) return error(-32601, "Session manager not configured");
        const parentId = params.parentId as string;
        const task = params.task as string;
        if (!parentId) return error(-32602, "Missing required param: parentId");
        const spawned = await sessions.sessionsSpawn(
          parentId as SessionId,
          task ?? "background",
        );
        return success(spawned);
      }

      // --- Notification methods ---
      case "notifications.list": {
        if (!notifications) return error(-32601, "Notification service not configured");
        const nUserId = params.userId as string;
        if (!nUserId) return error(-32602, "Missing required param: userId");
        const pending = await notifications.getPending(nUserId as UserId);
        return success(pending);
      }

      case "notifications.acknowledge": {
        if (!notifications) return error(-32601, "Notification service not configured");
        const notifId = params.notificationId as string;
        if (!notifId) return error(-32602, "Missing required param: notificationId");
        await notifications.acknowledge(notifId);
        return success({ acknowledged: true });
      }

      default:
        return error(-32601, `Method not found: ${request.method}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return error(-32603, msg);
  }
}

// ─── Chat WebSocket handler ──────────────────────────────────────────────────

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
  let abortController: AbortController | null = null;

  socket.addEventListener("open", () => {
    chatSockets.add(socket);
    try {
      socket.send(JSON.stringify({
        type: "connected",
        provider: chat.providerName,
        model: chat.modelName,
        taint: chat.sessionTaint,
      }));
    } catch {
      // Client may have disconnected immediately
    }
    // Send last known MCP status if available
    if (chat.getMcpStatus) {
      const mcpStatus = chat.getMcpStatus();
      if (mcpStatus !== null) {
        try {
          socket.send(JSON.stringify({ type: "mcp_status", ...mcpStatus }));
        } catch {
          // Client may have disconnected
        }
      }
    }
  });

  socket.addEventListener("message", (event: MessageEvent) => {
    try {
      const data = typeof event.data === "string"
        ? event.data
        : new TextDecoder().decode(event.data as ArrayBuffer);
      const msg = JSON.parse(data) as ChatClientMessage;

      if (msg.type === "cancel") {
        if (abortController) {
          abortController.abort();
          try {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: "cancelled" }));
            }
          } catch {
            // Client disconnected
          }
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
        const send = (evt: unknown) => {
          try {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify(evt));
            }
          } catch {
            // Client disconnected
          }
        };
        chat.compact(send).catch(() => {
          // Error already sent via compact_error event
        });
        return;
      }

      if (msg.type === "message" && (typeof msg.content === "string" || (Array.isArray(msg.content) && msg.content.length > 0))) {
        abortController = new AbortController();
        const signal = abortController.signal;

        const send = (evt: unknown) => {
          try {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify(evt));
            }
          } catch {
            // Client disconnected
          }
        };

        chat.executeAgentTurn(msg.content, send, signal).finally(() => {
          abortController = null;
        });
      }
    } catch {
      try {
        socket.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
      } catch {
        // Client disconnected
      }
    }
  });

  socket.addEventListener("close", () => {
    chatSockets.delete(socket);
    abortController?.abort("client_disconnected");
  });

  socket.addEventListener("error", () => {
    chatSockets.delete(socket);
    abortController?.abort("client_disconnected");
  });

  return response;
}
