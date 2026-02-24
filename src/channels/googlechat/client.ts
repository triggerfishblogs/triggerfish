/**
 * Google Chat API and PubSub client functions.
 *
 * Handles PubSub pull delivery for receiving messages and
 * Chat API calls for sending messages and typing indicators.
 * Supports injectable fetch/pull functions for deterministic testing.
 *
 * @module
 */

import { createLogger } from "../../core/logger/logger.ts";
import type {
  GoogleChatConfig,
  GoogleChatEvent,
  PubSubAckFn,
  PubSubPullFn,
  PubSubPullResponse,
} from "./types.ts";

const log = createLogger("googlechat-client");

// ─── PubSub pull ────────────────────────────────────────────────────────────

/**
 * Create a PubSub pull function that calls the Google Cloud PubSub API.
 *
 * Returns a function that pulls messages from the configured subscription.
 * Uses the provided fetch function (or global fetch) for HTTP requests.
 *
 * @param config - Google Chat adapter configuration.
 * @returns A PubSubPullFn that pulls messages from the subscription.
 */
export function createPubSubPuller(config: GoogleChatConfig): PubSubPullFn {
  const fetchFn = config._fetchFn ?? fetch;

  return async (
    subscription: string,
    maxMessages: number,
  ): Promise<PubSubPullResponse> => {
    const url =
      `https://pubsub.googleapis.com/v1/${subscription}:pull`;
    const response = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({ maxMessages }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `PubSub pull failed (${response.status}): ${body}`,
      );
    }

    return await response.json() as PubSubPullResponse;
  };
}

/**
 * Create a PubSub acknowledge function that confirms message receipt.
 *
 * Acknowledging messages prevents them from being re-delivered.
 *
 * @param config - Google Chat adapter configuration.
 * @returns A PubSubAckFn that acknowledges processed messages.
 */
export function createPubSubAcknowledger(
  config: GoogleChatConfig,
): PubSubAckFn {
  const fetchFn = config._fetchFn ?? fetch;

  return async (
    subscription: string,
    ackIds: readonly string[],
  ): Promise<void> => {
    if (ackIds.length === 0) return;

    const url =
      `https://pubsub.googleapis.com/v1/${subscription}:acknowledge`;
    const response = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.accessToken}`,
      },
      body: JSON.stringify({ ackIds }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `PubSub acknowledge failed (${response.status}): ${body}`,
      );
    }
  };
}

// ─── Chat API send ──────────────────────────────────────────────────────────

/**
 * Send a text message to a Google Chat space via the Chat API.
 *
 * @param config - Google Chat adapter configuration.
 * @param spaceName - The space resource name (e.g. "spaces/AAAA").
 * @param text - The message text to send.
 */
export async function sendGoogleChatMessage(
  config: GoogleChatConfig,
  spaceName: string,
  text: string,
): Promise<void> {
  const fetchFn = config._fetchFn ?? fetch;
  const url = `https://chat.googleapis.com/v1/${spaceName}/messages`;

  const response = await fetchFn(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${config.accessToken}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Google Chat send failed (${response.status}): ${body}`,
    );
  }

  log.debug("Google Chat message sent", { space: spaceName });
}

/**
 * Send a typing indicator to a Google Chat space.
 *
 * Google Chat does not have a public typing indicator API for bots,
 * so this is a best-effort no-op with debug logging.
 *
 * @param spaceName - The space resource name.
 */
export function sendGoogleChatTyping(spaceName: string): void {
  log.debug("Google Chat typing indicator requested (no-op)", {
    space: spaceName,
  });
}

// ─── PubSub message parsing ────────────────────────────────────────────────

/**
 * Parse a base64-encoded PubSub message data field into a GoogleChatEvent.
 *
 * @param data - Base64-encoded JSON string from the PubSub message.
 * @returns The parsed GoogleChatEvent, or undefined if parsing fails.
 */
export function parseGoogleChatEventData(
  data: string,
): GoogleChatEvent | undefined {
  try {
    const decoded = atob(data);
    return JSON.parse(decoded) as GoogleChatEvent;
  } catch (err: unknown) {
    log.warn("Google Chat PubSub message parse failed", {
      operation: "parseGoogleChatEventData",
      err,
    });
    return undefined;
  }
}
