/**
 * Gateway startup, wiring, and subsystem initialization.
 *
 * @module
 */

export { runStart } from "./startup.ts";
export { wireChannels } from "./channels.ts";
export { wireMcpServers } from "./mcp.ts";
export type { McpBroadcastRefs } from "./mcp.ts";
export { buildObsidianExecutor, discoverSkills } from "./subsystems.ts";
export { buildWebTools } from "./web_tools.ts";
export { buildSubagentFactory } from "./subagent.ts";
export { createOrchestratorFactory } from "./orchestrator_factory.ts";
export { buildSchedulerConfig } from "./scheduler_config.ts";
export { buildGoogleExecutor } from "./google_executor.ts";
export { createConfigWatcher } from "./config_watcher.ts";
