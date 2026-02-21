/**
 * Notification priority routing and deduplication.
 *
 * Determines which channels receive a notification based on its priority:
 * - critical: all registered channels
 * - normal: primary channel only
 * - low: batched for digest delivery
 *
 * Also provides deduplication within a configurable time window.
 *
 * @module
 */

import type { NotificationPriority, DeliverOptions } from "./notifications.ts";

/** Routing decision for a notification. */
export type RoutingDecision = "all_channels" | "primary_only" | "batch_digest";

/** Configuration for the priority router. */
export interface PriorityRouterConfig {
  /** Deduplication window in milliseconds. Default: 300000 (5 minutes). */
  readonly deduplicationWindowMs?: number;
}

/** A deduplication entry tracking when a notification hash was last seen. */
interface DeduplicationEntry {
  readonly hash: string;
  readonly timestamp: number;
}

/** Priority router interface. */
export interface PriorityRouter {
  /** Determine routing for a notification based on its priority. */
  route(priority: NotificationPriority): RoutingDecision;

  /**
   * Check if a notification is a duplicate within the deduplication window.
   * Returns true if the notification should be suppressed.
   */
  isDuplicate(options: DeliverOptions): boolean;

  /** Record a notification as delivered (for deduplication tracking). */
  recordDelivery(options: DeliverOptions): void;

  /** Clear expired deduplication entries. */
  sweep(): void;
}

/**
 * Create a simple hash of a notification for deduplication.
 * Combines userId + message to identify duplicates.
 */
function hashNotification(options: DeliverOptions): string {
  return `${options.userId as string}:${options.message}`;
}

/**
 * Create a notification priority router.
 *
 * @param config - Router configuration
 * @returns A PriorityRouter instance
 */
export function createPriorityRouter(
  config?: PriorityRouterConfig,
): PriorityRouter {
  const deduplicationWindowMs = config?.deduplicationWindowMs ?? 300_000;
  const seen = new Map<string, DeduplicationEntry>();

  return {
    route(priority: NotificationPriority): RoutingDecision {
      switch (priority) {
        case "critical":
          return "all_channels";
        case "normal":
          return "primary_only";
        case "low":
          return "batch_digest";
      }
    },

    isDuplicate(options: DeliverOptions): boolean {
      const hash = hashNotification(options);
      const entry = seen.get(hash);
      if (!entry) return false;
      return (Date.now() - entry.timestamp) < deduplicationWindowMs;
    },

    recordDelivery(options: DeliverOptions): void {
      const hash = hashNotification(options);
      seen.set(hash, { hash, timestamp: Date.now() });
    },

    sweep(): void {
      const now = Date.now();
      for (const [key, entry] of seen) {
        if (now - entry.timestamp >= deduplicationWindowMs) {
          seen.delete(key);
        }
      }
    },
  };
}
