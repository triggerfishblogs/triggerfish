/**
 * A2UI WebSocket host — barrel exports.
 *
 * Re-exports host interfaces, factory, broadcast helpers, chat dispatch,
 * and server routing from their individual modules.
 *
 * @module
 */

// Host factory and legacy re-exports
export type {
  A2UIHost,
  A2UIHostOptions,
  TidepoolHost,
  TidepoolHostOptions,
} from "./host.ts";
export { createA2UIHost, createTidepoolHost } from "./host.ts";

// Host state and internal types
export type { A2UIHostState, TopicHandler } from "./host_types.ts";

// Broadcast helpers
export {
  broadcastJsonToClients,
  sendInitialClientState,
  trySendSocketPayload,
} from "./host_broadcast.ts";

// Chat dispatch
export type { AbortControllerRef, ChatDispatchContext } from "./host_chat.ts";
export { dispatchClientChatMessage } from "./host_chat.ts";

// Server routing
export {
  closeAllClientSockets,
  routeHostRequest,
  upgradeWebSocketClient,
} from "./host_server.ts";

// Topic-specific host handlers
export type { TidepoolLogSink } from "./host_logs.ts";
export { createTidepoolLogSink } from "./host_logs.ts";

export type { TidepoolMemoryHandler } from "./host_memory.ts";
export { createTidepoolMemoryHandler } from "./host_memory.ts";

export type { TidepoolHealthHandler } from "./host_health.ts";
export { createTidepoolHealthHandler } from "./host_health.ts";

export type { TidepoolAgentsHandler } from "./host_agents.ts";
export { createTidepoolAgentsHandler } from "./host_agents.ts";

export type {
  ConfigFieldError,
  ConfigValidationResult,
  TidepoolConfigHandler,
} from "./host_config.ts";
export { createTidepoolConfigHandler } from "./host_config.ts";

// Topic dispatch factories
export {
  createAgentsTopicDispatcher,
  createHealthTopicDispatcher,
  createLogsTopicDispatcher,
  createMemoryTopicDispatcher,
  createSettingsTopicDispatcher,
} from "./host_topic_dispatch.ts";
