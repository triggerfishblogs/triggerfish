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
import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("whatsapp");

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
  /** Classification level for this channel. Default: PUBLIC */
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
/** Handle an incoming WhatsApp webhook HTTP request. */
function handleWhatsAppWebhookRequest(
  req: Request,
  verifyToken: string,
  onPayload: (body: Record<string, unknown>) => void,
): Response | Promise<Response> {
  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname === "/webhook") {
    return verifyWhatsAppWebhook(url, verifyToken);
  }
  if (req.method === "POST" && url.pathname === "/webhook") {
    return req.json().then((body: Record<string, unknown>) => {
      onPayload(body);
      return new Response("OK", { status: 200 });
    });
  }
  return new Response("Not Found", { status: 404 });
}

/** Verify a WhatsApp webhook subscription challenge. */
function verifyWhatsAppWebhook(url: URL, verifyToken: string): Response {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token === verifyToken) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

/** Process incoming WhatsApp webhook payload from Meta. */
function dispatchWhatsAppWebhookMessages(
  body: Record<string, unknown>,
  handler: MessageHandler,
  ownerPhone: string | undefined,
): void {
  const entries = (body.entry ?? []) as Array<Record<string, unknown>>;
  for (const entry of entries) {
    const changes = (entry.changes ?? []) as Array<Record<string, unknown>>;
    for (const change of changes) {
      const value = change.value as Record<string, unknown> | undefined;
      if (!value) continue;
      const messages = (value.messages ?? []) as Array<
        Record<string, unknown>
      >;
      for (const msg of messages) {
        if (msg.type !== "text") continue;
        const from = msg.from as string;
        const textObj = msg.text as { body: string } | undefined;
        if (!textObj?.body) continue;
        const isOwner = ownerPhone !== undefined ? from === ownerPhone : true;
        log.debug("Message received", { from, isOwner });
        handler({
          content: textObj.body,
          sessionId: `whatsapp-${from}`,
          senderId: from,
          isOwner,
          sessionTaint: isOwner ? undefined : ("PUBLIC" as ClassificationLevel),
        });
      }
    }
  }
}

/** Send a text message via WhatsApp Cloud API. */
async function sendWhatsAppTextMessage(
  phone: string,
  text: string,
  phoneNumberId: string,
  accessToken: string,
): Promise<void> {
  const response = await fetch(
    `${WA_API_BASE}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
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
}

export function createWhatsAppChannel(config: WhatsAppConfig): ChannelAdapter {
  const classification = (config.classification ??
    "PUBLIC") as ClassificationLevel;
  const webhookPort = config.webhookPort ?? 8443;
  let connected = false;
  let handler: MessageHandler | null = null;
  let server: Deno.HttpServer | null = null;

  return {
    classification,
    isOwner: true,

    // deno-lint-ignore require-await
    async connect(): Promise<void> {
      server = Deno.serve(
        { port: webhookPort },
        (req) =>
          handleWhatsAppWebhookRequest(req, config.verifyToken, (body) => {
            if (handler) {
              dispatchWhatsAppWebhookMessages(body, handler, config.ownerPhone);
            }
          }),
      );
      connected = true;
      log.info("WhatsApp adapter connected", { port: webhookPort });
    },

    async disconnect(): Promise<void> {
      if (server) {
        await server.shutdown();
        server = null;
      }
      connected = false;
      log.info("WhatsApp adapter disconnected");
    },

    async send(message: ChannelMessage): Promise<void> {
      if (!message.sessionId) return;
      const phone = message.sessionId.replace("whatsapp-", "");
      const text = message.content.length > MAX_MESSAGE_LENGTH
        ? message.content.slice(0, MAX_MESSAGE_LENGTH)
        : message.content;
      await sendWhatsAppTextMessage(
        phone,
        text,
        config.phoneNumberId,
        config.accessToken,
      );
    },

    onMessage(msgHandler: MessageHandler): void {
      handler = msgHandler;
    },

    status(): ChannelStatus {
      return { connected, channelType: "whatsapp" };
    },
  };
}
