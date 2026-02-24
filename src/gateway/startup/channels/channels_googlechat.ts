/**
 * Google Chat channel adapter wiring for gateway startup.
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";
import type { ChannelMessage } from "../../../channels/types.ts";
import { createGoogleChatChannel } from "../../../channels/googlechat/adapter.ts";
import { buildSendEvent } from "../../chat.ts";
import type { ChannelWiringDeps } from "./channels_shared.ts";
import type { NotificationService } from "../../notifications/notifications.ts";
import { createLogger } from "../../../core/logger/mod.ts";

const log = createLogger("startup-channels-googlechat");

/** Google Chat channel config from triggerfish.yaml. */
export interface GoogleChatChannelConfig {
  readonly enabled?: boolean;
  readonly classification?: string;
  readonly access_token?: string;
  readonly pubsub_subscription?: string;
  readonly owner_email?: string;
  readonly owner_space_id?: string;
  readonly pairing?: boolean;
  readonly pairing_classification?: string;
  readonly default_group_mode?: string;
  readonly groups?: Record<string, { readonly mode: string }>;
  readonly user_classifications?: Record<string, string>;
  readonly respond_to_unclassified?: boolean;
}

/** Handle incoming Google Chat messages, dispatching to owner or external. */
function handleGoogleChatMessage(
  msg: ChannelMessage,
  adapter: ReturnType<typeof createGoogleChatChannel>,
  deps: ChannelWiringDeps,
): void {
  const { chatSession } = deps;

  if (msg.isOwner !== false) {
    const sendEvent = buildSendEvent(adapter, "Google Chat", msg);
    chatSession.executeAgentTurn(msg.content, sendEvent)
      .catch((err) =>
        log.error("Google Chat owner executeAgentTurn failed", err)
      );
  } else {
    chatSession.handleChannelMessage(msg, "googlechat")
      .catch((err) =>
        log.error("Google Chat external handleChannelMessage failed", err)
      );
  }
}

/** Register Google Chat notification channel for owner. */
function registerGoogleChatNotifications(
  notificationService: NotificationService,
  adapter: ReturnType<typeof createGoogleChatChannel>,
  ownerSpaceId: string | undefined,
): void {
  if (!ownerSpaceId) return;

  const sessionId = `googlechat-${ownerSpaceId.replace(/\//g, "_")}`;
  notificationService.registerChannel({
    name: "googlechat",
    send: (msg) =>
      adapter.send({ content: msg, sessionId }),
  });
}

/** Wire and connect Google Chat channel adapter. */
export async function wireGoogleChatChannel(
  googlechatConfig: GoogleChatChannelConfig,
  deps: ChannelWiringDeps,
): Promise<void> {
  if (!googlechatConfig.access_token || !googlechatConfig.pubsub_subscription) {
    log.warn(
      "Google Chat channel configured but access_token or pubsub_subscription is missing",
    );
    return;
  }

  const { chatSession, channelAdapters } = deps;
  const classification =
    (googlechatConfig.classification ?? "INTERNAL") as ClassificationLevel;

  const googlechatAdapter = createGoogleChatChannel({
    accessToken: googlechatConfig.access_token,
    pubsubSubscription: googlechatConfig.pubsub_subscription,
    ownerEmail: googlechatConfig.owner_email,
    classification,
    pairing: googlechatConfig.pairing,
    defaultGroupMode: (googlechatConfig.default_group_mode ?? "mentioned-only") as
      "always" | "mentioned-only" | "owner-only",
    groups: googlechatConfig.groups as Record<
      string,
      { readonly mode: "always" | "mentioned-only" | "owner-only" }
    >,
  });

  await chatSession.registerChannel("googlechat", {
    adapter: googlechatAdapter,
    channelName: "Google Chat",
    classification,
    userClassifications: googlechatConfig.user_classifications,
    respondToUnclassified: googlechatConfig.respond_to_unclassified,
    pairing: googlechatConfig.pairing,
    pairingClassification: (googlechatConfig.pairing_classification ??
      "INTERNAL") as ClassificationLevel,
  });

  googlechatAdapter.onMessage((msg) =>
    handleGoogleChatMessage(msg, googlechatAdapter, deps)
  );

  registerGoogleChatNotifications(
    deps.notificationService,
    googlechatAdapter,
    googlechatConfig.owner_space_id,
  );

  await googlechatAdapter.connect();
  channelAdapters.set("googlechat", {
    adapter: googlechatAdapter,
    classification,
    name: "Google Chat",
  });
  log.info("Google Chat channel connected");
}
