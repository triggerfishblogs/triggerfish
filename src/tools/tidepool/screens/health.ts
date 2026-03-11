/**
 * Health dashboard types and metric card definitions.
 *
 * @module
 */

import type { StatusLevel } from "../components/status_dot.ts";

/** Overall platform health status. */
export type HealthStatus = "HEALTHY" | "WARNING" | "CRITICAL";

/** Health metric card definition. */
export interface HealthMetricCard {
  readonly id: string;
  readonly label: string;
  readonly status: StatusLevel;
  readonly value: string;
  readonly detail?: string;
}

/** A single time-series data point. */
export interface TimeSeriesPoint {
  readonly t: string;
  readonly v: number;
}

/** Named time-series for dashboard charts. */
export interface TimeSeries {
  readonly id: string;
  readonly label: string;
  readonly points: readonly TimeSeriesPoint[];
}

/** Health snapshot from patrol diagnostics. */
export interface HealthSnapshot {
  readonly overall: HealthStatus;
  readonly cards: readonly HealthMetricCard[];
  readonly timeSeries: readonly TimeSeries[];
  readonly timestamp: string;
}

/** Live metric update event. */
export interface LiveMetricEvent {
  readonly topic: "health";
  readonly type: "metric_update";
  readonly cardId: string;
  readonly status: StatusLevel;
  readonly value: string;
  readonly detail?: string;
}

/** Map health status to status level. */
export function resolveHealthStatusLevel(
  status: HealthStatus,
): StatusLevel {
  switch (status) {
    case "HEALTHY":
      return "green";
    case "WARNING":
      return "yellow";
    case "CRITICAL":
      return "red";
  }
}

/** Metric card IDs for the health dashboard. */
export const HEALTH_CARD_IDS = [
  "gateway",
  "uptime",
  "memory",
  "channels",
  "sessions",
  "llm",
  "policy",
  "skills",
  "secrets",
  "security",
  "cron",
  "triggers",
  "webhooks",
] as const;

export type HealthCardId = typeof HEALTH_CARD_IDS[number];
