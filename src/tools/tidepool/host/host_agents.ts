/**
 * Agent session list streaming and per-session transcript subscription.
 *
 * @module
 */

import type { AgentSessionCard } from "../screens/agents.ts";
import {
  broadcastJsonToClients,
  trySendSocketPayload,
} from "./host_broadcast.ts";

/** Per-session transcript subscriber. */
interface SessionSubscriber {
  readonly socket: WebSocket;
  readonly sessionId: string;
}

/** Tidepool agents handler. */
export interface TidepoolAgentsHandler {
  /** Subscribe to the session list updates. */
  readonly subscribeList: (socket: WebSocket) => void;
  /** Unsubscribe from the session list. */
  readonly unsubscribeList: (socket: WebSocket) => void;
  /** Subscribe to a specific session's transcript. */
  readonly subscribeSession: (
    socket: WebSocket,
    sessionId: string,
  ) => void;
  /** Unsubscribe from a specific session's transcript. */
  readonly unsubscribeSession: (
    socket: WebSocket,
    sessionId: string,
  ) => void;
  /** Broadcast a session list update to all list subscribers. */
  readonly pushSessionListUpdate: (
    sessions: readonly AgentSessionCard[],
  ) => void;
  /** Forward a transcript event to subscribers of a specific session. */
  readonly pushSessionEvent: (
    sessionId: string,
    event: Record<string, unknown>,
  ) => void;
  /** Clean up all subscriptions for a disconnected socket. */
  readonly removeSocket: (socket: WebSocket) => void;
}

/** Create an agents handler. */
export function createTidepoolAgentsHandler(): TidepoolAgentsHandler {
  const listSubscribers = new Set<WebSocket>();
  const sessionSubscribers: SessionSubscriber[] = [];

  return {
    subscribeList(socket: WebSocket): void {
      listSubscribers.add(socket);
    },

    unsubscribeList(socket: WebSocket): void {
      listSubscribers.delete(socket);
    },

    subscribeSession(socket: WebSocket, sessionId: string): void {
      const exists = sessionSubscribers.some(
        (s) => s.socket === socket && s.sessionId === sessionId,
      );
      if (!exists) sessionSubscribers.push({ socket, sessionId });
    },

    unsubscribeSession(socket: WebSocket, sessionId: string): void {
      const idx = sessionSubscribers.findIndex(
        (s) => s.socket === socket && s.sessionId === sessionId,
      );
      if (idx >= 0) sessionSubscribers.splice(idx, 1);
    },

    pushSessionListUpdate(
      sessions: readonly AgentSessionCard[],
    ): void {
      const json = JSON.stringify({
        topic: "agents",
        type: "session_list",
        sessions,
      });
      broadcastJsonToClients(listSubscribers, json);
    },

    pushSessionEvent(
      sessionId: string,
      event: Record<string, unknown>,
    ): void {
      const json = JSON.stringify({
        ...event,
        topic: "agents",
        sessionId,
      });
      for (const sub of sessionSubscribers) {
        if (sub.sessionId === sessionId) {
          trySendSocketPayload(sub.socket, json);
        }
      }
    },

    removeSocket(socket: WebSocket): void {
      listSubscribers.delete(socket);
      for (let i = sessionSubscribers.length - 1; i >= 0; i--) {
        if (sessionSubscribers[i].socket === socket) {
          sessionSubscribers.splice(i, 1);
        }
      }
    },
  };
}
