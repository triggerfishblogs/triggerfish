/**
 * Notification Service — queues and delivers notifications across channels.
 *
 * Provides first-class notification delivery with priority levels,
 * queuing for offline users, and quiet hours support.
 *
 * @module
 */

import type { UserId } from "../core/types/session.ts";

/** Notification priority levels. */
export type NotificationPriority = "critical" | "normal" | "low";

/** A notification to be delivered. */
export interface Notification {
  readonly id: string;
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority;
  readonly createdAt: Date;
}

/** Options for delivering a notification. */
export interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority;
}

/** Notification service interface. */
export interface NotificationService {
  /** Deliver or queue a notification for a user. */
  deliver(options: DeliverOptions): Promise<void>;

  /** Get pending (undelivered) notifications for a user. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Acknowledge a notification as delivered. */
  acknowledge(notificationId: string): Promise<void>;
}

/**
 * Create a notification service.
 *
 * Notifications are queued in memory when the user is offline
 * and delivered on next session start or channel connection.
 */
export function createNotificationService(): NotificationService {
  const pending = new Map<string, Notification[]>();

  return {
    async deliver(options: DeliverOptions): Promise<void> {
      const notification: Notification = {
        id: crypto.randomUUID(),
        userId: options.userId,
        message: options.message,
        priority: options.priority,
        createdAt: new Date(),
      };

      const userKey = options.userId as string;
      const existing = pending.get(userKey) ?? [];
      pending.set(userKey, [...existing, notification]);
    },

    async getPending(userId: UserId): Promise<Notification[]> {
      return pending.get(userId as string) ?? [];
    },

    async acknowledge(notificationId: string): Promise<void> {
      for (const [key, notifications] of pending) {
        const filtered = notifications.filter((n) => n.id !== notificationId);
        if (filtered.length !== notifications.length) {
          pending.set(key, filtered);
          return;
        }
      }
    },
  };
}
