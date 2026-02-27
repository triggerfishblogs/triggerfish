/**
 * WhatsApp channel adapter wiring for gateway startup.
 *
 * @module
 */

import { parseClassification } from "../../../core/types/classification.ts";
import type { ClassificationLevel } from "../../../core/types/classification.ts";
import type { UserId } from "../../../core/types/session.ts";
import type { ChannelMessage } from "../../../channels/types.ts";
import { createWhatsAppChannel } from "../../../channels/whatsapp/adapter.ts";
import { buildSendEvent } from "../../chat.ts";
import type { ChannelWiringDeps } from "./channels_shared.ts";
import type { NotificationService } from "../../notifications/notifications.ts";
import { createLogger } from "../../../core/logger/mod.ts";
import { safeFetch } from "../../../tools/web/mod.ts";

const log = createLogger("startup-channels-whatsapp");

/** WhatsApp channel config from triggerfish.yaml (all credentials optional). */
export interface WhatsAppChannelConfig {
  readonly accessToken?: string;
  readonly phoneNumberId?: string;
  readonly verifyToken?: string;
  readonly webhookPort?: number;
  readonly ownerPhone?: string;
  readonly classification?: string;
  readonly pairing?: boolean;
  readonly pairing_classification?: string;
  readonly user_classifications?: Record<string, string>;
  readonly respond_to_unclassified?: boolean;
}

/** Config with required credentials, after the caller has validated presence. */
export interface ValidatedWhatsAppConfig extends WhatsAppChannelConfig {
  readonly accessToken: string;
  readonly phoneNumberId: string;
  readonly verifyToken: string;
}

/** Type guard to narrow WhatsAppChannelConfig to ValidatedWhatsAppConfig. */
export function isValidatedWhatsAppConfig(
  config: WhatsAppChannelConfig,
): config is ValidatedWhatsAppConfig {
  return Boolean(
    config.accessToken && config.phoneNumberId && config.verifyToken,
  );
}

/** Reset session and notify owner on /clear command. */
function handleWhatsAppClearCommand(
  adapter: ReturnType<typeof createWhatsAppChannel>,
  chatSession: ChannelWiringDeps["chatSession"],
  notificationService: NotificationService,
  sessionId: string | undefined,
): void {
  log.warn("WhatsApp session cleared by owner", {
    operation: "handleWhatsAppClearCommand",
    sessionId,
  });
  chatSession.clear();
  adapter.send({
    content:
      "Session cleared. Your context and taint level have been reset to PUBLIC.\n\nWhat would you like to do?",
    sessionId: sessionId,
  }).then(() => notificationService.flushPending("owner" as UserId))
    .catch((err) =>
      log.error("WhatsApp /clear session reset send failed", {
        operation: "handleWhatsAppClearCommand",
        err,
        sessionId,
      })
    );
}

/** Handle incoming WhatsApp messages, dispatching commands and chat. */
function handleWhatsAppMessage(
  msg: ChannelMessage,
  adapter: ReturnType<typeof createWhatsAppChannel>,
  deps: ChannelWiringDeps,
): void {
  const { chatSession, notificationService } = deps;

  if (msg.content === "/clear" && msg.isOwner === true) {
    handleWhatsAppClearCommand(
      adapter,
      chatSession,
      notificationService,
      msg.sessionId,
    );
    return;
  }

  if (msg.isOwner === true) {
    const sendEvent = buildSendEvent(adapter, "WhatsApp", msg);
    chatSession.executeAgentTurn(msg.content, sendEvent)
      .catch((err) =>
        log.error("WhatsApp owner executeAgentTurn failed", {
          operation: "executeAgentTurn",
          err,
          sessionId: msg.sessionId,
        })
      );
  } else {
    chatSession.handleChannelMessage(msg, "whatsapp")
      .catch((err) =>
        log.error("WhatsApp external handleChannelMessage failed", {
          operation: "handleChannelMessage",
          err,
          sessionId: msg.sessionId,
        })
      );
  }
}

/** Register WhatsApp notification channel for owner. */
function registerWhatsAppNotifications(
  notificationService: NotificationService,
  adapter: ReturnType<typeof createWhatsAppChannel>,
  ownerPhone: string | undefined,
): void {
  if (!ownerPhone) return;

  notificationService.registerChannel({
    name: "whatsapp",
    send: (msg) =>
      adapter.send({ content: msg, sessionId: `whatsapp-${ownerPhone}` }),
  });
}

/** Wrap safeFetch into a standard fetch signature for adapter injection. */
async function ssrfSafeFetchWrapper(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const url = input instanceof Request ? input.url : String(input);
  const result = await safeFetch(url, init);
  if (!result.ok) {
    throw new Error(`SSRF-safe fetch blocked: ${result.error}`);
  }
  return result.value;
}

/** Parse and validate the classification level from config. */
function resolveClassification(
  raw: string | undefined,
): ClassificationLevel {
  const input = raw ?? "PUBLIC";
  const result = parseClassification(input);
  if (result.ok) return result.value;
  log.warn("WhatsApp channel classification invalid, defaulting to PUBLIC", {
    operation: "resolveClassification",
    input,
    error: result.error,
  });
  return "PUBLIC";
}

/** Wire and connect WhatsApp channel adapter. Caller must validate credentials. */
export async function wireWhatsAppChannel(
  whatsappConfig: ValidatedWhatsAppConfig,
  deps: ChannelWiringDeps,
): Promise<void> {
  const { chatSession, channelAdapters } = deps;
  const classification = resolveClassification(whatsappConfig.classification);
  const webhookPort = whatsappConfig.webhookPort ?? 8443;

  log.info("WhatsApp channel configured, connecting...", { webhookPort });
  const whatsappAdapter = createWhatsAppChannel({
    accessToken: whatsappConfig.accessToken,
    phoneNumberId: whatsappConfig.phoneNumberId,
    verifyToken: whatsappConfig.verifyToken,
    webhookPort: whatsappConfig.webhookPort,
    ownerPhone: whatsappConfig.ownerPhone,
    classification,
    fetchFn: ssrfSafeFetchWrapper,
  });

  // Register channel and handler before connect so that incoming webhook
  // messages can be routed immediately when the HTTP server starts accepting.
  await chatSession.registerChannel("whatsapp", {
    adapter: whatsappAdapter,
    channelName: "WhatsApp",
    classification,
    userClassifications: whatsappConfig.user_classifications,
    respondToUnclassified: whatsappConfig.respond_to_unclassified,
    pairing: whatsappConfig.pairing,
    pairingClassification: (whatsappConfig.pairing_classification ??
      "INTERNAL") as ClassificationLevel,
  });

  whatsappAdapter.onMessage((msg) =>
    handleWhatsAppMessage(msg, whatsappAdapter, deps)
  );

  registerWhatsAppNotifications(
    deps.notificationService,
    whatsappAdapter,
    whatsappConfig.ownerPhone,
  );

  try {
    await whatsappAdapter.connect();
  } catch (err: unknown) {
    log.error("WhatsApp channel connect failed", {
      operation: "wireWhatsAppChannel",
      err,
      webhookPort,
    });
    throw err;
  }

  channelAdapters.set("whatsapp", {
    adapter: whatsappAdapter,
    classification,
    name: "WhatsApp",
  });
  log.info("WhatsApp channel connected", { webhookPort });
}
