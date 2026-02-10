/**
 * Tide Pool host for A2UI (Agent-to-UI) protocol.
 *
 * Provides two host implementations:
 * - TidepoolHost: callback-based host for HTML push/eval/reset/snapshot
 * - A2UIHost: WebSocket server that broadcasts component trees to clients
 *
 * @module
 */

import type { ComponentTree } from "./components.ts";

// ---------------------------------------------------------------------------
// Legacy callback-based TidepoolHost (retained for backward compatibility)
// ---------------------------------------------------------------------------

/** Options for creating a TidepoolHost. */
export interface TidepoolHostOptions {
  /** Called when HTML content is pushed to the tide pool. */
  readonly onPush: (html: string) => void;
  /** Called when the tide pool is reset. */
  readonly onReset?: () => void;
  /** Called when JS is evaluated in the tide pool. */
  readonly onEval?: (js: string) => void;
  /** Called when a snapshot is requested. */
  readonly onSnapshot?: () => string | undefined;
}

/** Tide Pool host instance managing content and state. */
export interface TidepoolHost {
  /** Push HTML content to the tide pool. */
  push(html: string): void;
  /** Evaluate JavaScript in the tide pool sandbox. */
  eval(js: string): void;
  /** Reset the tide pool, clearing all content. */
  reset(): void;
  /** Take a snapshot of the current tide pool state. */
  snapshot(): string | undefined;
}

/** Create a new Tide Pool host. */
export function createTidepoolHost(options: TidepoolHostOptions): TidepoolHost {
  return {
    push(html: string): void {
      options.onPush(html);
    },
    eval(js: string): void {
      if (options.onEval) {
        options.onEval(js);
      }
    },
    reset(): void {
      if (options.onReset) {
        options.onReset();
      }
    },
    snapshot(): string | undefined {
      if (options.onSnapshot) {
        return options.onSnapshot();
      }
      return undefined;
    },
  };
}

// ---------------------------------------------------------------------------
// A2UI WebSocket Host
// ---------------------------------------------------------------------------

/** A2UI WebSocket host that broadcasts component trees to connected clients. */
export interface A2UIHost {
  /** Start the WebSocket server on the given port. */
  start(port: number): Promise<void>;
  /** Stop the WebSocket server gracefully. */
  stop(): Promise<void>;
  /** Broadcast an updated component tree to all connected clients. */
  broadcast(tree: ComponentTree): void;
  /** The number of currently connected WebSocket clients. */
  readonly connections: number;
}

/**
 * Create a new A2UI WebSocket host.
 *
 * The host uses `Deno.serve()` to listen for WebSocket upgrade requests.
 * When a client connects it immediately receives the current component
 * tree (if one has been set). Subsequent `broadcast()` calls push the
 * tree to every connected client. Disconnected clients are cleaned up
 * automatically.
 */
export function createA2UIHost(): A2UIHost {
  const clients = new Set<WebSocket>();
  let server: Deno.HttpServer | null = null;
  let currentTree: ComponentTree | null = null;
  let resolvedPort = 0;

  const host: A2UIHost = {
    async start(port: number): Promise<void> {
      const ready = Promise.withResolvers<void>();

      server = Deno.serve(
        {
          port,
          hostname: "127.0.0.1",
          onListen(addr) {
            resolvedPort = addr.port;
            ready.resolve();
          },
        },
        (request: Request): Response => {
          if (request.headers.get("upgrade") === "websocket") {
            const { socket, response } = Deno.upgradeWebSocket(request);

            socket.addEventListener("open", () => {
              clients.add(socket);
              if (currentTree) {
                socket.send(JSON.stringify(currentTree));
              }
            });

            socket.addEventListener("close", () => {
              clients.delete(socket);
            });

            socket.addEventListener("error", () => {
              clients.delete(socket);
            });

            return response;
          }

          return new Response("Tide Pool A2UI Host", { status: 200 });
        },
      );

      await ready.promise;
    },

    async stop(): Promise<void> {
      // Close all client sockets first
      for (const ws of clients) {
        try {
          ws.close();
        } catch {
          // Client may already be closed
        }
      }
      clients.clear();

      if (server) {
        await server.shutdown();
        server = null;
      }
      resolvedPort = 0;
      currentTree = null;
    },

    broadcast(tree: ComponentTree): void {
      currentTree = tree;
      const json = JSON.stringify(tree);
      for (const ws of clients) {
        try {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(json);
          }
        } catch {
          // Remove clients that fail to receive
          clients.delete(ws);
        }
      }
    },

    get connections(): number {
      return clients.size;
    },
  };

  return host;
}
