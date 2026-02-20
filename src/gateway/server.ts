/**
 * Gateway WebSocket Control Plane.
 *
 * Provides a WebSocket server on a configurable port for managing
 * sessions, configuration, channels, and gateway state via JSON-RPC 2.0.
 * Also serves webhook HTTP endpoints when a SchedulerService is attached.
 *
 * Sub-modules:
 * - server_handlers.ts: JSON-RPC dispatch, chat WebSocket, and webhook HTTP handlers
 *
 * @module
 */

import type { SchedulerService } from "../scheduler/service.ts";
import type { EnhancedSessionManager } from "./sessions.ts";
import type { NotificationService } from "./notifications.ts";
import type { ChatSession } from "./chat.ts";
import {
  dispatchJsonRpc,
  routeWebhookHttp,
  upgradeChatWebSocket,
} from "./server_handlers.ts";
import type { JsonRpcRequest } from "./server_handlers.ts";

// Re-export handler types for backward compatibility
export type { JsonRpcRequest, JsonRpcResponse } from "./server_handlers.ts";

/** Options for creating a gateway server. */
export interface GatewayServerOptions {
  /** Port to listen on. Use 0 for a random available port. */
  readonly port?: number;
  /** Authentication token for connections. */
  readonly token?: string;
  /** Optional scheduler service for webhook endpoints. */
  readonly schedulerService?: SchedulerService;
  /** Optional session manager for JSON-RPC session methods. */
  readonly sessionManager?: EnhancedSessionManager;
  /** Optional notification service for JSON-RPC notification methods. */
  readonly notificationService?: NotificationService;
  /** Optional chat session for /chat WebSocket endpoint. */
  readonly chatSession?: ChatSession;
}

/** Address information returned after server start. */
export interface GatewayAddr {
  readonly port: number;
  readonly hostname: string;
}

/** Gateway server interface. */
export interface GatewayServer {
  /** Start the server. Returns the bound address. */
  start(): Promise<GatewayAddr>;
  /** Stop the server gracefully. */
  stop(): Promise<void>;
  /**
   * Broadcast a JSON event to all currently connected /chat WebSocket clients.
   * Used for push notifications such as MCP server status changes.
   */
  broadcastChatEvent(event: Record<string, unknown>): void;
  /**
   * Broadcast a trigger/scheduler notification to all connected /chat WebSocket clients.
   */
  broadcastNotification(message: string): void;
}

/**
 * Create a Gateway WebSocket server.
 *
 * The server listens on the configured port (default 18789) and
 * accepts JSON-RPC 2.0 messages over WebSocket connections. When a
 * SchedulerService is provided, POST /webhooks/:sourceId routes
 * are served for inbound webhook events. When a ChatSession is
 * provided, /chat WebSocket connections are routed to it.
 */
export function createGatewayServer(
  options?: GatewayServerOptions,
): GatewayServer {
  const port = options?.port ?? 18789;
  const schedulerService = options?.schedulerService;
  const sessionManager = options?.sessionManager;
  const notificationService = options?.notificationService;
  const chatSession = options?.chatSession;
  let server: Deno.HttpServer | null = null;
  let resolvedAddr: GatewayAddr | null = null;
  // Track all open /chat WebSocket connections for broadcasting
  const chatSockets = new Set<WebSocket>();

  return {
    broadcastChatEvent(event: Record<string, unknown>): void {
      const json = JSON.stringify(event);
      for (const ws of chatSockets) {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(json);
          }
        } catch {
          chatSockets.delete(ws);
        }
      }
    },

    broadcastNotification(message: string): void {
      const json = JSON.stringify({ type: "notification", message });
      for (const ws of chatSockets) {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(json);
          }
        } catch {
          chatSockets.delete(ws);
        }
      }
    },

    // deno-lint-ignore require-await
    async start(): Promise<GatewayAddr> {
      const addrPromise = Promise.withResolvers<GatewayAddr>();

      server = Deno.serve(
        {
          port,
          hostname: "127.0.0.1",
          onListen(addr) {
            resolvedAddr = { port: addr.port, hostname: addr.hostname };
            addrPromise.resolve(resolvedAddr);
          },
        },
        (request: Request): Response | Promise<Response> => {
          const url = new URL(request.url);

          // Handle WebSocket upgrade
          if (request.headers.get("upgrade") === "websocket") {
            // Route /chat to the chat session handler
            if (url.pathname === "/chat" && chatSession) {
              return upgradeChatWebSocket(request, chatSession, chatSockets);
            }

            // All other WebSocket connections: JSON-RPC control plane
            const { socket, response } = Deno.upgradeWebSocket(request);

            socket.addEventListener("message", async (event: MessageEvent) => {
              try {
                const data = typeof event.data === "string"
                  ? event.data
                  : new TextDecoder().decode(event.data as ArrayBuffer);
                const rpcRequest = JSON.parse(data) as JsonRpcRequest;

                if (rpcRequest.jsonrpc !== "2.0" || !rpcRequest.method) {
                  socket.send(JSON.stringify({
                    jsonrpc: "2.0",
                    id: rpcRequest.id ?? null,
                    error: { code: -32600, message: "Invalid JSON-RPC request" },
                  }));
                  return;
                }

                const rpcResponse = await dispatchJsonRpc(
                  rpcRequest,
                  sessionManager,
                  notificationService,
                );
                socket.send(JSON.stringify(rpcResponse));
              } catch {
                socket.send(JSON.stringify({
                  jsonrpc: "2.0",
                  id: null,
                  error: { code: -32700, message: "Parse error" },
                }));
              }
            });

            return response;
          }

          // Handle webhook endpoints: POST /webhooks/:sourceId
          if (
            request.method === "POST" &&
            url.pathname.startsWith("/webhooks/") &&
            schedulerService
          ) {
            return routeWebhookHttp(request, url, schedulerService);
          }

          // Debug: force an immediate trigger run
          if (
            request.method === "POST" &&
            url.pathname === "/debug/run-triggers"
          ) {
            if (!schedulerService) {
              return new Response(
                JSON.stringify({ error: "Scheduler not configured" }),
                { status: 503, headers: { "content-type": "application/json" } },
              );
            }
            schedulerService.runTrigger().catch(() => {
              // fire-and-forget; errors are logged inside runTrigger
            });
            return new Response(
              JSON.stringify({ ok: true, message: "Trigger fired" }),
              { status: 200, headers: { "content-type": "application/json" } },
            );
          }

          // Default HTTP response
          return new Response("Triggerfish Gateway", { status: 200 });
        },
      );

      return addrPromise.promise;
    },

    async stop(): Promise<void> {
      if (server) {
        await server.shutdown();
        server = null;
        resolvedAddr = null;
      }
    },
  };
}
