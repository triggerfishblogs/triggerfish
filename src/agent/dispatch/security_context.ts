/**
 * Security context assembly and policy error rendering.
 *
 * Builds enriched hook input for PRE_TOOL_CALL with resource classification,
 * identity context, and tool floor data. Renders user-facing error messages
 * for policy violations.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import { maxClassification } from "../../core/types/classification.ts";
import {
  FILESYSTEM_READ_TOOLS,
  FILESYSTEM_WRITE_TOOLS,
  URL_READ_TOOLS,
  URL_WRITE_TOOLS,
} from "../../core/security/constants.ts";
import {
  classifyCommandPaths,
  extractCommandPaths,
  splitOnShellOperators,
} from "../../core/security/command_path_extraction.ts";
import type { PathClassifier } from "../../core/security/path_classification.ts";
import type { ToolFloorRegistry } from "../../core/security/tool_floors.ts";
import type { DomainClassifier } from "../../core/types/domain.ts";
import type { ParsedToolCall } from "../orchestrator/orchestrator_types.ts";
import { createLogger } from "../../core/logger/mod.ts";

const log = createLogger("security-context");

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Subset of OrchestratorConfig consumed by assembleSecurityContext.
 *
 * Every field is optional — callers provide only the classifiers and
 * identity getters relevant to their context. Full OrchestratorConfig
 * satisfies this structurally, so existing call sites are unaffected.
 */
export interface SecurityContextConfig {
  readonly pathClassifier?: PathClassifier;
  readonly domainClassifier?: DomainClassifier;
  readonly toolFloorRegistry?: ToolFloorRegistry;
  readonly isOwnerSession?: () => boolean;
  readonly isTriggerSession?: () => boolean;
  readonly getNonOwnerCeiling?: () => ClassificationLevel | null;
  readonly getWorkspacePath?: () => string | null;
  /** Integration prefix → classification map for CLI tool recognition. */
  readonly integrationClassifications?: ReadonlyMap<string, ClassificationLevel>;
}

/** Computed security context returned alongside the hook input. */
export interface SecurityContext {
  readonly toolName: string;
  readonly toolFloor: ClassificationLevel | null;
  readonly resourceClassification: ClassificationLevel | null;
  readonly operationType: "read" | "write" | null;
  readonly isOwner: boolean;
  /** True when the active session is a trigger session. */
  readonly isTrigger: boolean;
  readonly nonOwnerCeiling: ClassificationLevel | null;
  readonly resourceParam: string | null;
  /** True for URL-based tools that make outbound network requests. */
  readonly isOutboundRequest: boolean;
}

/** Resource classification result shape. */
type ResourceClassResult = {
  classification: ClassificationLevel | null;
  operation: "read" | "write" | null;
  param: string | null;
};

/** No-classification sentinel result. */
const NO_RESOURCE_CLASSIFICATION: ResourceClassResult = {
  classification: null,
  operation: null,
  param: null,
};

// ─── Resource classification ─────────────────────────────────────────────────

/** Extract the path parameter from tool call arguments. */
function extractPathParam(call: ParsedToolCall): string | null {
  return (call.args.path ?? call.args.directory ?? call.args.search_path) as
    | string
    | null ?? null;
}

/** Classify a resource using a classifier and known tool sets. */
function classifyResourceByToolSets(
  toolName: string,
  param: string,
  classifier: { classify(p: string): { classification: ClassificationLevel } },
  readSet: ReadonlySet<string>,
  writeSet: ReadonlySet<string>,
): ResourceClassResult {
  if (readSet.has(toolName)) {
    return {
      classification: classifier.classify(param).classification,
      operation: "read",
      param,
    };
  }
  if (writeSet.has(toolName)) {
    return {
      classification: classifier.classify(param).classification,
      operation: "write",
      param,
    };
  }
  return NO_RESOURCE_CLASSIFICATION;
}

/** Classify a filesystem path tool call. */
function classifyFilesystemResource(
  call: ParsedToolCall,
  config: SecurityContextConfig,
): ResourceClassResult {
  const pathParam = extractPathParam(call);
  if (!config.pathClassifier || !pathParam) return NO_RESOURCE_CLASSIFICATION;
  return classifyResourceByToolSets(
    call.name,
    pathParam,
    config.pathClassifier,
    FILESYSTEM_READ_TOOLS,
    FILESYSTEM_WRITE_TOOLS,
  );
}

/** Classify a URL-based tool call. */
function classifyUrlResource(
  call: ParsedToolCall,
  config: SecurityContextConfig,
): ResourceClassResult & { isOutbound: boolean } {
  const urlParam = (call.args.url) as string | undefined ?? null;
  if (!config.domainClassifier || !urlParam) {
    return { ...NO_RESOURCE_CLASSIFICATION, isOutbound: false };
  }
  const result = classifyResourceByToolSets(
    call.name,
    urlParam,
    config.domainClassifier,
    URL_READ_TOOLS,
    URL_WRITE_TOOLS,
  );
  return { ...result, isOutbound: result.classification !== null };
}

// ─── Identity context ────────────────────────────────────────────────────────

/** Build identity context fields for the hook input. */
function assembleIdentityContext(config: SecurityContextConfig): {
  isOwner: boolean;
  isTrigger: boolean;
  nonOwnerCeiling: ClassificationLevel | null;
} {
  return {
    isOwner: config.isOwnerSession?.() ?? false,
    isTrigger: config.isTriggerSession?.() ?? false,
    nonOwnerCeiling: config.getNonOwnerCeiling?.() ?? null,
  };
}

/**
 * Map of CLI executable names to integration tool prefixes.
 *
 * When `run_command` invokes a CLI tool that belongs to a configured
 * integration (e.g. `gh` → GitHub), the command should be classified
 * using the integration's classification — not by treating API route
 * segments as filesystem paths. `gh api repos/owner/name/releases`
 * is a GitHub API call, not a filesystem access to `repos/owner/name/`.
 */
const CLI_TO_INTEGRATION_PREFIX: ReadonlyMap<string, string> = new Map([
  ["gh", "github_"],
]);

/** Pattern matching `VAR=value` env variable assignments before executables. */
const ENV_ASSIGNMENT_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*=/;

/**
 * Extract the base executable name from the first token of a command segment.
 *
 * Handles: `gh`, `/usr/bin/gh`, `command gh`, `env gh`,
 * and skips env var assignments: `GH_TOKEN="" gh`, `NO_COLOR=1 gh`.
 */
function extractSegmentExecutable(segment: string): string | null {
  const trimmed = segment.trimStart();
  const tokens = trimmed.split(/\s+/);
  for (const token of tokens) {
    if (token === "command" || token === "env") continue;
    // Skip environment variable assignments: GH_TOKEN="", NO_COLOR=1, etc.
    if (ENV_ASSIGNMENT_PATTERN.test(token)) continue;
    // Strip path prefix: /usr/bin/gh → gh
    const basename = token.includes("/") ? token.split("/").pop()! : token;
    return basename;
  }
  return null;
}

/**
 * GitHub domain patterns recognized in command segments.
 *
 * Any command referencing these domains is classified as a GitHub operation,
 * regardless of which executable invoked it (gh, curl, wget, etc.).
 * Works with or without a configured GitHub integration — defaults to PUBLIC
 * since public GitHub API access is public by nature.
 */
const GITHUB_DOMAIN_PATTERNS = [
  "api.github.com",
  "github.com",
  "raw.githubusercontent.com",
] as const;

/**
 * Detect a GitHub reference in a command segment and return its classification.
 *
 * Checks for GitHub domain patterns (api.github.com, github.com, etc.).
 * Uses the configured `github_` integration classification if available,
 * otherwise defaults to PUBLIC.
 */
function detectGitHubClassification(
  segment: string,
  config: SecurityContextConfig,
): ClassificationLevel | null {
  const hasGitHubDomain = GITHUB_DOMAIN_PATTERNS.some(
    (domain) => segment.includes(domain),
  );
  if (!hasGitHubDomain) return null;
  return config.integrationClassifications?.get("github_") ?? "PUBLIC";
}

/**
 * Resolve the integration classification for a CLI executable.
 *
 * Returns the configured integration level, or defaults to PUBLIC for
 * known integration CLIs (gh) even without explicit configuration.
 */
function resolveExecutableIntegrationLevel(
  executable: string | null,
  config: SecurityContextConfig,
): ClassificationLevel | null {
  if (!executable) return null;
  const prefix = CLI_TO_INTEGRATION_PREFIX.get(executable);
  if (!prefix) return null;
  return config.integrationClassifications?.get(prefix) ?? "PUBLIC";
}

/**
 * Classify a single command segment using integration or filesystem rules.
 *
 * Classification priority:
 * 1. CLI executable maps to a configured integration (gh → github_)
 * 2. Segment contains a GitHub domain (api.github.com, github.com, etc.)
 * 3. Fall through to filesystem path extraction and classification
 */
function classifyCommandSegment(
  segment: string,
  config: SecurityContextConfig,
  workspacePath: string,
): ClassificationLevel {
  const executable = extractSegmentExecutable(segment);

  // 1. Check CLI executable → integration prefix mapping.
  const execLevel = resolveExecutableIntegrationLevel(executable, config);
  if (execLevel !== null) {
    log.debug("classifyCommandSegment matched executable integration", {
      operation: "classifyCommandSegment",
      segment: segment.slice(0, 120),
      executable,
      classification: execLevel,
    });
    return execLevel;
  }

  // 2. Check for GitHub domain patterns in the segment.
  const githubLevel = detectGitHubClassification(segment, config);
  if (githubLevel !== null) {
    log.debug("classifyCommandSegment matched GitHub domain pattern", {
      operation: "classifyCommandSegment",
      segment: segment.slice(0, 120),
      classification: githubLevel,
    });
    return githubLevel;
  }

  // 3. Not an integration CLI — classify extracted paths against filesystem.
  const paths = extractCommandPaths(segment);
  if (paths.length === 0) return "PUBLIC";
  const result = classifyCommandPaths({
    paths,
    classifier: config.pathClassifier!,
    workspaceCwd: workspacePath,
  });
  return result.classification;
}

/** Classify a `run_command` tool call by splitting on shell operators
 *  and classifying each segment independently. */
function classifyShellCommandResource(
  call: ParsedToolCall,
  config: SecurityContextConfig,
): ResourceClassResult {
  if (call.name !== "run_command") return NO_RESOURCE_CLASSIFICATION;
  const command = call.args.command as string | undefined;
  if (!command || !config.pathClassifier) return NO_RESOURCE_CLASSIFICATION;
  const workspacePath = config.getWorkspacePath?.() ?? null;
  if (!workspacePath) return NO_RESOURCE_CLASSIFICATION;

  // Split on all shell operators (|, ;, &&, ||) and classify each segment.
  // Integration CLI segments (e.g. `gh api repos/owner/name`) use the
  // integration's configured classification. Other segments extract
  // filesystem paths and classify against the path classifier.
  // maxClassification across all segments ensures dangerous paths in ANY
  // segment still escalate (e.g. `gh ... && cat /etc/passwd`).
  const segments = splitOnShellOperators(command);
  let highest: ClassificationLevel = "PUBLIC";
  for (const segment of segments) {
    const level = classifyCommandSegment(segment, config, workspacePath);
    highest = maxClassification(highest, level);
  }

  // If no segments produced any paths and no integration was recognized,
  // fall back to classifying the workspace path itself.
  if (segments.length === 0) {
    const result = classifyCommandPaths({
      paths: [workspacePath],
      classifier: config.pathClassifier,
      workspaceCwd: workspacePath,
    });
    highest = result.classification;
  }

  log.debug("classifyShellCommandResource result", {
    operation: "classifyShellCommandResource",
    command: command.slice(0, 120),
    classification: highest,
    segmentCount: segments.length,
  });
  return {
    classification: highest,
    operation: "write",
    param: command,
  };
}

/** Extended resource classification result including outbound request flag. */
type ExtendedResourceClassResult = ResourceClassResult & {
  isOutbound: boolean;
};

/** Resolve resource classification from filesystem, shell command, or URL tools. */
function resolveResourceClassification(
  call: ParsedToolCall,
  config: SecurityContextConfig,
): ExtendedResourceClassResult {
  const fsResult = classifyFilesystemResource(call, config);
  if (fsResult.classification !== null) {
    return { ...fsResult, isOutbound: false };
  }
  const shellResult = classifyShellCommandResource(call, config);
  if (shellResult.classification !== null) {
    return { ...shellResult, isOutbound: false };
  }
  return classifyUrlResource(call, config);
}

/** Populate hook input with resource and identity fields. */
function populateHookInputFields(
  hookInput: Record<string, unknown>,
  resource: ExtendedResourceClassResult,
  identity: {
    isOwner: boolean;
    isTrigger: boolean;
    nonOwnerCeiling: ClassificationLevel | null;
  },
): void {
  if (resource.classification !== null) {
    hookInput.resource_classification = resource.classification;
    hookInput.operation_type = resource.operation;
  }
  if (resource.isOutbound) {
    hookInput.is_outbound_request = true;
  }
  hookInput.is_owner = identity.isOwner;
  hookInput.is_trigger = identity.isTrigger;
  if (identity.nonOwnerCeiling !== null) {
    hookInput.non_owner_ceiling = identity.nonOwnerCeiling;
  }
}

/** Build enriched hook input for PRE_TOOL_CALL with security context. */
export function assembleSecurityContext(
  call: ParsedToolCall,
  config: SecurityContextConfig,
): { input: Record<string, unknown>; ctx: SecurityContext } {
  const hookInput: Record<string, unknown> = { tool_call: call };
  const toolName = call.name;
  const toolFloor = config.toolFloorRegistry?.getFloor(toolName) ?? null;
  if (toolFloor !== null) hookInput.tool_floor = toolFloor;

  const resource = resolveResourceClassification(call, config);
  const identity = assembleIdentityContext(config);
  populateHookInputFields(hookInput, resource, identity);

  return {
    input: hookInput,
    ctx: {
      toolName,
      toolFloor,
      resourceClassification: resource.classification,
      operationType: resource.operation,
      resourceParam: resource.param,
      isOutboundRequest: resource.isOutbound,
      ...identity,
    },
  };
}

