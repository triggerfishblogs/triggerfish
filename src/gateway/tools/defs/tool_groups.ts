/**
 * Composable tool groups — each entry maps a group name to a
 * function returning a focused set of ToolDefinitions.
 *
 * Groups are the building blocks for tool profiles. Each group is
 * independent and can be composed into any profile combination.
 *
 * @module
 */

import { getTodoToolDefinitions } from "../../../tools/mod.ts";
import { getMemoryToolDefinitions } from "../../../tools/memory/mod.ts";
import { getSecretToolDefinitions } from "../../../tools/secrets.ts";
import { getWebToolDefinitions } from "../../../tools/web/mod.ts";
import { getPlanToolDefinitions } from "../../../agent/plan/tools.ts";
import { getBrowserToolDefinitions } from "../../../tools/browser/mod.ts";
import { getTidepoolToolDefinitions } from "../../../tools/tidepool/mod.ts";
import {
  getSessionToolDefinitions,
  getSignalToolDefinitions,
} from "../session/session_tools.ts";
import { getImageToolDefinitions } from "../../../tools/image/mod.ts";
import { getExploreToolDefinitions } from "../../../tools/explore/mod.ts";
import { getGoogleToolDefinitions } from "../../../integrations/google/mod.ts";
import { getGitHubToolDefinitions } from "../../../integrations/github/mod.ts";
import { getCalDavToolDefinitions } from "../../../integrations/caldav/mod.ts";
import { getNotionToolDefinitions } from "../../../integrations/notion/mod.ts";
import { getObsidianToolDefinitions } from "../../../tools/obsidian/mod.ts";
import {
  getHealthcheckToolDefinitions,
  getLlmTaskToolDefinitions,
  getReleaseNotesToolDefinitions,
  getSummarizeToolDefinitions,
} from "../../../tools/mod.ts";
import { getTriggerToolDefinitions } from "../trigger/trigger_tools.ts";
import { getTriggerManageToolDefinitions } from "../trigger/trigger_manage_defs.ts";
import { getClaudeToolDefinitions } from "../../../exec/claude.ts";
import { getSkillToolDefinitions } from "../../../tools/skills/mod.ts";
import { getLogReaderToolDefinitions } from "../../../tools/log_reader_tool.ts";
import {
  getExecCommandDefinitions,
  getExecFileDefinitions,
  getExecInlineDefinitions,
} from "./exec_tool_defs.ts";
import { getAgentInlineDefinitions } from "./agent_tool_defs.ts";
import { getCronInlineDefinitions } from "./cron_tool_defs.ts";
import { getSimulateToolDefinitions } from "../../../tools/simulate/mod.ts";

/** Composable tool groups — each returns a focused set of ToolDefinitions. */
export const TOOL_GROUPS = {
  exec: getExecInlineDefinitions,
  exec_file: getExecFileDefinitions,
  exec_command: getExecCommandDefinitions,
  todo: getTodoToolDefinitions,
  memory: getMemoryToolDefinitions,
  secrets: getSecretToolDefinitions,
  web: getWebToolDefinitions,
  plan: getPlanToolDefinitions,
  browser: getBrowserToolDefinitions,
  tidepool: getTidepoolToolDefinitions,
  sessions: getSessionToolDefinitions,
  signal: getSignalToolDefinitions,
  image: getImageToolDefinitions,
  explore: getExploreToolDefinitions,
  google: getGoogleToolDefinitions,
  github: getGitHubToolDefinitions,
  caldav: getCalDavToolDefinitions,
  notion: getNotionToolDefinitions,
  obsidian: getObsidianToolDefinitions,
  llmTask: getLlmTaskToolDefinitions,
  summarize: getSummarizeToolDefinitions,
  healthcheck: getHealthcheckToolDefinitions,
  trigger: getTriggerToolDefinitions,
  triggerManage: getTriggerManageToolDefinitions,
  claude: getClaudeToolDefinitions,
  skills: getSkillToolDefinitions,
  releaseNotes: getReleaseNotesToolDefinitions,
  logReader: getLogReaderToolDefinitions,
  agents: getAgentInlineDefinitions,
  cron: getCronInlineDefinitions,
  simulate: getSimulateToolDefinitions,
} as const;

/** Name of a tool group in TOOL_GROUPS. */
export type ToolGroupName = keyof typeof TOOL_GROUPS;
