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

export {
  buildToolExecutor,
} from "./executor.ts";

export {
  createSessionToolExecutor,
  getSessionToolDefinitions,
  SESSION_TOOLS_SYSTEM_PROMPT,
} from "./session_tools.ts";
export type { RegisteredChannel } from "./session_tools.ts";

export {
  SESSION_TOOL_SCHEMAS,
} from "./session_tools_defs.ts";
export type { SessionToolContext } from "./session_tools_defs.ts";

export {
  createTriggerToolExecutor,
  createTriggerClassificationToolExecutor,
  getTriggerToolDefinitions,
  getTriggerContextToolDefinitions,
  TRIGGER_SESSION_SYSTEM_PROMPT,
} from "./trigger_tools.ts";
export type { TriggerToolContext } from "./trigger_tools.ts";
