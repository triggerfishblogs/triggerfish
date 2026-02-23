/**
 * Core infrastructure, storage, workspace, MCP, and subsystem initialization.
 *
 * @module
 */

export type { CoreInfraResult } from "./core_infra.ts";
export {
  buildSecurityConfig,
  buildSchedulerInfrastructure,
  initializeCoreInfrastructure,
  warnPublicFilesystemDefault,
} from "./core_infra.ts";
export {
  initializePersistentStorage,
  initializeSessionInfrastructure,
  initializeLlmProviders,
} from "./storage.ts";
export {
  initializeMainWorkspace,
  buildMainPathClassifier,
  initializeMemorySystem,
} from "./workspace_init.ts";
export type { McpBroadcastRefs, McpWiringResult } from "./mcp.ts";
export { wireMcpServers } from "./mcp.ts";
export type { ObsidianPluginConfig, SkillDiscoveryResult } from "./subsystems.ts";
export {
  buildObsidianExecutor,
  createCliSecretPrompt,
  discoverSkills,
} from "./subsystems.ts";
