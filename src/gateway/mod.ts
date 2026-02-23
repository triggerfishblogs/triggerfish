/**
 * Gateway module — WebSocket control plane, enhanced session manager,
 * and notification service.
 *
 * @module
 */

export { createGatewayServer } from "./server/server.ts";
export type {
  GatewayAddr,
  GatewayServer,
  GatewayServerOptions,
} from "./server/server.ts";

export { createEnhancedSessionManager } from "./sessions.ts";
export type {
  EnhancedSessionManager,
  SessionListFilter,
  SessionType,
} from "./sessions.ts";

export { createNotificationService } from "./notifications/notifications.ts";
export type {
  DeliverOptions,
  DeliveryChannel,
  Notification,
  NotificationPriority,
  NotificationService,
} from "./notifications/notifications.ts";

export { createPriorityRouter } from "./notifications/priority_router.ts";
export type {
  PriorityRouter,
  PriorityRouterConfig,
  RoutingDecision,
} from "./notifications/priority_router.ts";

export { createConfigWatcher } from "./startup/services/config_watcher.ts";
export type {
  ConfigChangeCallback,
  ConfigWatcher,
} from "./startup/services/config_watcher.ts";

export {
  getSessionToolDefinitions,
  createSessionToolExecutor,
  SESSION_TOOLS_SYSTEM_PROMPT,
} from "./tools/session/session_tools.ts";
export type { SessionToolContext } from "./tools/session/session_tools.ts";

export { createChatSession } from "./chat.ts";
export type {
  ChatEvent,
  ChatClientMessage,
  ChatEventSender,
  ChatSession,
  ChatSessionConfig,
} from "./chat.ts";

export {
  getTriggerToolDefinitions,
  createTriggerToolExecutor,
  TRIGGER_TOOLS_SYSTEM_PROMPT,
} from "./tools/trigger/trigger_tools.ts";
export type { TriggerToolContext } from "./tools/trigger/trigger_tools.ts";
