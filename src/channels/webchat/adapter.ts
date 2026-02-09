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
 * Create a WebChat channel adapter.
 *
 * Starts a WebSocket server on the configured port. Browser chat widgets
 * connect and exchange JSON frames. Each connection is tracked by session ID.
 *
 * @param config - WebChat configuration.
 * @returns A ChannelAdapter wired to WebSocket-based chat.
 */
export function createWebChatChannel(config: WebChatConfig = {}): ChannelAdapter {
  const port = config.port ?? 8765;
  const classification = (config.classification ?? "PUBLIC") as ClassificationLevel;
  let connected = false;
  let handler: MessageHandler | null = null;
  let server: Deno.HttpServer | null = null;

  // Track active WebSocket connections by session ID
  const connections = new Map<string, WebSocket>();

  return {
    classification,
    isOwner: false, // Web visitors are never the owner

    async connect(): Promise<void> {
      server = Deno.serve({ port }, (req) => {
        // WebSocket upgrade
        if (req.headers.get("upgrade") === "websocket") {
          const { socket, response } = Deno.upgradeWebSocket(req);
          const sessionId = `webchat-${crypto.randomUUID()}`;

          socket.onopen = () => {
            connections.set(sessionId, socket);
            // Send session ID to client
            socket.send(JSON.stringify({
              type: "session",
              sessionId,
            }));
          };

          socket.onmessage = (event) => {
            if (!handler) return;
            try {
              const frame = JSON.parse(event.data as string) as WsFrame;
              if (frame.type === "message" && frame.content) {
                handler({
                  content: frame.content,
                  sessionId,
                  sessionTaint: "PUBLIC" as ClassificationLevel,
                });
              }
            } catch {
              // Ignore malformed frames
            }
          };

          socket.onclose = () => {
            connections.delete(sessionId);
          };

          return response;
        }

        // Health check endpoint
        return new Response("WebChat OK", { status: 200 });
      });

      connected = true;
    },

    async disconnect(): Promise<void> {
      // Close all WebSocket connections
      for (const [, socket] of connections) {
        try {
          socket.close();
        } catch {
          // Already closed
        }
      }
      connections.clear();

      if (server) {
        await server.shutdown();
        server = null;
      }
      connected = false;
    },

    async send(message: ChannelMessage): Promise<void> {
      if (!message.sessionId) return;

      const socket = connections.get(message.sessionId);
      if (!socket || socket.readyState !== WebSocket.OPEN) return;

      const frame: WsFrame = {
        type: "message",
        content: message.content,
        sessionId: message.sessionId,
      };

      socket.send(JSON.stringify(frame));
    },

    onMessage(msgHandler: MessageHandler): void {
      handler = msgHandler;
    },

    status(): ChannelStatus {
      return {
        connected,
        channelType: "webchat",
      };
    },
  };
}
