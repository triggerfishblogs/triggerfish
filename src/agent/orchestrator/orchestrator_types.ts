/**
 * Orchestrator types, events, and classification map builder.
 *
 * Defines the public API surface for the agent orchestrator:
 * tool definitions, config, events, and the prefix-to-classification
 * mapping used for integration security enforcement.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import type { ToolDefinition, ToolExecutor } from "../../core/types/tool.ts";
import type { SecretStore } from "../../core/secrets/keychain/keychain.ts";
import type { PathClassifier } from "../../core/security/path_classification.ts";
import type { ToolFloorRegistry } from "../../core/security/tool_floors.ts";
import type { DomainClassifier } from "../../core/types/domain.ts";
import type { HookRunner } from "../../core/policy/hooks/hooks.ts";
import type { LlmProvider, LlmProviderRegistry } from "../llm.ts";
import type { CompactorConfig } from "../compactor/compactor.ts";
import type { PlanManager } from "../plan/plan.ts";

/** Default system prompt used when no SPINE.md is found. */
export const DEFAULT_SYSTEM_PROMPT =
  "You are a helpful AI assistant powered by Triggerfish. " +
  "Follow the user's instructions and respond clearly and concisely.";

/** Maximum tool call iterations to prevent infinite loops. */
export const MAX_TOOL_ITERATIONS = 25;

/** Iteration at which the LLM is warned to wrap up. */
export const SOFT_LIMIT_ITERATIONS = 20;

/**
 * Pattern detecting leaked tool-intent narration in LLM responses.
 * Matches phrases like "I'll search", "Let me fetch", "I need to look up", etc.
 * Used as a defense-in-depth guard — the primary fix is prompt hardening.
 */
export const LEAKED_INTENT_PATTERN =
  /\b(?:(?:I(?:'ll| will| need to| should| can| am going to)\s+(?:search|fetch|look up|find|check|browse|retrieve|use web_))|(?:(?:Let|let) me (?:search|fetch|look|find|check|browse|retrieve|use))|(?:(?:We|I) need to (?:fetch|search|look up|find|check|browse|retrieve)))/i;

/**
 * Pattern detecting trailing continuation intent at the end of a long response.
 *
 * Matches phrases like "Let me now create", "I'll search", "Next, I'll fetch"
 * when they appear in the tail of a response. Unlike LEAKED_INTENT_PATTERN
 * (which checks short responses entirely), this catches the case where the LLM
 * writes a long valid response but then trails off with unfulfilled intent.
 */
export const TRAILING_CONTINUATION_PATTERN =
  /(?:Let me (?:now |also |next )?(?:create|search|fetch|look|find|check|browse|retrieve|proceed|do|make|add|set up|handle|update|generate|build|write|run|open|close|delete|send|post|submit|call))|(?:I(?:'ll| will| am going to) (?:now |also |next )?(?:create|search|fetch|look|find|check|browse|retrieve|proceed|do|make|add|set up|handle|update|generate|build|write|run|open|close|delete|send|post|submit|call))|(?:Next,? I(?:'ll| will))|(?:Now (?:let me|I'll|I will))/i;

export type { ToolDefinition, ToolExecutor } from "../../core/types/tool.ts";

/**
 * Structural snapshot of an active skill's capability declarations.
 *
 * Defined here (not in tools/) to avoid layer violations per dependency-layers.md.
 * Satisfied by Skill from src/tools/skills/loader.ts at the gateway wiring layer.
 */
export interface ActiveSkillContext {
  readonly name: string;
  /**
   * Tools the skill declared it needs.
   * null = not declared (unrestricted). [] = declared empty (no tool access).
   */
  readonly requiresTools: readonly string[] | null;
  /**
   * Network domains the skill declared it needs.
   * null = not declared (unrestricted). [] = declared empty (no network access).
   */
  readonly networkDomains: readonly string[] | null;
  readonly classificationCeiling: ClassificationLevel;
}

/** Configuration for creating an orchestrator. */
export interface OrchestratorConfig {
  readonly hookRunner: HookRunner;
  readonly providerRegistry: LlmProviderRegistry;
  readonly spinePath?: string;
  /**
   * Maximum tool call iterations before stopping the agent loop.
   * Defaults to MAX_TOOL_ITERATIONS (25) when not set.
   * Use lower values for short-lived sessions like explore subagents.
   */
  readonly maxIterations?: number;
  /** Tool definitions available to the agent. */
  readonly tools?: readonly ToolDefinition[];
  /**
   * Live getter for additional tool definitions resolved at each LLM call.
   * Used for dynamically-connected sources such as MCP servers.
   */
  readonly getExtraTools?: () => readonly ToolDefinition[];
  /**
   * Live getter for additional system prompt sections resolved at each LLM call.
   * Used for dynamically-connected sources such as MCP servers.
   */
  readonly getExtraSystemPromptSections?: () => readonly string[] | Promise<readonly string[]>;
  /** Callback to execute tool calls. */
  readonly toolExecutor?: ToolExecutor;
  /** Event callback for real-time progress reporting. */
  readonly onEvent?: OrchestratorEventCallback;
  /** Configuration for conversation compactor. */
  readonly compactorConfig?: Partial<CompactorConfig>;
  /**
   * Additional system prompt sections injected by the platform.
   * Appended AFTER SPINE.md and tool definitions. SPINE.md remains
   * the foundation — these sections layer platform behaviour on top.
   */
  readonly systemPromptSections?: readonly string[];
  /**
   * Maximum character budget for tool responses.
   * Overrides the global default (12,000) for tools without per-tool overrides.
   * Use lower values for background/trigger sessions to reduce token usage.
   */
  readonly maxToolResponseChars?: number;
  /** Plan manager for plan mode state tracking and tool execution. */
  readonly planManager?: PlanManager;
  /** Enable streaming responses from the LLM provider. Default: true. */
  readonly enableStreaming?: boolean;
  /** Enable verbose logging of LLM responses and tool calls to stderr. */
  readonly debug?: boolean;
  /** Vision-capable LLM provider for describing images when the primary model lacks vision. */
  readonly visionProvider?: LlmProvider;
  /** Tool prefix → classification level. Enforced before every tool dispatch. */
  readonly toolClassifications?: ReadonlyMap<string, ClassificationLevel>;
  /** Integration prefix → default resource classification. Used for write-down checks on integration tools. */
  readonly integrationClassifications?: ReadonlyMap<
    string,
    ClassificationLevel
  >;
  /** Read current session taint for canFlowTo checks. */
  readonly getSessionTaint?: () => ClassificationLevel;
  /** Escalate session taint after tool dispatch (upward only via maxClassification). */
  readonly escalateTaint?: (level: ClassificationLevel, reason: string) => void;
  /**
   * Check if bumpers would block taint escalation to the given level.
   * Returns the block message when bumpers are active and the level
   * would escalate taint, or null when the escalation is allowed.
   */
  readonly checkBumpersBlock?: (level: ClassificationLevel) => string | null;
  /** Whether the active session belongs to the owner. */
  readonly isOwnerSession?: () => boolean;
  /**
   * Whether the active session is a trigger session.
   * Trigger sessions are not owner sessions but may call all built-in tools
   * and integration tools classified at or below their ceiling.
   * Undefined is always false — must be explicitly set to enable trigger behaviour.
   */
  readonly isTriggerSession?: () => boolean;
  /**
   * Classification ceiling for the active non-owner session.
   * null = no explicit classification → all tools blocked.
   * Non-null = tools classified at or below this level are allowed.
   */
  readonly getNonOwnerCeiling?: () => ClassificationLevel | null;
  /** Path classifier for filesystem tool security checks. */
  readonly pathClassifier?: PathClassifier;
  /** Returns the workspace root path for shell command classification. */
  readonly getWorkspacePath?: () => string | null;
  /** Domain classifier for URL-based tool security checks. Uses same infrastructure as pathClassifier. */
  readonly domainClassifier?: DomainClassifier;
  /** Tool floor registry for minimum classification enforcement. */
  readonly toolFloorRegistry?: ToolFloorRegistry;
  /**
   * Secret store for resolving `{{secret:name}}` references in tool arguments.
   * When provided, all tool input arguments are scanned and references substituted
   * before dispatch. The resolved values are never logged or returned to the LLM.
   */
  readonly secretStore?: SecretStore;
  /**
   * Returns the currently active skill context, or null if none.
   * When non-null and requiresTools is non-null, the tool list shown to
   * the LLM is filtered to the declared set (always preserving read_skill).
   */
  readonly getActiveSkillContext?: () => ActiveSkillContext | null;
  /**
   * Optional per-call tool list filter.
   *
   * Called once per LLM iteration after merging base tools with extra tools.
   * Use to restrict non-owner sessions to a safe tool subset.
   * The isOwner argument reflects the current session's owner status.
   */
  readonly filterTools?: (
    tools: readonly ToolDefinition[],
    isOwner: boolean,
  ) => readonly ToolDefinition[];
}

/** Config shape for building integration/plugin/channel classification map. */
export interface ClassificationMapConfig {
  /** Google Workspace classification. */
  readonly google?: { readonly classification?: string };
  /** GitHub integration classification. */
  readonly github?: { readonly classification?: string };
  /** Plugins keyed by name — each with enabled + classification. */
  readonly plugins?: Readonly<
    Record<
      string,
      | { readonly enabled?: boolean; readonly classification?: string }
      | undefined
    >
  >;
}

/**
 * Hardcoded classification levels for built-in tools.
 *
 * Entries are ordered from most-specific to least-specific so that
 * the prefix-matching loop in enforceNonOwnerToolCeiling hits the
 * right entry first. More-specific names (e.g. "memory_save") must
 * appear before group prefixes (e.g. "memory_").
 *
 * PUBLIC    — safe for any non-owner with a PUBLIC ceiling
 * INTERNAL  — read-only local operations, trusted non-owners
 * RESTRICTED — owner-only operations, never reachable by non-owners
 */
const BUILTIN_TOOL_CLASSIFICATIONS: ReadonlyArray<
  readonly [string, ClassificationLevel]
> = [
  // Memory — read tools are PUBLIC; save/delete are intentionally absent.
  // memory_save and memory_delete operate at the current session taint level
  // (the memory executor forces classification to sessionTaint). They must
  // not appear here because: (1) prefix-based taint escalation would
  // incorrectly escalate the session, and (2) the write-down check would
  // block higher-tainted sessions from saving. Non-owner blocking is
  // handled by enforceNonOwnerToolCeiling (unmatched tools → denied).
  ["memory_search", "PUBLIC"],
  ["memory_get", "PUBLIC"],
  ["memory_list", "PUBLIC"],
  // Filesystem — writes/exec owner-only, reads INTERNAL
  ["write_file", "PUBLIC"],
  ["edit_file", "PUBLIC"],
  ["run_command", "PUBLIC"],
  ["read_file", "PUBLIC"],
  ["list_directory", "PUBLIC"],
  ["search_files", "PUBLIC"],
  ["browser_", "PUBLIC"],
  // secret_list is the only secret tool classified here (read-only listing).
  // secret_save, secret_delete, and secret_save_credential are intentionally
  // absent — they operate on the OS keychain which has no classification level.
  // Prefix-based taint escalation and write-down checks must not apply to them;
  // non-owner blocking is handled by enforceNonOwnerToolCeiling.
  ["secret_list", "PUBLIC"],
  ["cron", "PUBLIC"],
  ["trigger_", "PUBLIC"],
  // Skills — read_skill is read-only, works at all classification levels
  ["read_skill", "PUBLIC"],
  // Subagent / agents — owner-only
  ["subagent", "PUBLIC"],
  ["agents_", "PUBLIC"],
  ["claude_", "PUBLIC"],
  ["sessions_", "PUBLIC"],
  ["signal_", "PUBLIC"],
  ["channels_", "PUBLIC"],
  // Plan mode — owner-only
  ["plan_", "PUBLIC"],
  ["tidepool_", "PUBLIC"],
  // Obsidian — reads PUBLIC, writes RESTRICTED
  ["obsidian_write", "RESTRICTED"],
  ["obsidian_daily", "RESTRICTED"],
  ["obsidian_read", "INTERNAL"],
  ["obsidian_search", "INTERNAL"],
  ["obsidian_list", "INTERNAL"],
  ["obsidian_links", "INTERNAL"],
  // Safe for non-owners
  ["web_", "PUBLIC"],
  ["todo_", "PUBLIC"],
  ["healthcheck", "PUBLIC"],
  ["summarize", "PUBLIC"],
  ["image_", "PUBLIC"],
  ["explore", "PUBLIC"],
  ["llm_task", "PUBLIC"],
  ["log_read", "PUBLIC"],
  ["simulate_tool_call", "PUBLIC"],
];

/** Return type of mapToolPrefixClassifications. */
export interface ToolClassificationMaps {
  /** All prefixes: integrations + built-in tools. Used for taint escalation and non-owner ceiling. */
  readonly all: Map<string, ClassificationLevel>;
  /** Integration prefixes only (Google, GitHub, plugins). Used for write-down checks. */
  readonly integrations: Map<string, ClassificationLevel>;
}

/**
 * Build tool prefix → classification map for integrations, plugins, channels,
 * and built-in tools.
 *
 * Integration-specific overrides (Google, GitHub, plugins) are inserted first.
 * Built-in tool classifications are appended afterward so that explicit
 * integration config always takes precedence.
 *
 * Returns two maps:
 * - `all`: every prefix (integrations + built-ins). Used for taint escalation
 *   and non-owner ceiling enforcement.
 * - `integrations`: only integration prefixes (Google, GitHub, plugins, MCP).
 *   Used for write-down checks — data flowing through an integration classified
 *   PUBLIC must not carry CONFIDENTIAL session taint.
 */
export function mapToolPrefixClassifications(
  config: ClassificationMapConfig,
): ToolClassificationMaps {
  const all = new Map<string, ClassificationLevel>();
  const integrations = new Map<string, ClassificationLevel>();

  // Google Workspace — gmail_, calendar_, drive_, sheets_, tasks_
  const googleClassification =
    (config.google?.classification ?? "PUBLIC") as ClassificationLevel;
  for (const prefix of ["gmail_", "calendar_", "drive_", "sheets_", "tasks_"]) {
    all.set(prefix, googleClassification);
    integrations.set(prefix, googleClassification);
  }

  // GitHub — all tools start with github_
  const githubClassification =
    (config.github?.classification ?? "PUBLIC") as ClassificationLevel;
  all.set("github_", githubClassification);
  integrations.set("github_", githubClassification);

  // Plugins — each plugin's tools use {pluginName}_ prefix convention
  if (config.plugins) {
    for (const [name, pluginConfig] of Object.entries(config.plugins)) {
      const cfg = pluginConfig as
        | { enabled?: boolean; classification?: string }
        | undefined;
      if (cfg?.enabled) {
        const level = (cfg.classification ?? "INTERNAL") as ClassificationLevel;
        all.set(`${name}_`, level);
        integrations.set(`${name}_`, level);
      }
    }
  }

  // Built-in tool classifications (not user-configurable) — only in `all`
  for (const [prefix, level] of BUILTIN_TOOL_CLASSIFICATIONS) {
    if (!all.has(prefix)) all.set(prefix, level);
  }

  return { all, integrations };
}

export type {
  CompactResult,
  HistoryEntry,
  Orchestrator,
  ProcessMessageOptions,
  ProcessMessageResult,
} from "../../core/types/orchestrator.ts";

/** Events emitted by the orchestrator during message processing. */
export type OrchestratorEvent =
  | {
    readonly type: "llm_start";
    readonly iteration: number;
    readonly maxIterations: number;
  }
  | {
    readonly type: "llm_complete";
    readonly iteration: number;
    readonly hasToolCalls: boolean;
  }
  | {
    readonly type: "tool_call";
    readonly name: string;
    readonly args: Record<string, unknown>;
  }
  | {
    readonly type: "tool_result";
    readonly name: string;
    readonly result: string;
    readonly blocked: boolean;
  }
  | { readonly type: "response"; readonly text: string }
  | {
    readonly type: "response_chunk";
    readonly text: string;
    readonly done: boolean;
  }
  | { readonly type: "vision_start"; readonly imageCount: number }
  | { readonly type: "vision_complete"; readonly imageCount: number };

/** Callback for real-time orchestrator event reporting. */
export type OrchestratorEventCallback = (event: OrchestratorEvent) => void;

/** A parsed tool call from LLM text output. */
export interface ParsedToolCall {
  readonly name: string;
  readonly args: Record<string, unknown>;
}
