/**
 * Centralized constants for the security module.
 *
 * Referenced by path_classification.ts, tool_floors.ts, and the orchestrator
 * wiring layer. No magic strings in logic — all hardcoded security values
 * live here.
 *
 * @module
 */

import type { ClassificationLevel } from "../types/classification.ts";

/** Classification directory names used in workspace partitioning. */
export const CLASSIFICATION_DIRS: Readonly<
  Record<Exclude<ClassificationLevel, "PUBLIC">, string>
> = {
  INTERNAL: "internal",
  CONFIDENTIAL: "confidential",
  RESTRICTED: "restricted",
} as const;

/** Workspace subdirectory names created under each classification directory. */
export const WORKSPACE_SUBDIRS = [
  "scratch",
  "integrations",
  "skills",
] as const;

/** Basename patterns that are always RESTRICTED regardless of location. */
export const PROTECTED_BASENAMES: readonly string[] = [
  "triggerfish.yaml",
  "SPINE.md",
  "TRIGGER.md",
] as const;

/** Directory path suffixes (relative to home) that are always RESTRICTED. */
export const PROTECTED_DIR_PATTERNS: readonly string[] = [
  ".triggerfish/config",
  ".triggerfish/data",
  ".triggerfish/logs",
] as const;

/** Filesystem tools grouped by operation type. */
export const FILESYSTEM_READ_TOOLS: ReadonlySet<string> = new Set([
  "read_file",
  "list_directory",
  "search_files",
  "explore",
]);

/** Filesystem write tools. */
export const FILESYSTEM_WRITE_TOOLS: ReadonlySet<string> = new Set([
  "write_file",
  "edit_file",
]);

/** Tools that access a URL (read operation — fetching content). */
export const URL_READ_TOOLS: ReadonlySet<string> = new Set([
  "web_fetch",
  "browser_navigate",
]);

/** Tools that submit data to a URL (write operation — posting/typing into forms). */
export const URL_WRITE_TOOLS: ReadonlySet<string> = new Set([
  "browser_type",
]);

/**
 * Tools with hardcoded classification floors (non-overridable minimums).
 *
 * Browser tools (read-only and interactive) have no floor — the existing
 * resource-write-down check already prevents a higher-tainted session from
 * submitting data to a lower-classified domain. A floor would create an
 * impossible situation in owner sessions: escalating to INTERNAL to satisfy
 * the floor would immediately trigger write-down against a PUBLIC domain,
 * making browser interaction on public websites impossible. The browser
 * profile watermark system (src/browser/watermark.ts) separately prevents
 * a lower-tainted session from reusing a profile used at a higher level.
 *
 * claude_* exec tools require INTERNAL (spawning sub-agents).
 */
export const HARDCODED_TOOL_FLOORS: ReadonlyMap<string, ClassificationLevel> =
  new Map<string, ClassificationLevel>([
    // claude_* exec tools require INTERNAL (spawning sub-agents)
    ["claude_session", "INTERNAL"],
    ["claude_output", "INTERNAL"],
  ]);

/**
 * Basenames the agent may never write to via filesystem tools.
 *
 * TRIGGER.md is write-protected because the trigger session reads it
 * starting at PUBLIC taint. Allowing a classified session to write to
 * it would be a write-down (RESTRICTED data flowing to PUBLIC).
 * Trigger instructions are managed via the `trigger_manage` tool instead.
 */
export const WRITE_PROTECTED_BASENAMES: ReadonlySet<string> = new Set([
  "TRIGGER.md",
]);

/** Default classification for unmapped filesystem paths. */
export const DEFAULT_PATH_CLASSIFICATION: ClassificationLevel = "CONFIDENTIAL";
