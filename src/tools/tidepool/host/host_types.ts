/**
 * A2UI host interfaces and internal state type.
 *
 * Defines the public A2UIHost interface, its construction options,
 * and the mutable state structure shared across the host closure.
 *
 * @module
 */

import type { ComponentTree } from "../components.ts";
import type { CanvasMessage } from "../canvas_protocol.ts";

// ---------------------------------------------------------------------------
// A2UI WebSocket Host — public interfaces
// ---------------------------------------------------------------------------

/** Options for creating an A2UI host. */
export interface A2UIHostOptions {
  /** Chat session for handling browser chat messages. */
  readonly chatSession?: import("../../../gateway/chat.ts").ChatSession;
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
// Internal mutable state shared across the A2UI host closure
// ---------------------------------------------------------------------------

/** Mutable state shared across the A2UI host closure. */
export interface A2UIHostState {
  readonly clients: Set<WebSocket>;
  server: Deno.HttpServer | null;
  currentTree: ComponentTree | null;
  resolvedPort: number;
  cachedHtml: string | null;
  /** Last known MCP connected count; -1 means no status yet. */
  lastMcpConnected: number;
  lastMcpConfigured: number;
}
