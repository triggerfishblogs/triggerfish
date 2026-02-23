/**
 * A2UI WebSocket host — barrel exports.
 *
 * Re-exports host interfaces, factory, broadcast helpers, chat dispatch,
 * and server routing from their individual modules.
 *
 * @module
 */

// Host factory and legacy re-exports
export type { A2UIHost, A2UIHostOptions, TidepoolHost, TidepoolHostOptions } from "./host.ts";
export { createA2UIHost, createTidepoolHost } from "./host.ts";

// Host state and internal types
export type { A2UIHostState } from "./host_types.ts";

// Broadcast helpers
export { trySendSocketPayload, broadcastJsonToClients, sendInitialClientState } from "./host_broadcast.ts";

// Chat dispatch
export type { AbortControllerRef, ChatDispatchContext } from "./host_chat.ts";
export { dispatchClientChatMessage } from "./host_chat.ts";

// Server routing
export { upgradeWebSocketClient, routeHostRequest, closeAllClientSockets } from "./host_server.ts";
