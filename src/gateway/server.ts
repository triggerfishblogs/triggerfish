/**
 * Gateway WebSocket Control Plane.
 *
 * Provides a WebSocket server on a configurable port for managing
 * sessions, configuration, channels, and gateway state via JSON-RPC.
 *
 * @module
 */

/** Options for creating a gateway server. */
export interface GatewayServerOptions {
  /** Port to listen on. Use 0 for a random available port. */
  readonly port?: number;
  /** Authentication token for connections. */
  readonly token?: string;
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
 * Create a Gateway WebSocket server.
 *
 * The server listens on the configured port (default 18789) and
 * accepts JSON-RPC messages over WebSocket connections.
 */
export function createGatewayServer(
  options?: GatewayServerOptions,
): GatewayServer {
  const port = options?.port ?? 18789;
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
        (request: Request): Response => {
          // Handle WebSocket upgrade
          if (request.headers.get("upgrade") === "websocket") {
            const { socket, response } = Deno.upgradeWebSocket(request);

            socket.addEventListener("message", (_event: MessageEvent) => {
              // JSON-RPC message handling will be expanded
            });

            return response;
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
