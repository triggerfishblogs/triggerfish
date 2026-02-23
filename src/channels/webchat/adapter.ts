/**
 * WebChat channel adapter via WebSocket.
 *
 * Provides a WebSocket server that browser-based chat widgets connect to.
 * Each WebSocket connection gets a unique session ID. Messages are JSON
 * frames with { type, content, sessionId }.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import type {
  ChannelAdapter,
  ChannelMessage,
  ChannelStatus,
  MessageHandler,
} from "../types.ts";
import { createLogger } from "../../core/logger/logger.ts";
import { isOriginAllowed } from "../../core/security/websocket_auth.ts";

const log = createLogger("webchat");

/** Configuration for the WebChat channel adapter. */
export interface WebChatConfig {
  /** Port for the WebSocket server. Default: 8765 */
  readonly port?: number;
  /** Classification level for this channel. Default: PUBLIC */
  readonly classification?: ClassificationLevel;
  /** Allowed origins for CORS. Default: ["*"] */
  readonly allowedOrigins?: readonly string[];
}

/** WebSocket message frame. */
interface WsFrame {
  readonly type: "message" | "ping" | "pong";
  readonly content?: string;
  readonly sessionId?: string;
}

/**
 * Wire up event handlers for a newly upgraded WebSocket connection.
 *
 * Registers open, message, and close handlers that track the connection
 * in the shared `connections` map and dispatch incoming messages to the
 * current message handler.
 */
function attachSocketEventHandlers(
  socket: WebSocket,
  sessionId: string,
  connections: Map<string, WebSocket>,
  handlerRef: { current: MessageHandler | null },
): void {
  socket.onopen = () => {
    log.debug("WebSocket client connected", { sessionId });
    connections.set(sessionId, socket);
    socket.send(JSON.stringify({ type: "session", sessionId }));
  };

  socket.onmessage = (event) => {
    if (!handlerRef.current) return;
    try {
      const frame = JSON.parse(event.data as string) as WsFrame;
      if (frame.type === "message" && frame.content) {
        handlerRef.current({
          content: frame.content,
          sessionId,
          senderId: sessionId,
          isOwner: false,
          sessionTaint: "PUBLIC" as ClassificationLevel,
        });
      }
    } catch {
      // Ignore malformed frames
    }
  };

  socket.onclose = () => {
    log.debug("WebSocket client disconnected", { sessionId });
    connections.delete(sessionId);
  };
}

/**
 * Handle an incoming HTTP request to the WebChat server.
 *
 * WebSocket upgrade requests are validated against the Origin allowlist before
 * the connection is accepted. All other requests receive a 404 response with no
 * identifying information to avoid server fingerprinting.
 */
function routeWebChatRequest(
  req: Request,
  connections: Map<string, WebSocket>,
  handlerRef: { current: MessageHandler | null },
  allowedOrigins: readonly string[],
): Response {
  if (req.headers.get("upgrade") === "websocket") {
    const origin = req.headers.get("origin");
    if (!isOriginAllowed(origin, allowedOrigins)) {
      return new Response("Forbidden", { status: 403 });
    }
    const { socket, response } = Deno.upgradeWebSocket(req);
    const sessionId = `webchat-${crypto.randomUUID()}`;
    attachSocketEventHandlers(socket, sessionId, connections, handlerRef);
    return response;
  }

  return new Response(null, { status: 404 });
}

/**
 * Close every active WebSocket connection and clear the tracking map.
 */
function closeAllWebChatConnections(
  connections: Map<string, WebSocket>,
): void {
  for (const [, socket] of connections) {
    try {
      socket.close();
    } catch {
      // Already closed
    }
  }
  connections.clear();
}

/**
 * Serialize and send a message frame to the identified WebSocket client.
 */
function dispatchWebChatFrame(
  message: ChannelMessage,
  connections: Map<string, WebSocket>,
): void {
  if (!message.sessionId) return;

  const socket = connections.get(message.sessionId);
  if (!socket || socket.readyState !== WebSocket.OPEN) return;

  const frame: WsFrame = {
    type: "message",
    content: message.content,
    sessionId: message.sessionId,
  };

  socket.send(JSON.stringify(frame));
}

/**
 * Create a WebChat channel adapter.
 *
 * Starts a WebSocket server on the configured port. Browser chat widgets
 * connect and exchange JSON frames. Each connection is tracked by session ID.
 *
 * @param config - WebChat configuration.
 * @returns A ChannelAdapter wired to WebSocket-based chat.
 */
export function createWebChatChannel(
  config: WebChatConfig = {},
): ChannelAdapter {
  const port = config.port ?? 8765;
  const classification =
    (config.classification ?? "PUBLIC") as ClassificationLevel;
  let connected = false;
  const handlerRef: { current: MessageHandler | null } = { current: null };
  let server: Deno.HttpServer | null = null;
  const connections = new Map<string, WebSocket>();

  return {
    classification,
    isOwner: false,

    // deno-lint-ignore require-await
    async connect(): Promise<void> {
      server = Deno.serve(
        { port },
        (req) =>
          routeWebChatRequest(
            req,
            connections,
            handlerRef,
            config.allowedOrigins ?? ["*"],
          ),
      );
      connected = true;
      log.info("WebChat adapter connected", { port });
    },

    async disconnect(): Promise<void> {
      closeAllWebChatConnections(connections);
      if (server) {
        await server.shutdown();
        server = null;
      }
      connected = false;
      log.info("WebChat adapter disconnected");
    },

    // deno-lint-ignore require-await
    async send(message: ChannelMessage): Promise<void> {
      dispatchWebChatFrame(message, connections);
    },

    onMessage(msgHandler: MessageHandler): void {
      handlerRef.current = msgHandler;
    },

    status(): ChannelStatus {
      return {
        connected,
        channelType: "webchat",
      };
    },
  };
}
