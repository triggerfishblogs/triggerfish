/**
 * A2UI WebSocket upgrade and HTTP request routing.
 *
 * Handles inbound HTTP requests to the Tidepool server: upgrades
 * WebSocket connections (wiring open/message/close/error listeners),
 * and serves cached HTML for plain HTTP requests.
 *
 * @module
 */

import type { ChatSession } from "../../../gateway/chat.ts";
import type { A2UIHostState } from "./host_types.ts";
import { sendInitialClientState } from "./host_broadcast.ts";
import {
  type AbortControllerRef,
  type ChatDispatchContext,
  dispatchClientChatMessage,
} from "./host_chat.ts";

/** Upgrade a WebSocket request: wire lifecycle listeners and return the upgrade response. */
export function upgradeWebSocketClient(
  request: Request,
  state: A2UIHostState,
  chatSession: ChatSession | undefined,
): Response {
  const { socket, response } = Deno.upgradeWebSocket(request);
  const ref: AbortControllerRef = { current: null };

  socket.addEventListener("open", () => {
    state.clients.add(socket);
    sendInitialClientState(socket, state, chatSession);
  });

  wireMessageListener(socket, chatSession, ref, state);
  wireCleanupListeners(socket, state, ref);

  return response;
}

/**
 * Attach a message listener that routes by topic.
 *
 * Messages without a `topic` field (or with topic "chat") are dispatched
 * to the existing chat handler for backward compatibility. Messages with
 * other topics are forwarded to the topic handler registry on state.
 */
function wireMessageListener(
  socket: WebSocket,
  chatSession: ChatSession | undefined,
  ref: AbortControllerRef,
  state: A2UIHostState,
): void {
  socket.addEventListener("message", (event: MessageEvent) => {
    try {
      const text = typeof event.data === "string"
        ? event.data
        : new TextDecoder().decode(event.data as ArrayBuffer);
      const parsed = JSON.parse(text) as Record<string, unknown>;
      const topic = (parsed.topic as string) ?? "chat";

      if (topic === "chat" || !parsed.topic) {
        // Legacy chat protocol — dispatch directly
        if (!chatSession) return;
        const ctx: ChatDispatchContext = { socket, chatSession, ref };
        dispatchClientChatMessage(event.data, ctx);
        return;
      }

      // Topic-routed message — dispatch to registered handler
      const handler = state.topicHandlers?.[topic];
      if (handler) {
        handler(parsed, socket);
      }
    } catch {
      // Ignore malformed messages
    }
  });
}

/** Attach close and error listeners that remove the socket and abort in-flight turns. */
function wireCleanupListeners(
  socket: WebSocket,
  state: A2UIHostState,
  ref: AbortControllerRef,
): void {
  socket.addEventListener("close", () => {
    state.clients.delete(socket);
    ref.current?.abort("client_disconnected");
  });

  socket.addEventListener("error", () => {
    state.clients.delete(socket);
    ref.current?.abort("client_disconnected");
  });
}

/** Route an inbound HTTP request to WebSocket upgrade or static HTML response. */
export function routeHostRequest(
  request: Request,
  state: A2UIHostState,
  chatSession: ChatSession | undefined,
): Response {
  if (request.headers.get("upgrade") === "websocket") {
    return upgradeWebSocketClient(request, state, chatSession);
  }
  if (state.cachedHtml) {
    return new Response(state.cachedHtml, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  return new Response("Tide Pool A2UI Host", { status: 200 });
}

/** Close all client sockets and clear the set. */
export function closeAllClientSockets(clients: Set<WebSocket>): void {
  for (const ws of clients) {
    try {
      ws.close();
    } catch {
      // Client may already be closed
    }
  }
  clients.clear();
}
