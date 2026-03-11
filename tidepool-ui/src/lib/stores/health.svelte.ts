/**
 * Health store — metrics, overall status.
 */

import type {
  HealthCard,
  HealthStatus,
  StatusColor,
  TimeSeries,
} from "../types.js";
import { statusToColor } from "../types.js";
import { onTopic, send } from "./websocket.svelte.js";
import { setStatusDot } from "./nav.svelte.js";

/** Overall health status. */
let _overallStatus: HealthStatus = $state("HEALTHY");

/** Metric cards. */
let _cards: HealthCard[] = $state([]);

/** Time-series data for charts. */
let _timeSeries: TimeSeries[] = $state([]);

/** Get overall health status. */
export function getOverallStatus(): HealthStatus {
  return _overallStatus;
}

/** Get metric cards. */
export function getCards(): HealthCard[] {
  return _cards;
}

/** Get time-series data. */
export function getTimeSeries(): TimeSeries[] {
  return _timeSeries;
}

/** Request a health snapshot. */
export function requestSnapshot(): void {
  send({ topic: "health", action: "snapshot" });
}

/** Subscribe to live health updates. */
export function subscribeLive(): void {
  send({ topic: "health", action: "subscribe_live" });
}

/** Unsubscribe from live health updates. */
export function unsubscribeLive(): void {
  send({ topic: "health", action: "unsubscribe_live" });
}

function statusToHealthColor(status: HealthStatus): StatusColor {
  switch (status) {
    case "HEALTHY":
      return "green";
    case "WARNING":
      return "yellow";
    case "CRITICAL":
      return "red";
  }
}

function handleMessage(msg: Record<string, unknown>): void {
  switch (msg.type) {
    case "snapshot":
      _overallStatus = msg.overall as HealthStatus;
      _cards = (msg.cards as Record<string, unknown>[]).map((c) => ({
        cardId: (c.id as string) ?? (c.cardId as string),
        label: (c.label as string) ?? "",
        status: statusToColor(c.status as string),
        value: c.value as string,
        detail: (c.detail as string) ?? "",
      }));
      if (Array.isArray(msg.timeSeries)) {
        _timeSeries = msg.timeSeries as TimeSeries[];
      }
      setStatusDot("health", statusToHealthColor(_overallStatus));
      break;

    case "metric_update": {
      const id = (msg.id as string) ?? (msg.cardId as string);
      const idx = _cards.findIndex((c) => c.cardId === id);
      if (idx >= 0) {
        _cards[idx] = {
          cardId: id,
          label: (msg.label as string) ?? _cards[idx].label,
          status: statusToColor(msg.status as string),
          value: msg.value as string,
          detail: (msg.detail as string) ?? _cards[idx].detail,
        };
      }
      break;
    }
  }
}

onTopic("health", handleMessage);
