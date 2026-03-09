/**
 * Health metric streaming and patrol snapshot forwarding.
 *
 * @module
 */

import type {
  HealthMetricCard,
  HealthSnapshot,
  HealthStatus,
} from "../screens/health.ts";
import { broadcastJsonToClients } from "./host_broadcast.ts";

/** Live health metric subscribers. */
interface HealthSubscriber {
  readonly socket: WebSocket;
}

/** Tidepool health handler. */
export interface TidepoolHealthHandler {
  /** Subscribe to live metric updates. */
  readonly subscribeLive: (socket: WebSocket) => void;
  /** Unsubscribe from live metrics. */
  readonly unsubscribeLive: (socket: WebSocket) => void;
  /** Get a snapshot of all health metrics. */
  readonly snapshot: () => Promise<HealthSnapshot>;
  /** Push a live metric update to all subscribers. */
  readonly pushMetricUpdate: (card: HealthMetricCard) => void;
  /** Set the snapshot provider function. */
  readonly setSnapshotProvider: (
    provider: () => Promise<HealthSnapshot>,
  ) => void;
}

/** Create a health handler. */
export function createTidepoolHealthHandler(): TidepoolHealthHandler {
  const subscribers: HealthSubscriber[] = [];
  let snapshotProvider: (() => Promise<HealthSnapshot>) | null = null;

  return {
    subscribeLive(socket: WebSocket): void {
      const existing = subscribers.findIndex((s) => s.socket === socket);
      if (existing >= 0) subscribers.splice(existing, 1);
      subscribers.push({ socket });
    },

    unsubscribeLive(socket: WebSocket): void {
      const idx = subscribers.findIndex((s) => s.socket === socket);
      if (idx >= 0) subscribers.splice(idx, 1);
    },

    // deno-lint-ignore require-await
    async snapshot(): Promise<HealthSnapshot> {
      if (snapshotProvider) {
        return snapshotProvider();
      }
      return {
        overall: "HEALTHY" as HealthStatus,
        cards: [],
        timestamp: new Date().toISOString(),
      };
    },

    pushMetricUpdate(card: HealthMetricCard): void {
      const json = JSON.stringify({
        topic: "health",
        type: "metric_update",
        cardId: card.id,
        status: card.status,
        value: card.value,
        detail: card.detail,
      });
      const sockets = new Set(subscribers.map((s) => s.socket));
      broadcastJsonToClients(sockets, json);
    },

    setSnapshotProvider(
      provider: () => Promise<HealthSnapshot>,
    ): void {
      snapshotProvider = provider;
    },
  };
}
