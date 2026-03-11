/**
 * Server-side types for the TidepoolChat component configuration.
 *
 * The TidepoolChat class itself lives in client-side JS (tmpl_components.html).
 * These types define the configuration and subscription protocol.
 *
 * @module
 */

import type { SessionId } from "../../../core/types/session.ts";

/** Configuration for instantiating a TidepoolChat component. */
export interface ChatComponentConfig {
  /** Session to display messages for. */
  readonly sessionId: SessionId;
  /** Whether the chat is read-only (no input bar). */
  readonly readOnly?: boolean;
  /** Container element ID to mount into. */
  readonly containerId: string;
}

/** Chat subscription request sent via WebSocket. */
export interface ChatSubscriptionRequest {
  readonly topic: "agents";
  readonly action: "subscribe_session" | "unsubscribe_session";
  readonly payload: {
    readonly sessionId: string;
  };
}

/** Chat event forwarded to a subscribed session. */
export interface ChatSessionEvent {
  readonly topic: "agents";
  readonly sessionId: string;
  readonly type: string;
  readonly [key: string]: unknown;
}
