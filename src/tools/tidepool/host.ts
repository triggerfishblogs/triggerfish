/**
 * Tide Pool host for A2UI (Agent-to-UI) protocol.
 *
 * Provides two host implementations:
 * - TidepoolHost: callback-based host for HTML push/eval/reset/snapshot
 * - A2UIHost: WebSocket server that broadcasts component trees and canvas
 *   messages to clients, optionally handles chat via a ChatSession
 *
 * @module
 */

import type { ComponentTree } from "./components.ts";
import type { ChatClientMessage, ChatSession } from "../../gateway/chat.ts";
import type { MessageContent } from "../../core/image/content.ts";
import type {
  CanvasMessage,
  CanvasRenderComponentMessage,
} from "./canvas_protocol.ts";
import { buildTidepoolHtml } from "./ui.ts";

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

/** Options for creating an A2UI host. */
export interface A2UIHostOptions {
  /** Chat session for handling browser chat messages. */
  readonly chatSession?: ChatSession;
}

/** A2UI WebSocket host that broadcasts component trees and canvas messages to connected clients. */
export interface A2UIHost {
  /** Start the WebSocket server on the given port. */
  start(port: number): Promise<void>;
  /** Stop the WebSocket server gracefully. */
  stop(): Promise<void>;
  /** Send a typed canvas message to all connected clients. */
  sendCanvas(message: CanvasMessage): void;
  /** Broadcast an updated component tree to all connected clients (wraps in canvas message). */
  broadcast(tree: ComponentTree): void;
  /**
   * Broadcast MCP server connection status to all connected Tidepool clients.
   * @param connected - Number of currently connected MCP servers
   * @param configured - Total number of configured (non-disabled) MCP servers
   */
  broadcastMcpStatus(connected: number, configured: number): void;
  /**
   * Broadcast a trigger/scheduler notification to all connected Tidepool clients.
   */
  broadcastNotification(message: string): void;
  /** The number of currently connected WebSocket clients. */
  readonly connections: number;
}

// ---------------------------------------------------------------------------
// Mutable state shared across the A2UI host closure
// ---------------------------------------------------------------------------

interface A2UIHostState {
  readonly clients: Set<WebSocket>;
  server: Deno.HttpServer | null;
  currentTree: ComponentTree | null;
  resolvedPort: number;
  cachedHtml: string | null;
  /** Last known MCP connected count; -1 means no status yet. */
  lastMcpConnected: number;
  lastMcpConfigured: number;
}

// ---------------------------------------------------------------------------
// Extracted helpers (unexported, placed above factory)
// ---------------------------------------------------------------------------

/** Safely send a string payload to a single socket, swallowing send errors. */
function trySendSocketPayload(ws: WebSocket, json: string): void {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(json);
    }
  } catch {
    // Client may have disconnected
  }
}

/** Send a JSON-serialized message to all open clients, pruning dead sockets. */
function broadcastJsonToClients(
  clients: Set<WebSocket>,
  json: string,
): void {
  for (const ws of clients) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(json);
      }
    } catch {
      clients.delete(ws);
    }
  }
}

/** Send current component tree, chat-connected event, and MCP status to a newly opened socket. */
function sendInitialClientState(
  socket: WebSocket,
  state: A2UIHostState,
  chatSession: ChatSession | undefined,
): void {
  if (state.currentTree) {
    socket.send(JSON.stringify(state.currentTree));
  }
  if (chatSession) {
    trySendSocketPayload(
      socket,
      JSON.stringify({
        type: "connected",
        provider: chatSession.providerName,
        model: chatSession.modelName,
      }),
    );
  }
  if (state.lastMcpConnected >= 0 && state.lastMcpConfigured > 0) {
    trySendSocketPayload(
      socket,
      JSON.stringify({
        type: "mcp_status",
        connected: state.lastMcpConnected,
        configured: state.lastMcpConfigured,
      }),
    );
  }
}

/** Mutable holder so event-listener closures can read/write the current AbortController. */
interface AbortControllerRef {
  current: AbortController | null;
}

/** Parse and dispatch a client chat message (cancel, clear, secret_prompt_response, message). */
function dispatchClientChatMessage(
  rawData: string | ArrayBuffer,
  socket: WebSocket,
  chatSession: ChatSession,
  ref: AbortControllerRef,
): void {
  const text = typeof rawData === "string"
    ? rawData
    : new TextDecoder().decode(rawData as ArrayBuffer);
  const msg = JSON.parse(text) as ChatClientMessage;

  if (msg.type === "cancel") {
    dispatchCancelMessage(socket, ref);
    return;
  }
  if (msg.type === "clear") {
    chatSession.clear();
    return;
  }
  if (msg.type === "secret_prompt_response") {
    chatSession.handleSecretPromptResponse(msg.nonce, msg.value);
    return;
  }
  if (
    msg.type === "message" &&
    (typeof msg.content === "string" ||
      (Array.isArray(msg.content) && msg.content.length > 0))
  ) {
    executeAgentTurnFromSocket(socket, chatSession, msg.content, ref);
  }
}

/** Handle a cancel message by aborting the current agent turn. */
function dispatchCancelMessage(
  socket: WebSocket,
  ref: AbortControllerRef,
): void {
  if (ref.current) {
    ref.current.abort();
    trySendSocketPayload(socket, JSON.stringify({ type: "cancelled" }));
  }
}

/** Start an agent turn, routing events back through the socket. */
function executeAgentTurnFromSocket(
  socket: WebSocket,
  chatSession: ChatSession,
  content: MessageContent,
  ref: AbortControllerRef,
): void {
  ref.current = new AbortController();
  const signal = ref.current.signal;

  const send = (evt: unknown) => {
    trySendSocketPayload(socket, JSON.stringify(evt));
  };

  chatSession.executeAgentTurn(content, send, signal).finally(() => {
    ref.current = null;
  });
}

/** Upgrade a WebSocket request: wire lifecycle listeners and return the upgrade response. */
function upgradeWebSocketClient(
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

  socket.addEventListener("message", (event: MessageEvent) => {
    if (!chatSession) return;
    try {
      dispatchClientChatMessage(event.data, socket, chatSession, ref);
    } catch {
      // Ignore malformed messages
    }
  });

  socket.addEventListener("close", () => {
    state.clients.delete(socket);
    ref.current?.abort("client_disconnected");
  });

  socket.addEventListener("error", () => {
    state.clients.delete(socket);
    ref.current?.abort("client_disconnected");
  });

  return response;
}

/** Route an inbound HTTP request to WebSocket upgrade or static HTML response. */
function routeHostRequest(
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
function closeAllClientSockets(clients: Set<WebSocket>): void {
  for (const ws of clients) {
    try {
      ws.close();
    } catch {
      // Client may already be closed
    }
  }
  clients.clear();
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a new A2UI WebSocket host.
 *
 * The host uses `Deno.serve()` to listen for WebSocket upgrade requests.
 * When a client connects it immediately receives the current component
 * tree (if one has been set). Subsequent `sendCanvas()` and `broadcast()`
 * calls push messages to every connected client. Disconnected clients are
 * cleaned up automatically.
 *
 * When a `chatSession` is provided via options, the host also handles
 * incoming chat messages from browser clients and serves the Tidepool
 * HTML chat + canvas interface on HTTP requests.
 */
export function createA2UIHost(options?: A2UIHostOptions): A2UIHost {
  const chatSession = options?.chatSession;

  const state: A2UIHostState = {
    clients: new Set<WebSocket>(),
    server: null,
    currentTree: null,
    resolvedPort: 0,
    cachedHtml: null,
    lastMcpConnected: -1,
    lastMcpConfigured: 0,
  };

  const host: A2UIHost = {
    async start(port: number): Promise<void> {
      state.cachedHtml = buildTidepoolHtml();
      const ready = Promise.withResolvers<void>();

      state.server = Deno.serve(
        {
          port,
          hostname: "127.0.0.1",
          onListen(addr) {
            state.resolvedPort = addr.port;
            ready.resolve();
          },
        },
        (request: Request): Response =>
          routeHostRequest(request, state, chatSession),
      );

      await ready.promise;
    },

    async stop(): Promise<void> {
      closeAllClientSockets(state.clients);

      if (state.server) {
        await state.server.shutdown();
        state.server = null;
      }
      state.resolvedPort = 0;
      state.currentTree = null;
      state.cachedHtml = null;
    },

    sendCanvas(message: CanvasMessage): void {
      if (message.type === "canvas_render_component") {
        state.currentTree = (message as CanvasRenderComponentMessage).tree;
      } else if (message.type === "canvas_clear") {
        state.currentTree = null;
      }
      broadcastJsonToClients(state.clients, JSON.stringify(message));
    },

    broadcast(tree: ComponentTree): void {
      state.currentTree = tree;
      const msg: CanvasRenderComponentMessage = {
        type: "canvas_render_component",
        id: crypto.randomUUID(),
        label: "Component Tree",
        tree,
      };
      broadcastJsonToClients(state.clients, JSON.stringify(msg));
    },

    broadcastMcpStatus(connected: number, configured: number): void {
      state.lastMcpConnected = connected;
      state.lastMcpConfigured = configured;
      broadcastJsonToClients(
        state.clients,
        JSON.stringify({ type: "mcp_status", connected, configured }),
      );
    },

    broadcastNotification(message: string): void {
      broadcastJsonToClients(
        state.clients,
        JSON.stringify({ type: "notification", message }),
      );
    },

    get connections(): number {
      return state.clients.size;
    },
  };

  return host;
}
