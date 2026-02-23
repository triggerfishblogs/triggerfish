/**
 * Service initialization — browser, integrations, chat session, config watcher.
 *
 * @module
 */

export {
  buildBrowserDomainPolicyFromConfig,
  buildExploreExecutor,
  buildGitHubClientConfig,
  buildGitHubExecutor,
  initializeBrowserExecutor,
  initializeMcpServers,
} from "./browser_init.ts";
export {
  buildAgentToolExecutors,
  buildExternalServiceExecutors,
  buildIntegrationExecutors,
  buildMainTriggerExecutor,
  buildSkillAndAgentExecutors,
  initializeMcpInfrastructure,
} from "./integration_init.ts";
export type { ChatSessionDeps } from "./chat_session.ts";
export {
  assembleChatSession,
  buildChatSessionDynamicOptions,
  buildSessionLifecycleCallbacks,
  startGatewayServer,
  startTidepoolHost,
  wireMessageChannels,
  wrapChatSessionForGateway,
  wrapChatSessionForTidepool,
} from "./chat_session.ts";
export type {
  ConfigChangeCallback,
  ConfigWatcher,
  ConfigWatcherOptions,
} from "./config_watcher.ts";
export { createConfigWatcher } from "./config_watcher.ts";
