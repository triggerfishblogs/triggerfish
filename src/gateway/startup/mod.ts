/**
 * Gateway startup, wiring, and subsystem initialization.
 *
 * @module
 */

export { startGateway } from "./startup.ts";
export { wireChannels } from "./channels.ts";
export { wireMcpServers } from "./mcp.ts";
export type { McpBroadcastRefs } from "./mcp.ts";
export { buildObsidianExecutor, discoverSkills } from "./subsystems.ts";
export {
  buildWebTools,
  buildSubagentFactory,
  createOrchestratorFactory,
  buildSchedulerConfig,
  buildGoogleExecutor,
  GOOGLE_SCOPES,
} from "./factory.ts";
export { createConfigWatcher } from "./config_watcher.ts";
