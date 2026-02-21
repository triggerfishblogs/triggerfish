/**
 * Notification Service — queues and delivers notifications across channels.
 *
 * Provides first-class notification delivery with priority levels,
 * queuing for offline users, and quiet hours support.
 * Notifications are persisted via StorageProvider (namespace: `notifications:`).
 *
 * @module
 */

import type { UserId } from "../../core/types/session.ts";
import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { StorageProvider } from "../../core/storage/provider.ts";

export type {
  NotificationPriority,
  Notification,
  DeliverOptions,
  DeliveryChannel,
  NotificationService,
} from "../../core/types/notification.ts";

import type {
  NotificationPriority,
  Notification,
  DeliverOptions,
  DeliveryChannel,
  NotificationService,
} from "../../core/types/notification.ts";

/** Serialized notification shape for storage. */
interface StoredNotification {
  readonly id: string;
  readonly userId: string;
  readonly message: string;
  readonly priority: NotificationPriority;
  readonly classification?: ClassificationLevel;
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
  const channels: DeliveryChannel[] = [];

  function notificationKey(userId: string, id: string): string {
    return `${keyPrefix}${userId}:${id}`;
  }

  function serialize(n: Notification): string {
    const stored: StoredNotification = {
      id: n.id,
      userId: n.userId as string,
      message: n.message,
      priority: n.priority,
      classification: n.classification,
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
      classification: stored.classification,
      createdAt: new Date(stored.createdAt),
    };
  }

  /** Attempt delivery to all registered channels. Returns true if at least one succeeded. */
  async function fanOut(message: string): Promise<boolean> {
    if (channels.length === 0) return false;
    const results = await Promise.allSettled(
      channels.map((ch) => ch.send(message)),
    );
    return results.some((r) => r.status === "fulfilled");
  }

  return {
    async deliver(options: DeliverOptions): Promise<void> {
      const notification: Notification = {
        id: crypto.randomUUID(),
        userId: options.userId,
        message: options.message,
        priority: options.priority,
        classification: options.classification,
        createdAt: new Date(),
      };

      const key = notificationKey(
        options.userId as string,
        notification.id,
      );
      await storage.set(key, serialize(notification));

      // Attempt immediate delivery to all registered channels
      try {
        const delivered = await fanOut(notification.message);
        if (delivered) {
          await storage.delete(key);
        }
      } catch {
        // Delivery failure must not prevent storage
      }
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
      const keys = await storage.list(keyPrefix);
      for (const key of keys) {
        if (key.endsWith(`:${notificationId}`)) {
          await storage.delete(key);
          return;
        }
      }
    },

    registerChannel(channel: DeliveryChannel): void {
      channels.push(channel);
    },

    async flushPending(userId: UserId): Promise<number> {
      try {
        const pending = await this.getPending(userId);
        let remaining = 0;
        for (const notification of pending) {
          const delivered = await fanOut(notification.message);
          if (delivered) {
            await this.acknowledge(notification.id);
          } else {
            remaining++;
          }
        }
        return remaining;
      } catch {
        return 0;
      }
    },
  };
}
