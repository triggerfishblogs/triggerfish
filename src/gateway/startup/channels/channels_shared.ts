/**
 * Shared types for channel adapter wiring during gateway startup.
 *
 * @module
 */

import type { ChatSession } from "../../chat.ts";
import type { RegisteredChannel } from "../../tools/session/session_tools.ts";
import type { NotificationService } from "../../notifications/notifications.ts";

/** Shared dependencies for channel wiring. */
export interface ChannelWiringDeps {
  readonly chatSession: ChatSession;
  readonly notificationService: NotificationService;
  readonly channelAdapters: Map<string, RegisteredChannel>;
}
