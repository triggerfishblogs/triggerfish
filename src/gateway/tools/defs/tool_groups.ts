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
import { getSessionToolDefinitions } from "../session/session_tools.ts";
import { getImageToolDefinitions } from "../../../tools/image/mod.ts";
import { getExploreToolDefinitions } from "../../../tools/explore/mod.ts";
import { getGoogleToolDefinitions } from "../../../integrations/google/mod.ts";
import { getGitHubToolDefinitions } from "../../../integrations/github/mod.ts";
import { getObsidianToolDefinitions } from "../../../tools/obsidian/mod.ts";
import {
  getHealthcheckToolDefinitions,
  getLlmTaskToolDefinitions,
  getSummarizeToolDefinitions,
} from "../../../tools/mod.ts";
import { getTriggerToolDefinitions } from "../trigger/trigger_tools.ts";
import { getClaudeToolDefinitions } from "../../../exec/claude.ts";
import { getSkillToolDefinitions } from "../../../tools/skills/mod.ts";
import { getExecInlineDefinitions } from "./exec_tool_defs.ts";
import { getAgentInlineDefinitions } from "./agent_tool_defs.ts";
import { getCronInlineDefinitions } from "./cron_tool_defs.ts";

/** Composable tool groups — each returns a focused set of ToolDefinitions. */
export const TOOL_GROUPS = {
  exec: getExecInlineDefinitions,
  todo: getTodoToolDefinitions,
  memory: getMemoryToolDefinitions,
  secrets: getSecretToolDefinitions,
  web: getWebToolDefinitions,
  plan: getPlanToolDefinitions,
  browser: getBrowserToolDefinitions,
  tidepool: getTidepoolToolDefinitions,
  sessions: getSessionToolDefinitions,
  image: getImageToolDefinitions,
  explore: getExploreToolDefinitions,
  google: getGoogleToolDefinitions,
  github: getGitHubToolDefinitions,
  obsidian: getObsidianToolDefinitions,
  llmTask: getLlmTaskToolDefinitions,
  summarize: getSummarizeToolDefinitions,
  healthcheck: getHealthcheckToolDefinitions,
  trigger: getTriggerToolDefinitions,
  claude: getClaudeToolDefinitions,
  skills: getSkillToolDefinitions,
  agents: getAgentInlineDefinitions,
  cron: getCronInlineDefinitions,
} as const;

/** Name of a tool group in TOOL_GROUPS. */
export type ToolGroupName = keyof typeof TOOL_GROUPS;
