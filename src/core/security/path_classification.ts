/**
 * Filesystem path classification resolver.
 *
 * Determines the classification level of a filesystem path using a fixed
 * resolution order (spec §3.4):
 *   1. Resolve to absolute path
 *   2. Check hardcoded protected paths → RESTRICTED
 *   3. Check workspace classification directories
 *   4. Check configured path mappings (first match wins)
 *   5. Apply default classification
 *
 * @module
 */

import { basename, join, resolve } from "@std/path";
import type { ClassificationLevel } from "../types/classification.ts";
import { PROTECTED_BASENAMES, PROTECTED_DIR_PATTERNS } from "./constants.ts";
import { createLogger } from "../logger/mod.ts";

const log = createLogger("path-classification");

/** Result of classifying a filesystem path. */
export interface PathClassificationResult {
  readonly classification: ClassificationLevel;
  readonly source: "hardcoded" | "workspace" | "configured" | "default";
  readonly matchedPattern?: string;
}

/** Classifier that resolves a filesystem path to a classification level. */
export interface PathClassifier {
  /** Classify an absolute or relative path. */
  classify(absolutePath: string): PathClassificationResult;
}

/** Configuration for filesystem security. */
export interface FilesystemSecurityConfig {
  readonly paths: ReadonlyMap<string, ClassificationLevel>;
  readonly defaultClassification: ClassificationLevel;
}

/** Workspace paths for classification directory detection. */
export interface WorkspacePaths {
  readonly basePath: string;
  readonly publicPath: string;
  readonly internalPath: string;
  readonly confidentialPath: string;
  readonly restrictedPath: string;
}

/**
 * Resolve the user's home directory.
 * Prefers HOME (Linux/macOS), falls back to USERPROFILE (Windows).
 */
export function resolveHome(): string {
  const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE") ?? "";
  if (!home) return home;
  try {
    return Deno.realPathSync(home);
  } catch (err: unknown) {
    log.debug("Home directory symlink resolution failed, using raw path", {
      operation: "resolveHome",
      home,
      err,
    });
    return home;
  }
}

/**
 * Expand a leading `~` in a path to the resolved home directory.
 */
export function expandTilde(path: string): string {
  if (path === "~" || path.startsWith("~/") || path.startsWith("~\\")) {
    const home = resolveHome();
    return join(home, path.slice(2));
  }
  return path;
}

/**
 * Check if a path matches a configured pattern.
 *
 * Patterns ending with `/*` or `/**` are treated as directory prefixes.
 * Other patterns are matched exactly after tilde expansion and resolution.
 */
function pathPatternMatches(pattern: string, absolutePath: string): boolean {
  const expanded = resolve(expandTilde(pattern));

  // Directory prefix pattern: ~/Documents/finance/* matches anything under that dir
  if (pattern.endsWith("/*") || pattern.endsWith("/**")) {
    // Strip the trailing /* or /** to get the directory prefix
    const dirPrefix = expanded.replace(/\/\*{1,2}$/, "");
    return absolutePath.startsWith(dirPrefix + "/") ||
      absolutePath === dirPrefix;
  }

  // Exact match
  return absolutePath === expanded;
}

/**
 * Check if a path is a hardcoded protected path (always RESTRICTED).
 */
function isHardcodedProtectedPath(
  absolutePath: string,
  homeDir: string,
): boolean {
  // Check basename matches (triggerfish.yaml, SPINE.md, TRIGGER.md)
  const name = basename(absolutePath);
  if (PROTECTED_BASENAMES.includes(name)) {
    return true;
  }

  // Check directory prefix matches (.triggerfish/config, .triggerfish/data, .triggerfish/logs)
  for (const pattern of PROTECTED_DIR_PATTERNS) {
    const protectedDir = resolve(join(homeDir, pattern));
    if (
      absolutePath.startsWith(protectedDir + "/") ||
      absolutePath === protectedDir
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Check if a path falls within a workspace classification directory.
 */
function classifyWorkspacePath(
  absolutePath: string,
  workspacePaths?: WorkspacePaths,
): PathClassificationResult | null {
  if (!workspacePaths) return null;

  // Check each classification directory (most restrictive first)
  const checks: readonly {
    readonly path: string;
    readonly level: ClassificationLevel;
  }[] = [
    { path: workspacePaths.restrictedPath, level: "RESTRICTED" },
    { path: workspacePaths.confidentialPath, level: "CONFIDENTIAL" },
    { path: workspacePaths.internalPath, level: "INTERNAL" },
    { path: workspacePaths.publicPath, level: "PUBLIC" },
  ];

  for (const check of checks) {
    if (
      absolutePath.startsWith(check.path + "/") ||
      absolutePath === check.path
    ) {
      return {
        classification: check.level,
        source: "workspace",
      };
    }
  }

  // Workspace basePath and ancestors are structural (contain classification
  // dirs but are not classified data themselves). Classify as PUBLIC so
  // paths like ".." from the sandbox root don't falsely escalate taint.
  if (
    absolutePath === workspacePaths.basePath ||
    workspacePaths.basePath.startsWith(absolutePath + "/")
  ) {
    return { classification: "PUBLIC", source: "workspace" };
  }

  return null;
}

/** Match a path against configured path mappings, returning the first match. */
function matchConfiguredPath(
  absolutePath: string,
  paths: ReadonlyMap<string, ClassificationLevel>,
): PathClassificationResult | null {
  for (const [pattern, level] of paths) {
    if (pathPatternMatches(pattern, absolutePath)) {
      return {
        classification: level,
        source: "configured",
        matchedPattern: pattern,
      };
    }
  }
  return null;
}

/** Run the full classification resolution chain for a single absolute path. */
function resolvePathClassification(
  absolutePath: string,
  homeDir: string,
  config: FilesystemSecurityConfig,
  workspacePaths?: WorkspacePaths,
): PathClassificationResult {
  if (isHardcodedProtectedPath(absolutePath, homeDir)) {
    return { classification: "RESTRICTED", source: "hardcoded" };
  }
  const workspaceResult = classifyWorkspacePath(absolutePath, workspacePaths);
  if (workspaceResult) return workspaceResult;
  const configuredResult = matchConfiguredPath(absolutePath, config.paths);
  if (configuredResult) return configuredResult;
  return { classification: config.defaultClassification, source: "default" };
}

/** Options for path classifier creation. */
export interface PathClassifierOptions {
  /**
   * Resolve the current working directory for relative path resolution.
   * When provided, relative paths like "." or "subdir" resolve against
   * this directory instead of the daemon's CWD. Should return the
   * taint-appropriate workspace subdirectory.
   */
  readonly resolveCwd?: () => string;
}

/**
 * Create a path classifier.
 *
 * @param config - Filesystem security configuration (path mappings + default)
 * @param workspacePaths - Optional workspace paths for classification directory detection
 * @param opts - Optional classifier behavior overrides
 * @returns A PathClassifier instance
 */
export function createPathClassifier(
  config: FilesystemSecurityConfig,
  workspacePaths?: WorkspacePaths,
  opts?: PathClassifierOptions,
): PathClassifier {
  const homeDir = resolveHome();

  return {
    classify(inputPath: string): PathClassificationResult {
      const expanded = expandTilde(inputPath);
      const absolutePath = opts?.resolveCwd
        ? resolve(opts.resolveCwd(), expanded)
        : resolve(expanded);
      return resolvePathClassification(
        absolutePath,
        homeDir,
        config,
        workspacePaths,
      );
    },
  };
}
