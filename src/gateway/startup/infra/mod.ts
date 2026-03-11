/**
 * Core infrastructure, storage, workspace, MCP, and subsystem initialization.
 *
 * @module
 */

export type { CoreInfraResult } from "./core_infra.ts";
export {
  buildSchedulerInfrastructure,
  buildSecurityConfig,
  initializeCoreInfrastructure,
  warnPublicFilesystemDefault,
} from "./core_infra.ts";
export {
  initializeLlmProviders,
  initializePersistentStorage,
  initializeSessionInfrastructure,
} from "./storage.ts";
export type { InitializeMemoryOptions } from "./workspace_init.ts";
export {
  buildMainPathClassifier,
  initializeMainWorkspace,
  initializeMemorySystem,
} from "./workspace_init.ts";
export type { McpBroadcastRefs, McpWiringResult } from "./mcp.ts";
export { wireMcpServers } from "./mcp.ts";
export type {
  ObsidianPluginConfig,
  SkillDiscoveryResult,
} from "./subsystems.ts";
export {
  buildObsidianExecutor,
  createCliSecretPrompt,
  discoverSkills,
} from "./subsystems.ts";
