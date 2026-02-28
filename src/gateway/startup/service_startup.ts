/**
 * Service startup phase — builds chat session and launches network services.
 *
 * Creates the main chat session, starts Tidepool and Gateway servers,
 * wires messaging channels, starts the scheduler, and assembles
 * shutdown dependencies.
 *
 * @module
 */

import type { createLogger } from "../../core/logger/mod.ts";
import type { createSchedulerService } from "../../scheduler/service.ts";
import type { buildSchedulerConfig } from "./factory/scheduler_config.ts";
import { createTidePoolTools } from "../../tools/tidepool/mod.ts";
import { createChatSession } from "../chat.ts";
import type { BootstrapResult } from "./bootstrap.ts";
import type { CoreInfraResult } from "./infra/core_infra.ts";
import type { ToolInfraResult } from "./tools/tool_infra.ts";
import type { ShutdownDeps } from "./shutdown.ts";
import {
  assembleChatSession,
  wrapChatSessionForTidepool,
  startTidepoolHost,
  wrapChatSessionForGateway,
  startGatewayServer,
  wireMessageChannels,
} from "./services/chat_session.ts";

/** Create the main chat session from assembled infrastructure. */
export function buildMainChatSession(
  bootstrap: BootstrapResult,
  coreInfra: CoreInfraResult,
  toolInfra: ToolInfraResult,
  isTidepoolCallRef: { value: boolean },
) {
  const modelsConfig = bootstrap.config.models as
    | Record<string, unknown>
    | undefined;
  return assembleChatSession({
    hookRunner: toolInfra.hookRunner,
    registry: toolInfra.registry,
    spinePath: toolInfra.spinePath,
    mcpWiring: toolInfra.mcpWiring,
    isTidepoolCallRef,
    tidepoolToolsRef: toolInfra.tidepoolToolsRef,
    toolExecutor: toolInfra.toolExecutor,
    skillsPrompt: toolInfra.skillsPrompt,
    triggersPrompt: toolInfra.triggersPrompt,
    mainKeychain: toolInfra.mainKeychain,
    state: toolInfra.state,
    streamingPref: modelsConfig?.streaming,
    config: bootstrap.config,
    visionProvider: toolInfra.visionProvider,
    toolClassifications: toolInfra.toolClassifications,
    integrationClassifications: toolInfra.integrationClassifications,
    browserHandle: toolInfra.browserHandle,
    log: bootstrap.log,
    pairingService: coreInfra.pairingService,
    pathClassifier: toolInfra.pathClassifier,
    domainClassifier: toolInfra.domainClassifier,
    toolFloorRegistry: toolInfra.toolFloorRegistry,
    getActiveSkillContext: toolInfra.skillContextTracker
      ? () => toolInfra.skillContextTracker!.getActive()
      : undefined,
    triggerStore: coreInfra.triggerStore,
    broadcastChatEvent: (event) => {
      coreInfra.gatewayServerRef.value?.broadcastChatEvent(event);
    },
    workspacePaths: {
      publicPath: toolInfra.mainWorkspace.publicPath,
      internalPath: toolInfra.mainWorkspace.internalPath,
      confidentialPath: toolInfra.mainWorkspace.confidentialPath,
      restrictedPath: toolInfra.mainWorkspace.restrictedPath,
    },
  });
}

/** Start the Tidepool host and wire tool references. */
export async function launchTidepoolService(
  toolInfra: ToolInfraResult,
  chatSession: ReturnType<typeof createChatSession>,
  isTidepoolCallRef: { value: boolean },
  notificationService: CoreInfraResult["notificationService"],
  log: BootstrapResult["log"],
) {
  const tidepoolChatSession = wrapChatSessionForTidepool(
    chatSession,
    isTidepoolCallRef,
    toolInfra.state,
    toolInfra.cliSecretPrompt,
    toolInfra.cliCredentialPrompt,
  );
  const tidepoolHost = await startTidepoolHost(
    tidepoolChatSession,
    notificationService,
    log,
  );
  toolInfra.tidepoolToolsRef.value = createTidePoolTools(tidepoolHost);
  toolInfra.mcpBroadcastRefs.tidepoolHost = tidepoolHost;
  return tidepoolHost;
}

/** Start the Gateway WebSocket service. */
export async function launchGatewayService(
  toolInfra: ToolInfraResult,
  chatSession: ReturnType<typeof createChatSession>,
  coreInfra: CoreInfraResult,
  log: BootstrapResult["log"],
) {
  const gatewayChatSession = wrapChatSessionForGateway(
    chatSession,
    toolInfra.state,
    toolInfra.cliSecretPrompt,
    toolInfra.cliCredentialPrompt,
  );
  const server = await startGatewayServer(
    gatewayChatSession,
    coreInfra.schedulerService,
    coreInfra.enhancedSessionManager,
    coreInfra.notificationService,
    log,
  );
  toolInfra.mcpBroadcastRefs.gatewayServer = server;
  return server;
}

/** Start Tidepool and Gateway servers, returning handles for shutdown. */
export async function startNetworkServices(
  bootstrap: BootstrapResult,
  coreInfra: CoreInfraResult,
  toolInfra: ToolInfraResult,
  chatSession: ReturnType<typeof createChatSession>,
  isTidepoolCallRef: { value: boolean },
) {
  const tidepoolHost = await launchTidepoolService(
    toolInfra,
    chatSession,
    isTidepoolCallRef,
    coreInfra.notificationService,
    bootstrap.log,
  );
  const server = await launchGatewayService(
    toolInfra,
    chatSession,
    coreInfra,
    bootstrap.log,
  );
  // Populate the deferred ref so onTriggerOutput can broadcast to chat sockets
  coreInfra.gatewayServerRef.value = server;
  return { tidepoolHost, server };
}

/** Log scheduler start status and trigger interval. */
function logSchedulerStart(
  schedulerService: ReturnType<typeof createSchedulerService>,
  schedulerConfig: ReturnType<typeof buildSchedulerConfig>,
  log: ReturnType<typeof createLogger>,
): void {
  schedulerService.start();
  log.info("Scheduler started");
  if (schedulerConfig.trigger.enabled) {
    log.info(`Trigger: every ${schedulerConfig.trigger.intervalMinutes}m`);
  }
  log.info("Triggerfish is running!");
}

/** Assemble shutdown dependency bag from service handles. */
export function assembleShutdownDeps(
  coreInfra: CoreInfraResult,
  toolInfra: ToolInfraResult,
  log: ReturnType<typeof createLogger>,
  signalDaemonState: Awaited<ReturnType<typeof wireMessageChannels>>,
  server: Awaited<ReturnType<typeof startGatewayServer>>,
  tidepoolHost: Awaited<ReturnType<typeof startTidepoolHost>>,
): ShutdownDeps {
  return {
    signalDaemonState,
    schedulerService: coreInfra.schedulerService,
    server,
    tidepoolHost,
    memoryDb: toolInfra.memoryDb,
    storage: coreInfra.storage,
    log,
  };
}

/** Build chat session and start Tidepool + Gateway servers. */
export async function startServicesAndChannels(
  bootstrap: BootstrapResult,
  coreInfra: CoreInfraResult,
  toolInfra: ToolInfraResult,
): Promise<ShutdownDeps> {
  const isTidepoolCallRef = { value: false };
  const chatSession = buildMainChatSession(
    bootstrap,
    coreInfra,
    toolInfra,
    isTidepoolCallRef,
  );
  bootstrap.log.info("Main session created");
  toolInfra.mcpBroadcastRefs.chatSession = chatSession;

  const { tidepoolHost, server } = await startNetworkServices(
    bootstrap,
    coreInfra,
    toolInfra,
    chatSession,
    isTidepoolCallRef,
  );
  const signalDaemonState = await wireMessageChannels(
    bootstrap.config,
    chatSession,
    coreInfra.notificationService,
    toolInfra.channelAdapters,
  );
  logSchedulerStart(
    coreInfra.schedulerService,
    coreInfra.schedulerConfig,
    bootstrap.log,
  );
  return assembleShutdownDeps(
    coreInfra,
    toolInfra,
    bootstrap.log,
    signalDaemonState,
    server,
    tidepoolHost,
  );
}
