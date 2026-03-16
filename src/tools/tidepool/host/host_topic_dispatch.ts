/**
 * Topic dispatcher factories for Tidepool screen handlers.
 *
 * Facade re-exporting from host_dispatch_simple, host_dispatch_memory,
 * host_dispatch_workflows, and host_dispatch_settings.
 *
 * @module
 */

export {
  createAgentsTopicDispatcher,
  createHealthTopicDispatcher,
  createLogsTopicDispatcher,
} from "./host_dispatch_simple.ts";

export { createMemoryTopicDispatcher } from "./host_dispatch_memory.ts";

export { createWorkflowsTopicDispatcher } from "./host_dispatch_workflows.ts";

export { createSettingsTopicDispatcher } from "./host_dispatch_settings.ts";
