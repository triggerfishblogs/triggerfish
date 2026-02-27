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
  AccessTokenProvider,
  GoogleChatConfig,
  GoogleChatEvent,
  PubSubAckFn,
  PubSubPullFn,
  PubSubPullResponse,
} from "./types.ts";

const log = createLogger("googlechat-client");

// ── SSRF note ─────────────────────────────────────────────────────────────────
// All outbound HTTP in this module targets hardcoded Google API hostnames
// (pubsub.googleapis.com, chat.googleapis.com). These are trusted first-party
// endpoints — no user-controlled hostnames are used. SSRF/DNS checks are
// therefore not required here. If this module is ever extended to accept
// user-provided URLs, SSRF prevention (DNS resolution + IP denylist) MUST be
// added per src/tools/web/domains.ts.
// ──────────────────────────────────────────────────────────────────────────────

/** Build an Authorization header value from the token provider. */
async function resolveAuthHeader(
  getAccessToken: AccessTokenProvider,
): Promise<string> {
  const token = await getAccessToken();
  return `Bearer ${token}`;
}

// ─── PubSub pull ────────────────────────────────────────────────────────────

/**
 * Create a PubSub pull function that calls the Google Cloud PubSub API.
 *
 * Returns a function that pulls messages from the configured subscription.
 * Uses the provided fetch function (or global fetch) for HTTP requests.
 * Calls `getAccessToken()` on every request to support token refresh.
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
    const authorization = await resolveAuthHeader(config.getAccessToken);
    const response = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authorization,
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
 * Calls `getAccessToken()` on every request to support token refresh.
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
    const authorization = await resolveAuthHeader(config.getAccessToken);
    const response = await fetchFn(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": authorization,
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
 * Calls `getAccessToken()` on every request to support token refresh.
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
  const authorization = await resolveAuthHeader(config.getAccessToken);

  const response = await fetchFn(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": authorization,
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
