/**
 * Tool registration, profiles, and dispatch.
 *
 * @module
 */

export {
  resolveToolsForProfile,
  resolvePromptsForProfile,
  createToolExecutor,
  TOOL_GROUPS,
} from "./agent_tools.ts";

export {
  TOOL_PROFILES,
  TOOL_GROUP_PROMPTS,
} from "./registry.ts";

export type { SubsystemExecutor, ToolExecutorOptions } from "./executor/executor_types.ts";

export {
  createSessionToolExecutor,
  getSessionToolDefinitions,
  SESSION_TOOLS_SYSTEM_PROMPT,
} from "./session/session_tools.ts";
export type { RegisteredChannel } from "./session/session_tools.ts";

export type { SessionToolContext } from "./session/session_tools_defs.ts";

export {
  createTriggerToolExecutor,
  createTriggerClassificationToolExecutor,
  getTriggerToolDefinitions,
  getTriggerContextToolDefinitions,
  TRIGGER_SESSION_SYSTEM_PROMPT,
} from "./trigger/trigger_tools.ts";
export type { TriggerToolContext } from "./trigger/trigger_tools.ts";
