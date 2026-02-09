/**
 * WhatsApp channel adapter via WhatsApp Cloud API.
 *
 * Uses the official WhatsApp Business Cloud API (HTTP-based) rather than
 * unofficial libraries. Receives messages via webhook and sends via REST API.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import type {
  ChannelAdapter,
  ChannelMessage,
  ChannelStatus,
  MessageHandler,
} from "../types.ts";

/** Maximum message length for WhatsApp. */
const MAX_MESSAGE_LENGTH = 4096;

/** Configuration for the WhatsApp channel adapter. */
export interface WhatsAppConfig {
  /** WhatsApp Business API access token. */
  readonly accessToken: string;
  /** Phone number ID from Meta Business Dashboard. */
  readonly phoneNumberId: string;
  /** Webhook verify token for incoming messages. */
  readonly verifyToken: string;
  /** Port to listen for webhooks. Default: 8443 */
  readonly webhookPort?: number;
  /** Classification level for this channel. Default: INTERNAL */
  readonly classification?: ClassificationLevel;
  /** Owner's phone number (e.g. "15551234567"). */
  readonly ownerPhone?: string;
}

/** WhatsApp Cloud API base URL. */
const WA_API_BASE = "https://graph.facebook.com/v18.0";

/**
 * Create a WhatsApp channel adapter.
 *
 * Sends messages via the WhatsApp Cloud API and receives them via webhook.
 * The webhook server listens on the configured port for incoming message
 * notifications from Meta.
 *
 * @param config - WhatsApp configuration.
 * @returns A ChannelAdapter wired to WhatsApp.
 */
export function createWhatsAppChannel(config: WhatsAppConfig): ChannelAdapter {
  const classification = (config.classification ?? "INTERNAL") as ClassificationLevel;
  const webhookPort = config.webhookPort ?? 8443;
  let connected = false;
  let handler: MessageHandler | null = null;
  let server: Deno.HttpServer | null = null;

  return {
    classification,
    isOwner: true,

    async connect(): Promise<void> {
      // Start webhook server for incoming messages
      server = Deno.serve({ port: webhookPort }, async (req) => {
        const url = new URL(req.url);

        // Webhook verification (GET)
        if (req.method === "GET" && url.pathname === "/webhook") {
          const mode = url.searchParams.get("hub.mode");
          const token = url.searchParams.get("hub.verify_token");
          const challenge = url.searchParams.get("hub.challenge");

          if (mode === "subscribe" && token === config.verifyToken) {
            return new Response(challenge, { status: 200 });
          }
          return new Response("Forbidden", { status: 403 });
        }

        // Incoming message webhook (POST)
        if (req.method === "POST" && url.pathname === "/webhook") {
          const body = await req.json();
          processWebhook(body);
          return new Response("OK", { status: 200 });
        }

        return new Response("Not Found", { status: 404 });
      });

      connected = true;
    },

    async disconnect(): Promise<void> {
      if (server) {
        await server.shutdown();
        server = null;
      }
      connected = false;
    },

    async send(message: ChannelMessage): Promise<void> {
      if (!message.sessionId) return;

      const phone = message.sessionId.replace("whatsapp-", "");
      const text = message.content.length > MAX_MESSAGE_LENGTH
        ? message.content.slice(0, MAX_MESSAGE_LENGTH)
        : message.content;

      const response = await fetch(
        `${WA_API_BASE}/${config.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${config.accessToken}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phone,
            type: "text",
            text: { body: text },
          }),
        },
      );

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`WhatsApp send failed (${response.status}): ${err}`);
      }
    },

    onMessage(msgHandler: MessageHandler): void {
      handler = msgHandler;
    },

    status(): ChannelStatus {
      return {
        connected,
        channelType: "whatsapp",
      };
    },
  };

  /** Process incoming webhook payload from Meta. */
  function processWebhook(body: Record<string, unknown>): void {
    if (!handler) return;

    // Navigate the WhatsApp Cloud API webhook structure
    const entries = (body.entry ?? []) as Array<Record<string, unknown>>;
    for (const entry of entries) {
      const changes = (entry.changes ?? []) as Array<Record<string, unknown>>;
      for (const change of changes) {
        const value = change.value as Record<string, unknown> | undefined;
        if (!value) continue;

        const messages = (value.messages ?? []) as Array<Record<string, unknown>>;
        for (const msg of messages) {
          if (msg.type !== "text") continue;

          const from = msg.from as string;
          const textObj = msg.text as { body: string } | undefined;
          if (!textObj?.body) continue;

          const isOwner = config.ownerPhone !== undefined
            ? from === config.ownerPhone
            : true;

          handler({
            content: textObj.body,
            sessionId: `whatsapp-${from}`,
            sessionTaint: isOwner ? undefined : ("PUBLIC" as ClassificationLevel),
          });
        }
      }
    }
  }
}
