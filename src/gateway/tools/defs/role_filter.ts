/**
 * Role-based tool filtering for non-owner sessions.
 *
 * Defines which tools are restricted to the owner and provides a
 * filter function applied at LLM call time. Non-owner users in group
 * chats or channels never see or invoke privileged tools.
 *
 * Defense-in-depth: the LLM never receives owner-only tools in its
 * tool list, and a separate hook in the tool executor blocks them
 * even if somehow invoked.
 *
 * @module
 */

import type { ToolDefinition } from "../../../core/types/tool.ts";

/**
 * Tools restricted to the owner. Non-owner sessions never receive
 * these tools in their LLM tool list, and the executor rejects any
 * attempt to call them.
 *
 * Covers code execution, browser automation, destructive memory ops,
 * skill management, scheduling, secret management, and agent spawning.
 */
export const OWNER_ONLY_TOOLS: ReadonlySet<string> = new Set([
  // Code execution and filesystem writes
  "run_command",
  "write_file",
  "edit_file",
  // Browser automation
  "browser_navigate",
  "browser_snapshot",
  "browser_click",
  "browser_type",
  "browser_select",
  "browser_scroll",
  "browser_wait",
  "browser_describe",
  "browser_close",
  // Destructive memory operations
  "memory_save",
  "memory_delete",
  // Skill management
  "read_skill",
  // Scheduling
  "cron_create",
  "cron_delete",
  "cron_list",
  "trigger_enable",
  "trigger_disable",
  "trigger_status",
  "trigger_run_now",
  "trigger_add_to_context",
  "trigger_clear_context",
  // Secret management
  "secret_save",
  "secret_delete",
  // Agent spawning
  "subagent",
  // Session management (owner-only commands)
  "session_list",
  "session_delete",
]);

/**
 * Filter tool definitions by user role.
 *
 * Non-owner users receive a restricted subset that excludes all
 * privileged operations. This is defense-in-depth on top of the
 * executor-level `ownerOnlyTools` check: the LLM never sees tools
 * it cannot use, and the executor rejects them if tried anyway.
 *
 * Owner sessions pass through unchanged.
 */
export function filterToolsForRole(
  tools: readonly ToolDefinition[],
  isOwner: boolean,
): readonly ToolDefinition[] {
  if (isOwner) return tools;
  return tools.filter((t) => !OWNER_ONLY_TOOLS.has(t.name));
}
