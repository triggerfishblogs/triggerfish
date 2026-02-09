/**
 * Gateway module — WebSocket control plane, enhanced session manager,
 * and notification service.
 *
 * @module
 */

export { createGatewayServer } from "./server.ts";
export type {
  GatewayAddr,
  GatewayServer,
  GatewayServerOptions,
} from "./server.ts";

export { createEnhancedSessionManager } from "./sessions.ts";
export type {
  EnhancedSessionManager,
  SessionListFilter,
  SessionType,
} from "./sessions.ts";

export { createNotificationService } from "./notifications.ts";
export type {
  DeliverOptions,
  Notification,
  NotificationPriority,
  NotificationService,
} from "./notifications.ts";
