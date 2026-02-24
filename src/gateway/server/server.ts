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

import type { SchedulerService } from "../../scheduler/service_types.ts";
import type { EnhancedSessionManager } from "../sessions.ts";
import type { NotificationService } from "../notifications/notifications.ts";
import type { ChatSession } from "../chat.ts";
import {
  dispatchJsonRpc,
  routeWebhookHttp,
  upgradeChatWebSocket,
} from "./handlers.ts";
import { createLogger } from "../../core/logger/logger.ts";
import {
  extractBearerToken,
  rejectWebSocketUpgrade,
} from "../../core/security/websocket_auth.ts";

const log = createLogger("gateway");
import type { JsonRpcRequest } from "./handlers.ts";

/** Maximum total bytes across all HTTP headers on WS upgrade. */
const MAX_GATEWAY_HEADER_BYTES = 8192;

/** Maximum size of an incoming JSON-RPC WebSocket message (1 MB). */
const MAX_JSONRPC_MESSAGE_BYTES = 1 * 1024 * 1024;

/**
 * Validate WebSocket upgrade request headers against size limits.
 *
 * Returns HTTP 431 if total header bytes exceed the limit, null otherwise.
 */
function validateGatewayUpgradeHeaders(request: Request): Response | null {
  let total = 0;
  for (const [k, v] of request.headers.entries()) {
    total += k.length + v.length;
  }
  if (total > MAX_GATEWAY_HEADER_BYTES) {
    log.warn("WebSocket upgrade rejected: headers too large", {
      operation: "validateGatewayUpgradeHeaders",
      totalHeaderBytes: total,
      limitBytes: MAX_GATEWAY_HEADER_BYTES,
    });
    return new Response("Request Header Fields Too Large", { status: 431 });
  }
  return null;
}

// Re-export handler types for backward compatibility
export type { JsonRpcRequest, JsonRpcResponse } from "./handlers.ts";

/** Options for creating a gateway server. */
export interface GatewayServerOptions {
  /** Port to listen on. Use 0 for a random available port. */
  readonly port?: number;
  /** Authentication token for connections. When set, all WebSocket upgrades and the debug endpoint require a matching Bearer token. */
  readonly token?: string;
  /** Allowed WebSocket Origin headers. Use `["*"]` to permit any origin, `["null"]` for file:// origins. When omitted or empty, all origins are permitted. */
  readonly allowedOrigins?: readonly string[];
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
        } catch (err) {
          log.warn("Failed to send chat event to socket, removing stale connection", { err });
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
        } catch (err) {
          log.warn("Failed to send notification to socket, removing stale connection", { err });
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
            const headerRejection = validateGatewayUpgradeHeaders(request);
            if (headerRejection) return headerRejection;

            // Enforce token auth and Origin allowlist before any upgrade
            const rejection = rejectWebSocketUpgrade(request, {
              token: options?.token,
              allowedOrigins: options?.allowedOrigins,
            });
            if (rejection) {
              log.warn("WebSocket upgrade rejected", {
                status: rejection.status,
                reason: rejection.status === 401 ? "invalid_token" : "origin_mismatch",
                origin: request.headers.get("origin") ?? "(none)",
              });
              return rejection;
            }

            // Route /chat to the chat session handler
            if (url.pathname === "/chat" && chatSession) {
              log.ext("DEBUG", "Gateway /chat WS upgrade", {
                origin: request.headers.get("origin") ?? "",
                userAgent: request.headers.get("user-agent") ?? "",
              });
              return upgradeChatWebSocket(request, chatSession, chatSockets);
            }

            // All other WebSocket connections: JSON-RPC control plane
            log.ext("DEBUG", "Gateway control plane WS upgrade", {
              origin: request.headers.get("origin") ?? "",
              userAgent: request.headers.get("user-agent") ?? "",
            });
            const { socket, response } = Deno.upgradeWebSocket(request);

            socket.addEventListener("message", async (event: MessageEvent) => {
              try {
                const data = typeof event.data === "string"
                  ? event.data
                  : new TextDecoder().decode(event.data as ArrayBuffer);

                if (data.length > MAX_JSONRPC_MESSAGE_BYTES) {
                  log.warn("JSON-RPC WebSocket message rejected: exceeds size limit", {
                    operation: "handleJsonRpcSocketMessage",
                    byteLength: data.length,
                    limitBytes: MAX_JSONRPC_MESSAGE_BYTES,
                  });
                  socket.send(JSON.stringify({
                    jsonrpc: "2.0",
                    id: null,
                    error: { code: -32600, message: "Message too large: exceeds 1MB limit" },
                  }));
                  return;
                }

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
              } catch (err) {
                log.warn("JSON-RPC dispatch or JSON parse failed on WebSocket message", { err });
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
            if (!options?.token) {
              log.debug("Debug endpoint auth not configured, proceeding", {
                operation: "debug/run-triggers",
              });
            } else {
              const provided = extractBearerToken(request);
              if (provided !== options.token) {
                log.warn("Debug endpoint access rejected: invalid token", {
                  operation: "debug/run-triggers",
                  reason: "invalid_token",
                });
                return new Response("Unauthorized", { status: 401 });
              }
              log.info("Debug endpoint access authorized", {
                operation: "debug/run-triggers",
              });
            }
            if (!schedulerService) {
              return new Response(
                JSON.stringify({ error: "Scheduler not configured" }),
                { status: 503, headers: { "content-type": "application/json" } },
              );
            }
            schedulerService.runTrigger().catch((err: unknown) => {
              log.warn("Scheduled trigger execution failed via debug endpoint", { err });
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
