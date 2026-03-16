/**
 * Chat session network wiring — Tidepool, Gateway, and channel setup.
 *
 * Wraps the chat session for Tidepool and Gateway clients, starts
 * network services, and wires messaging channels.
 *
 * @module
 */

import type { TriggerFishConfig } from "../../../core/config.ts";
import type { createLogger } from "../../../core/logger/mod.ts";
import type {
  CredentialPromptCallback,
  SecretPromptCallback,
} from "../../../tools/secrets.ts";
import { createA2UIHost } from "../../../tools/tidepool/host/mod.ts";
import type { createChatSession } from "../../chat.ts";
import { createGatewayServer } from "../../server/server.ts";
import type { createEnhancedSessionManager } from "../../sessions.ts";
import type { createNotificationService } from "../../notifications/notifications.ts";
import type { createSchedulerService } from "../../../scheduler/service.ts";
import type { RegisteredChannel } from "../../tools/session/session_tools.ts";
import { TIDEPOOL_PORT } from "../../../cli/constants.ts";
import type { MainSessionState } from "../tools/tool_executor.ts";
import {
  isValidatedWhatsAppConfig,
  wireDiscordChannel,
  wireSignalChannel,
  wireTelegramChannel,
  wireWhatsAppChannel,
} from "../channels/channels.ts";
import type {
  DiscordChannelConfig,
  SignalChannelConfig,
  TelegramChannelConfig,
  WhatsAppChannelConfig,
} from "../channels/channels.ts";
import { createLogger as createLoggerFn } from "../../../core/logger/mod.ts";

/** Wrap chat session for Tidepool with secret prompt and tidepool call flag. */
export function wrapChatSessionForTidepool(
  chatSession: ReturnType<typeof createChatSession>,
  isTidepoolCallRef: { value: boolean },
  state: MainSessionState,
  cliSecretPrompt: SecretPromptCallback,
  cliCredentialPrompt: CredentialPromptCallback,
) {
  return {
    ...chatSession,
    get providerName() {
      return chatSession.providerName;
    },
    get modelName() {
      return chatSession.modelName;
    },
    get workspacePath() {
      return chatSession.workspacePath;
    },
    get sessionTaint() {
      return chatSession.sessionTaint;
    },
    get bumpersEnabled() {
      return chatSession.bumpersEnabled;
    },
    executeAgentTurn: (
      content: Parameters<typeof chatSession.executeAgentTurn>[0],
      sendEvent: Parameters<typeof chatSession.executeAgentTurn>[1],
      signal?: Parameters<typeof chatSession.executeAgentTurn>[2],
    ) => {
      isTidepoolCallRef.value = true;
      state.activeSecretPrompt = chatSession.createTidepoolSecretPrompt(
        sendEvent,
      );
      state.activeCredentialPrompt = chatSession.createTidepoolCredentialPrompt(
        sendEvent,
      );
      return chatSession.executeAgentTurn(content, sendEvent, signal).finally(
        () => {
          isTidepoolCallRef.value = false;
          state.activeSecretPrompt = cliSecretPrompt;
          state.activeCredentialPrompt = cliCredentialPrompt;
        },
      );
    },
  };
}

/** Start Tidepool host and register notification channel. */
export async function startTidepoolHost(
  tidepoolChatSession: ReturnType<typeof wrapChatSessionForTidepool>,
  notificationService: ReturnType<typeof createNotificationService>,
  log: ReturnType<typeof createLogger>,
) {
  const tidepoolHost = createA2UIHost({ chatSession: tidepoolChatSession });
  await tidepoolHost.start(TIDEPOOL_PORT);
  log.info(`Tidepool listening on http://127.0.0.1:${TIDEPOOL_PORT}`);
  notificationService.registerChannel({
    name: "tidepool",
    // deno-lint-ignore require-await
    send: async (msg) => {
      tidepoolHost.broadcastNotification(msg);
    },
  });
  return tidepoolHost;
}

/** Wrap chat session for CLI WebSocket gateway clients. */
export function wrapChatSessionForGateway(
  chatSession: ReturnType<typeof createChatSession>,
  state: MainSessionState,
  cliSecretPrompt: SecretPromptCallback,
  cliCredentialPrompt: CredentialPromptCallback,
) {
  return {
    ...chatSession,
    get providerName() {
      return chatSession.providerName;
    },
    get modelName() {
      return chatSession.modelName;
    },
    get workspacePath() {
      return chatSession.workspacePath;
    },
    get sessionTaint() {
      return chatSession.sessionTaint;
    },
    get bumpersEnabled() {
      return chatSession.bumpersEnabled;
    },
    executeAgentTurn: (
      content: Parameters<typeof chatSession.executeAgentTurn>[0],
      sendEvent: Parameters<typeof chatSession.executeAgentTurn>[1],
      signal?: Parameters<typeof chatSession.executeAgentTurn>[2],
    ) => {
      state.activeSecretPrompt = chatSession.createTidepoolSecretPrompt(
        sendEvent,
      );
      state.activeCredentialPrompt = chatSession.createTidepoolCredentialPrompt(
        sendEvent,
      );
      return chatSession.executeAgentTurn(content, sendEvent, signal).finally(
        () => {
          state.activeSecretPrompt = cliSecretPrompt;
          state.activeCredentialPrompt = cliCredentialPrompt;
        },
      );
    },
  };
}

/** Start the gateway WebSocket server and register notification channel. */
export async function startGatewayServer(
  gatewayChatSession: ReturnType<typeof wrapChatSessionForGateway>,
  schedulerService: ReturnType<typeof createSchedulerService>,
  enhancedSessionManager: ReturnType<typeof createEnhancedSessionManager>,
  notificationService: ReturnType<typeof createNotificationService>,
  log: ReturnType<typeof createLogger>,
) {
  const server = createGatewayServer({
    port: 18789,
    schedulerService,
    chatSession: gatewayChatSession,
    sessionManager: enhancedSessionManager,
    notificationService,
  });
  const addr = await server.start();
  log.info(`Gateway listening on ${addr.hostname}:${addr.port}`);
  notificationService.registerChannel({
    name: "cli-websocket",
    // deno-lint-ignore require-await
    send: async (msg) => {
      server.broadcastNotification(msg);
    },
  });
  return server;
}

const channelLog = createLoggerFn("startup-channels");

/** Wire configured messaging channels (Telegram, Discord, WhatsApp, Signal). */
export async function wireMessageChannels(
  config: TriggerFishConfig,
  chatSession: ReturnType<typeof createChatSession>,
  notificationService: ReturnType<typeof createNotificationService>,
  channelAdapters: Map<string, RegisteredChannel>,
) {
  const channelDeps = { chatSession, notificationService, channelAdapters };
  const telegramConfig = config.channels?.telegram as
    | TelegramChannelConfig
    | undefined;
  if (telegramConfig?.botToken) {
    await wireTelegramChannel(telegramConfig, channelDeps);
  }
  const discordConfig = config.channels?.discord as
    | DiscordChannelConfig
    | undefined;
  if (discordConfig) {
    await wireDiscordChannel(discordConfig, channelDeps);
  }
  const whatsappConfig = config.channels?.whatsapp as
    | WhatsAppChannelConfig
    | undefined;
  if (whatsappConfig && isValidatedWhatsAppConfig(whatsappConfig)) {
    await wireWhatsAppChannel(whatsappConfig, channelDeps);
  } else if (whatsappConfig) {
    channelLog.warn(
      "WhatsApp config present but credentials missing or invalid — skipping channel",
      {
        operation: "wireMessageChannels",
        hasAccessToken: Boolean(whatsappConfig.accessToken),
        hasPhoneNumberId: Boolean(whatsappConfig.phoneNumberId),
        hasVerifyToken: Boolean(whatsappConfig.verifyToken),
      },
    );
  }
  const signalConfig = config.channels?.signal as
    | SignalChannelConfig
    | undefined;
  return signalConfig
    ? wireSignalChannel(signalConfig, channelDeps)
    : { handle: null };
}
