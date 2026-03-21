/**
 * Tool definitions, groups, and profiles.
 *
 * @module
 */

export {
  buildAgentInlineDefinitions,
  getAgentInlineDefinitions,
} from "./agent_tool_defs.ts";
export {
  buildCronInlineDefinitions,
  getCronInlineDefinitions,
} from "./cron_tool_defs.ts";
export {
  buildExecInlineDefinitions,
  getExecInlineDefinitions,
} from "./exec_tool_defs.ts";
export { filterToolsForRole, OWNER_ONLY_TOOLS } from "./role_filter.ts";
export { TOOL_GROUPS, type ToolGroupName } from "./tool_groups.ts";
export {
  resolvePromptsForProfile,
  resolveToolsForProfile,
  TOOL_GROUP_PROMPTS,
  TOOL_PROFILES,
  type ToolProfile,
  type ToolProfileName,
} from "./tool_profile_defs.ts";
export {
  buildToolDefinitions,
  buildUnconfiguredServicesPrompt,
  filterProfileByAvailability,
  getToolDefinitions,
  type ServiceAvailability,
} from "./service_availability.ts";
export {
  CONFIG_MANAGE_SYSTEM_PROMPT,
  getConfigManageToolDefinitions,
} from "./config_manage_defs.ts";
export {
  getMcpManageToolDefinitions,
  MCP_MANAGE_SYSTEM_PROMPT,
} from "./mcp_manage_defs.ts";
export {
  DAEMON_MANAGE_SYSTEM_PROMPT,
  getDaemonManageToolDefinitions,
} from "./daemon_manage_defs.ts";
export {
  getSpineManageToolDefinitions,
  SPINE_MANAGE_SYSTEM_PROMPT,
} from "./spine_manage_defs.ts";
