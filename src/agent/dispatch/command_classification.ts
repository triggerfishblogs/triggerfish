/**
 * Shell command classification for run_command security context.
 *
 * Classifies shell commands by recognizing integration CLIs (gh → GitHub),
 * GitHub domain patterns (api.github.com, github.com), and filesystem paths.
 * Used by the security context assembly to determine resource classification
 * for run_command tool calls.
 *
 * @module
 */

import type { ClassificationLevel } from "../../core/types/classification.ts";
import { maxClassification } from "../../core/types/classification.ts";
import {
  classifyCommandPaths,
  extractCommandPaths,
  splitOnShellOperators,
} from "../../core/security/command_path_extraction.ts";
import type { ParsedToolCall } from "../orchestrator/orchestrator_types.ts";
import { createLogger } from "../../core/logger/mod.ts";
import type { SecurityContextConfig } from "./security_context.ts";

const log = createLogger("command-classification");

/** No-classification sentinel result. */
const NO_RESOURCE_CLASSIFICATION = {
  classification: null as ClassificationLevel | null,
  operation: null as "read" | "write" | null,
  param: null as string | null,
};

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
  log.debug("classifyCommandSegment filesystem path classification", {
    operation: "classifyCommandSegment",
    segment: segment.slice(0, 120),
    pathCount: paths.length,
    classification: result.classification,
  });
  return result.classification;
}

/** Resource classification result shape. */
type ResourceClassResult = {
  classification: ClassificationLevel | null;
  operation: "read" | "write" | null;
  param: string | null;
};

/**
 * Classify a `run_command` tool call by splitting on shell operators
 * and classifying each segment independently.
 *
 * Integration CLI segments (e.g. `gh api repos/owner/name`) use the
 * integration's configured classification. GitHub domain URLs (e.g.
 * `curl api.github.com/repos/...`) are recognized regardless of executable.
 * Other segments extract filesystem paths and classify against the path
 * classifier. `maxClassification` across all segments ensures dangerous
 * paths in ANY segment still escalate.
 */
export function classifyShellCommandResource(
  call: ParsedToolCall,
  config: SecurityContextConfig,
): ResourceClassResult {
  if (call.name !== "run_command") return NO_RESOURCE_CLASSIFICATION;
  const command = call.args.command as string | undefined;
  if (!command || !config.pathClassifier) return NO_RESOURCE_CLASSIFICATION;
  const workspacePath = config.getWorkspacePath?.() ?? null;
  if (!workspacePath) return NO_RESOURCE_CLASSIFICATION;

  const segments = splitOnShellOperators(command);
  let highest: ClassificationLevel = "PUBLIC";
  for (const segment of segments) {
    const level = classifyCommandSegment(segment, config, workspacePath);
    const escalated = maxClassification(highest, level);
    if (escalated !== highest) {
      log.debug("classifyShellCommandResource segment escalated classification", {
        operation: "classifyShellCommandResource",
        segment: segment.slice(0, 80),
        from: highest,
        to: escalated,
      });
    }
    highest = escalated;
  }

  // If no segments produced any paths and no integration was recognized,
  // fall back to classifying the workspace path itself.
  if (segments.length === 0) {
    const result = classifyCommandPaths({
      paths: [workspacePath],
      classifier: config.pathClassifier,
      workspaceCwd: workspacePath,
    });
    log.debug("classifyShellCommandResource fallback workspace classification", {
      operation: "classifyShellCommandResource",
      classification: result.classification,
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
