/**
 * A2UI WebSocket upgrade and HTTP request routing.
 *
 * Handles inbound HTTP requests to the Tidepool server: upgrades
 * WebSocket connections (wiring open/message/close/error listeners),
 * and serves cached HTML for plain HTTP requests.
 *
 * @module
 */

import type { ChatSession } from "../../gateway/chat.ts";
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

  wireMessageListener(socket, chatSession, ref);
  wireCleanupListeners(socket, state, ref);

  return response;
}

/** Attach a message listener that dispatches chat messages from the client. */
function wireMessageListener(
  socket: WebSocket,
  chatSession: ChatSession | undefined,
  ref: AbortControllerRef,
): void {
  socket.addEventListener("message", (event: MessageEvent) => {
    if (!chatSession) return;
    try {
      const ctx: ChatDispatchContext = { socket, chatSession, ref };
      dispatchClientChatMessage(event.data, ctx);
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
