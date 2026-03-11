/**
 * WebSocket connection store with exponential backoff reconnect.
 *
 * Single connection dispatches to topic-specific stores.
 */

import type { ConnectionState } from "../types.js";

type MessageHandler = (msg: Record<string, unknown>) => void;

const topicHandlers = new Map<string, Set<MessageHandler>>();

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 1000;
const MAX_RECONNECT_DELAY = 30_000;

/** Reactive connection state. */
let _connectionState: ConnectionState = $state("disconnected");

/** Get the current connection state. */
export function getConnectionState(): ConnectionState {
  return _connectionState;
}

/** Register a handler for a topic. */
export function onTopic(topic: string, handler: MessageHandler): void {
  let handlers = topicHandlers.get(topic);
  if (!handlers) {
    handlers = new Set();
    topicHandlers.set(topic, handlers);
  }
  handlers.add(handler);
}

/** Unregister a handler for a topic. */
export function offTopic(topic: string, handler: MessageHandler): void {
  topicHandlers.get(topic)?.delete(handler);
}

/** Dispatch a message to the appropriate topic handlers. */
function dispatch(msg: Record<string, unknown>): void {
  const topic = (msg.topic as string) ?? "chat";
  const handlers = topicHandlers.get(topic);
  if (handlers) {
    for (const handler of handlers) {
      handler(msg);
    }
  }
}

/** Send a JSON message through the WebSocket. */
export function send(obj: Record<string, unknown>): void {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

/** Get whether the WebSocket is currently connected. */
export function isConnected(): boolean {
  return ws?.readyState === WebSocket.OPEN;
}

/** Connect the WebSocket. */
export function connect(): void {
  if (ws) return;

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const url = `${protocol}//${location.host}/ws`;

  _connectionState = "connecting";
  ws = new WebSocket(url);

  ws.onopen = () => {
    _connectionState = "connected";
    reconnectDelay = 1000;
    dispatch({ topic: "shell", type: "ws_connected" });
  };

  ws.onclose = () => {
    _connectionState = "disconnected";
    ws = null;
    dispatch({ topic: "shell", type: "ws_disconnected" });
    scheduleReconnect();
  };

  ws.onerror = () => {
    dispatch({ topic: "shell", type: "ws_error" });
  };

  ws.onmessage = (event) => {
    const data =
      typeof event.data === "string"
        ? event.data
        : new TextDecoder().decode(event.data as ArrayBuffer);
    try {
      const msg = JSON.parse(data) as Record<string, unknown>;
      dispatch(msg);
    } catch {
      // Ignore non-JSON messages
    }
  };
}

/** Schedule a reconnection with exponential backoff. */
function scheduleReconnect(): void {
  if (reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
    connect();
  }, reconnectDelay);
}

/** Disconnect the WebSocket. */
export function disconnect(): void {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.onclose = null;
    ws.close();
    ws = null;
  }
  _connectionState = "disconnected";
}
