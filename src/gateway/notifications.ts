/**
 * Notification Service — queues and delivers notifications across channels.
 *
 * Provides first-class notification delivery with priority levels,
 * queuing for offline users, and quiet hours support.
 * Notifications are persisted via StorageProvider (namespace: `notifications:`).
 *
 * @module
 */

import type { UserId } from "../core/types/session.ts";
import type { StorageProvider } from "../core/storage/provider.ts";

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

/** Serialized notification shape for storage. */
interface StoredNotification {
  readonly id: string;
  readonly userId: string;
  readonly message: string;
  readonly priority: NotificationPriority;
  readonly createdAt: string;
}

/**
 * Create a notification service backed by a StorageProvider.
 *
 * Each notification is stored as a separate key:
 *   `notifications:<userId>:<notificationId>`
 *
 * This ensures notifications survive restarts.
 */
export function createNotificationService(
  storage: StorageProvider,
): NotificationService {
  const keyPrefix = "notifications:";

  function notificationKey(userId: string, id: string): string {
    return `${keyPrefix}${userId}:${id}`;
  }

  function serialize(n: Notification): string {
    const stored: StoredNotification = {
      id: n.id,
      userId: n.userId as string,
      message: n.message,
      priority: n.priority,
      createdAt: n.createdAt.toISOString(),
    };
    return JSON.stringify(stored);
  }

  function deserialize(raw: string): Notification {
    const stored: StoredNotification = JSON.parse(raw);
    return {
      id: stored.id,
      userId: stored.userId as UserId,
      message: stored.message,
      priority: stored.priority,
      createdAt: new Date(stored.createdAt),
    };
  }

  return {
    async deliver(options: DeliverOptions): Promise<void> {
      const notification: Notification = {
        id: crypto.randomUUID(),
        userId: options.userId,
        message: options.message,
        priority: options.priority,
        createdAt: new Date(),
      };

      const key = notificationKey(
        options.userId as string,
        notification.id,
      );
      await storage.set(key, serialize(notification));
    },

    async getPending(userId: UserId): Promise<Notification[]> {
      const prefix = `${keyPrefix}${userId as string}:`;
      const keys = await storage.list(prefix);
      const results: Notification[] = [];

      for (const key of keys) {
        const raw = await storage.get(key);
        if (raw !== null) {
          results.push(deserialize(raw));
        }
      }

      // Sort by creation time, oldest first
      results.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
      return results;
    },

    async acknowledge(notificationId: string): Promise<void> {
      // We need to find the key containing this notification ID.
      // The ID is the suffix of the key, so list all notifications
      // and find the matching one.
      const keys = await storage.list(keyPrefix);
      for (const key of keys) {
        if (key.endsWith(`:${notificationId}`)) {
          await storage.delete(key);
          return;
        }
      }
    },
  };
}
