/**
 * Gateway WebSocket Control Plane.
 *
 * Provides a WebSocket server on a configurable port for managing
 * sessions, configuration, channels, and gateway state via JSON-RPC.
 * Also serves webhook HTTP endpoints when a SchedulerService is attached.
 *
 * @module
 */

import type { SchedulerService } from "../scheduler/service.ts";

/** Options for creating a gateway server. */
export interface GatewayServerOptions {
  /** Port to listen on. Use 0 for a random available port. */
  readonly port?: number;
  /** Authentication token for connections. */
  readonly token?: string;
  /** Optional scheduler service for webhook endpoints. */
  readonly schedulerService?: SchedulerService;
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
}

/**
 * Handle an inbound webhook HTTP request.
 *
 * Routes POST /webhooks/:sourceId to the scheduler service,
 * reading the HMAC signature from standard webhook headers.
 */
async function handleWebhookHttp(
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

/**
 * Create a Gateway WebSocket server.
 *
 * The server listens on the configured port (default 18789) and
 * accepts JSON-RPC messages over WebSocket connections. When a
 * SchedulerService is provided, POST /webhooks/:sourceId routes
 * are served for inbound webhook events.
 */
export function createGatewayServer(
  options?: GatewayServerOptions,
): GatewayServer {
  const port = options?.port ?? 18789;
  const schedulerService = options?.schedulerService;
  let server: Deno.HttpServer | null = null;
  let resolvedAddr: GatewayAddr | null = null;

  return {
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
          // Handle WebSocket upgrade
          if (request.headers.get("upgrade") === "websocket") {
            const { socket, response } = Deno.upgradeWebSocket(request);

            socket.addEventListener("message", (_event: MessageEvent) => {
              // JSON-RPC message handling will be expanded
            });

            return response;
          }

          // Handle webhook endpoints: POST /webhooks/:sourceId
          const url = new URL(request.url);
          if (
            request.method === "POST" &&
            url.pathname.startsWith("/webhooks/") &&
            schedulerService
          ) {
            return handleWebhookHttp(request, url, schedulerService);
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
