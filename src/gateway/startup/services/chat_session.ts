/**
 * Chat session assembly, Tidepool host, and Gateway server wiring.
 *
 * Builds the main chat session with lifecycle callbacks, wraps it
 * for Tidepool and Gateway clients, starts network services,
 * and wires messaging channels.
 *
 * @module
 */

import type { ClassificationLevel } from "../../../core/types/classification.ts";
import { createSession, updateTaint } from "../../../core/types/session.ts";
import type { ChannelId, UserId } from "../../../core/types/session.ts";
import type { TriggerFishConfig } from "../../../core/config.ts";
import { createLogger } from "../../../core/logger/mod.ts";
import type { createProviderRegistry } from "../../../agent/llm.ts";
import { resolveVisionProvider } from "../../../agent/providers/config.ts";
import type { createHookRunner } from "../../../core/policy/hooks/hooks.ts";
import type { createKeychain } from "../../../core/secrets/keychain/keychain.ts";
import type { createPathClassifier } from "../../../core/security/path_classification.ts";
import type { createToolFloorRegistry } from "../../../core/security/tool_floors.ts";
import type {
  CredentialPromptCallback,
  SecretPromptCallback,
} from "../../../tools/secrets.ts";
import type { createAutoLaunchBrowserExecutor } from "../../../tools/browser/mod.ts";
import { createA2UIHost } from "../../../tools/tidepool/host/mod.ts";
import { createChatSession } from "../../chat.ts";
import { createGatewayServer } from "../../server/server.ts";
import type { createEnhancedSessionManager } from "../../sessions.ts";
import type { createNotificationService } from "../../notifications/notifications.ts";
import type { createSchedulerService } from "../../../scheduler/service.ts";
import type { createPairingService } from "../../../channels/pairing.ts";
import type { RegisteredChannel } from "../../tools/session/session_tools.ts";
import type { TriggerStore } from "../../../scheduler/triggers/store.ts";
import { TIDEPOOL_PORT } from "../../../cli/constants.ts";
import {
  resolvePromptsForProfile,
  resolveToolsForProfile,
} from "../../tools/agent_tools.ts";
import {
  buildUnconfiguredServicesPrompt,
  filterProfileByAvailability,
  TOOL_PROFILES,
} from "../../tools/defs/tool_profiles.ts";
import type { ServiceAvailability } from "../../tools/defs/tool_profiles.ts";
import type { createToolExecutor } from "../../tools/agent_tools.ts";
import { TOOL_BEHAVIOR_PROMPT } from "../../../agent/orchestrator/tool_behavior_prompt.ts";
import type { wireMcpServers } from "../infra/mcp.ts";
import type { buildWebTools } from "../factory/web_tools.ts";
import type { MainSessionState } from "../tools/tool_executor.ts";
import type { WorkspacePaths } from "../tools/tool_executor.ts";
import type { PersonaRecallOptions } from "../tools/tool_executor.ts";
import {
  buildExtraSystemPromptGetter,
  buildExtraToolsGetter,
} from "../tools/tool_executor.ts";
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

/** Build session lifecycle callbacks (escalate, reset). */
export function buildSessionLifecycleCallbacks(
  state: MainSessionState,
  browserHandle: ReturnType<typeof createAutoLaunchBrowserExecutor>,
  log: ReturnType<typeof createLogger>,
) {
  return {
    getSessionTaint: () => state.session.taint,
    escalateTaint: (level: ClassificationLevel, reason: string) => {
      state.session = updateTaint(state.session, level, reason);
    },
    resetSession: () => {
      state.session = createSession({
        userId: "owner" as UserId,
        channelId: "daemon" as ChannelId,
      });
      browserHandle.close().catch((err: unknown) => {
        log.debug("Browser close failed during session reset", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    },
  };
}

/** Shared deps shape for assembleChatSession. */
export interface ChatSessionDeps {
  readonly hookRunner: ReturnType<typeof createHookRunner>;
  readonly registry: ReturnType<typeof createProviderRegistry>;
  readonly spinePath: string;
  readonly mcpWiring: ReturnType<typeof wireMcpServers> | null;
  readonly isTidepoolCallRef: { value: boolean };
  readonly tidepoolToolsRef: {
    value: import("../../../tools/tidepool/mod.ts").TidePoolTools | undefined;
  };
  readonly toolExecutor: ReturnType<typeof createToolExecutor>;
  readonly skillsPrompt: string;
  readonly triggersPrompt: string;
  readonly mainKeychain: ReturnType<typeof createKeychain>;
  readonly state: MainSessionState;
  readonly streamingPref: unknown;
  readonly config: TriggerFishConfig;
  readonly visionProvider: ReturnType<typeof resolveVisionProvider>;
  readonly toolClassifications: Map<string, ClassificationLevel>;
  readonly integrationClassifications: Map<string, ClassificationLevel>;
  readonly browserHandle: ReturnType<typeof createAutoLaunchBrowserExecutor>;
  readonly log: ReturnType<typeof createLogger>;
  readonly pairingService: ReturnType<typeof createPairingService>;
  readonly pathClassifier: ReturnType<typeof createPathClassifier>;
  readonly domainClassifier: ReturnType<
    typeof buildWebTools
  >["domainClassifier"];
  readonly toolFloorRegistry: ReturnType<typeof createToolFloorRegistry>;
  /** Active skill context getter for tool filtering (optional). */
  readonly getActiveSkillContext?: () =>
    | import("../../../agent/orchestrator/orchestrator_types.ts").ActiveSkillContext
    | null;
  /** Trigger store for retrieving trigger results on prompt acceptance. */
  readonly triggerStore?: TriggerStore;
  /** Broadcast a chat event to all connected sockets. */
  readonly broadcastChatEvent?: (
    event: import("../../../core/types/chat_event.ts").ChatEvent,
  ) => void;
  /** Classification-partitioned workspace paths for dynamic prompt injection. */
  readonly workspacePaths: WorkspacePaths;
  /** Returns the taint-aware workspace path for shell command classification. */
  readonly getWorkspacePath: () => string | null;
  /** Which external services are configured and have credentials. */
  readonly serviceAvailability: ServiceAvailability;
  /** Persona auto-recall options (memory store + agent ID). */
  readonly personaOptions?: PersonaRecallOptions;
  /** Mutable ref toggled by non-owner turn wrappers. */
  readonly isOwnerTurnRef?: { value: boolean };
  /** Message store for conversation persistence. */
  readonly messageStore?: import("../../../core/conversation/mod.ts").MessageStore;
  /** Lineage store for automatic data provenance tracking. */
  readonly lineageStore?: import("../../../core/session/lineage.ts").LineageStore;
}

/** Build the dynamic getter and prompt options for the chat session. */
export function buildChatSessionDynamicOptions(deps: ChatSessionDeps) {
  const filteredProfile = filterProfileByAvailability(
    TOOL_PROFILES.cli,
    deps.serviceAvailability,
  );
  const unconfiguredPrompt = buildUnconfiguredServicesPrompt(
    deps.serviceAvailability,
  );
  return {
    getExtraTools: buildExtraToolsGetter(
      deps.mcpWiring,
      deps.isTidepoolCallRef,
      deps.tidepoolToolsRef,
    ),
    getExtraSystemPromptSections: buildExtraSystemPromptGetter(
      deps.mcpWiring,
      deps.isTidepoolCallRef,
      () => deps.state.session.taint,
      deps.workspacePaths,
      deps.personaOptions,
    ),
    systemPromptSections: [
      TOOL_BEHAVIOR_PROMPT,
      ...resolvePromptsForProfile(filteredProfile),
      deps.skillsPrompt,
      deps.triggersPrompt,
      ...(unconfiguredPrompt ? [unconfiguredPrompt] : []),
    ],
    ...(deps.streamingPref !== undefined
      ? { enableStreaming: deps.streamingPref === true }
      : {}),
    debug: deps.config.debug === true ||
      Deno.env.get("TRIGGERFISH_DEBUG") === "1",
  };
}

/** Create the main chat session with all orchestrator config. */
export function assembleChatSession(deps: ChatSessionDeps) {
  const lifecycle = buildSessionLifecycleCallbacks(
    deps.state,
    deps.browserHandle,
    deps.log,
  );
  const filteredProfile = filterProfileByAvailability(
    TOOL_PROFILES.cli,
    deps.serviceAvailability,
  );
  return createChatSession({
    hookRunner: deps.hookRunner,
    providerRegistry: deps.registry,
    spinePath: deps.spinePath,
    tools: resolveToolsForProfile(filteredProfile),
    ...buildChatSessionDynamicOptions(deps),
    toolExecutor: deps.toolExecutor,
    secretStore: deps.mainKeychain,
    session: deps.state.session,
    getSession: () => deps.state.session,
    visionProvider: deps.visionProvider,
    toolClassifications: deps.toolClassifications,
    integrationClassifications: deps.integrationClassifications,
    ...lifecycle,
    pairingService: deps.pairingService,
    pathClassifier: deps.pathClassifier,
    domainClassifier: deps.domainClassifier,
    toolFloorRegistry: deps.toolFloorRegistry,
    primaryModelName: deps.config.models.primary.model,
    getActiveSkillContext: deps.getActiveSkillContext,
    triggerStore: deps.triggerStore,
    broadcastChatEvent: deps.broadcastChatEvent,
    workspacePath: deps.workspacePaths.publicPath,
    getWorkspacePath: deps.getWorkspacePath,
    isOwnerTurnRef: deps.isOwnerTurnRef,
    messageStore: deps.messageStore,
    lineageStore: deps.lineageStore,
  });
}

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
    // Re-declare getters: spread evaluates them to static values, losing
    // the live delegation. sessionTaint must stay dynamic so reconnecting
    // clients see the current taint, not the startup-time value.
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
  console.log(`  Tidepool: http://127.0.0.1:${TIDEPOOL_PORT}`);
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
    // Re-declare getters: spread evaluates them to static values, losing
    // the live delegation. sessionTaint must stay dynamic so reconnecting
    // clients see the current taint, not the startup-time value.
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

const channelLog = createLogger("startup-channels");

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
