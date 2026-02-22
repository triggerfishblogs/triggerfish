/**
 * Agent workspace management for the execution environment.
 *
 * Each agent gets an isolated workspace directory with subdirectories
 * for scratch work, integrations, and skills. The workspace persists
 * across sessions (unlike the plugin sandbox which is ephemeral).
 *
 * Classification-partitioned directories (internal/, confidential/,
 * restricted/) enforce data isolation between sessions at different
 * taint levels.
 *
 * @module
 */

import { join, resolve } from "@std/path";
import type {
  ClassificationLevel,
  Result,
} from "../core/types/classification.ts";
import { canFlowTo } from "../core/types/classification.ts";
import {
  CLASSIFICATION_DIRS,
  WORKSPACE_SUBDIRS,
} from "../core/security/constants.ts";
import { createLogger } from "../core/logger/logger.ts";

const log = createLogger("security");

/** Options for creating a new workspace. */
export interface WorkspaceOptions {
  /** Unique agent identifier. */
  readonly agentId: string;
  /** Base directory under which the workspace is created. */
  readonly basePath: string;
}

/** Result of resolving a classification-aware workspace path. */
export interface ClassifiedPathResult {
  readonly absolutePath: string;
  readonly classification: ClassificationLevel;
}

/** An isolated agent workspace. */
export interface Workspace {
  /** Absolute path to the workspace root directory. */
  readonly path: string;
  /** Absolute path to the scratch subdirectory. */
  readonly scratchPath: string;
  /** Absolute path to the integrations subdirectory. */
  readonly integrationsPath: string;
  /** Absolute path to the skills subdirectory. */
  readonly skillsPath: string;
  /** Absolute path to the internal classification directory. */
  readonly internalPath: string;
  /** Absolute path to the confidential classification directory. */
  readonly confidentialPath: string;
  /** Absolute path to the restricted classification directory. */
  readonly restrictedPath: string;
  /** Agent ID that owns this workspace. */
  readonly agentId: string;
  /** Remove the workspace directory and all contents. */
  destroy(): Promise<void>;
  /** Check whether a resolved path is inside the workspace. */
  containsPath(targetPath: string): boolean;
  /**
   * Resolve a relative path to its classification-partitioned absolute path.
   *
   * For writes: bare paths resolve to the session taint directory.
   * For reads: bare paths search all readable levels (highest first).
   * Paths with explicit classification prefix are validated against session permissions.
   */
  resolveClassifiedPath(
    relativePath: string,
    sessionTaint: ClassificationLevel,
    operation: "read" | "write",
  ): Result<ClassifiedPathResult, string>;
}

/** Reverse lookup: directory name → classification level */
const DIR_TO_LEVEL: ReadonlyMap<string, ClassificationLevel> = new Map(
  Object.entries(CLASSIFICATION_DIRS).map(([level, dir]) => [
    dir,
    level as ClassificationLevel,
  ]),
);

/**
 * Extract the first path segment and check if it's a classification directory.
 * Returns the classification level and remaining path if matched.
 */
function extractClassificationPrefix(
  relativePath: string,
): { level: ClassificationLevel; rest: string } | null {
  // Normalize to forward slashes for splitting, then check first segment
  const normalized = relativePath.replace(/\\/g, "/");
  const firstSlash = normalized.indexOf("/");
  const firstSegment = firstSlash === -1
    ? normalized
    : normalized.slice(0, firstSlash);
  const rest = firstSlash === -1 ? "" : normalized.slice(firstSlash + 1);

  const level = DIR_TO_LEVEL.get(firstSegment);
  if (level) {
    return { level, rest };
  }
  return null;
}

/**
 * Get readable classification levels for a given session taint, ordered highest first.
 * A session can read at its own level and all levels below.
 */
function getReadableLevels(
  sessionTaint: ClassificationLevel,
): readonly (Exclude<ClassificationLevel, "PUBLIC">)[] {
  const allLevels: readonly (Exclude<ClassificationLevel, "PUBLIC">)[] = [
    "RESTRICTED",
    "CONFIDENTIAL",
    "INTERNAL",
  ];
  return allLevels.filter((level) => canFlowTo(level, sessionTaint));
}

/** Create workspace root, legacy subdirectories, and classification-partitioned dirs. */
async function createWorkspaceDirectories(
  workspacePath: string,
  scratchPath: string,
  integrationsPath: string,
  skillsPath: string,
): Promise<void> {
  await Deno.mkdir(workspacePath, { recursive: true });
  await Deno.mkdir(scratchPath, { recursive: true });
  await Deno.mkdir(integrationsPath, { recursive: true });
  await Deno.mkdir(skillsPath, { recursive: true });
  for (const classDir of Object.values(CLASSIFICATION_DIRS)) {
    for (const subDir of WORKSPACE_SUBDIRS) {
      await Deno.mkdir(join(workspacePath, classDir, subDir), {
        recursive: true,
      });
    }
  }
}

/** Validate that a resolved absolute path stays within the workspace. */
function validatePathInWorkspace(
  absPath: string,
  workspacePath: string,
  relativePath: string,
): Result<true, string> {
  if (!absPath.startsWith(workspacePath)) {
    return {
      ok: false,
      error: `Path "${relativePath}" escapes the workspace directory`,
    };
  }
  return { ok: true, value: true };
}

/** Resolve a path with an explicit classification prefix (e.g., "internal/foo.txt"). */
function resolveExplicitClassifiedPath(
  prefix: { level: ClassificationLevel; rest: string },
  relativePath: string,
  sessionTaint: ClassificationLevel,
  operation: "read" | "write",
  levelToDirPath: Record<string, string>,
  workspacePath: string,
): Result<ClassifiedPathResult, string> {
  const { level, rest } = prefix;
  const absPath = resolve(join(levelToDirPath[level], rest));
  const traversalCheck = validatePathInWorkspace(
    absPath,
    workspacePath,
    relativePath,
  );
  if (!traversalCheck.ok) return traversalCheck;

  if (operation === "read" && !canFlowTo(level, sessionTaint)) {
    log.warn("Workspace read blocked: insufficient taint level", {
      path: relativePath,
      pathClassification: level,
      sessionTaint,
    });
    return {
      ok: false,
      error:
        `Cannot read ${level} path from ${sessionTaint} session (insufficient taint level)`,
    };
  }
  if (operation === "write" && !canFlowTo(sessionTaint, level)) {
    log.warn("Workspace write-down blocked", {
      path: relativePath,
      sessionTaint,
      targetClassification: level,
    });
    return {
      ok: false,
      error:
        `Write-down: ${sessionTaint} session cannot write to ${level} directory`,
    };
  }
  return { ok: true, value: { absolutePath: absPath, classification: level } };
}

/** Search readable classification levels (highest first) for an existing file. */
function searchReadableLevelsForFile(
  relativePath: string,
  sessionTaint: Exclude<ClassificationLevel, "PUBLIC">,
  levelToDirPath: Record<string, string>,
  workspacePath: string,
): Result<ClassifiedPathResult, string> {
  const readableLevels = getReadableLevels(sessionTaint);
  for (const level of readableLevels) {
    const absPath = resolve(join(levelToDirPath[level], relativePath));
    if (!absPath.startsWith(workspacePath)) continue;
    try {
      Deno.statSync(absPath);
      return {
        ok: true,
        value: { absolutePath: absPath, classification: level },
      };
    } catch { /* File not found at this level, try next */ }
  }
  const fallbackPath = resolve(
    join(levelToDirPath[sessionTaint], relativePath),
  );
  const check = validatePathInWorkspace(
    fallbackPath,
    workspacePath,
    relativePath,
  );
  if (!check.ok) return check;
  return {
    ok: true,
    value: { absolutePath: fallbackPath, classification: sessionTaint },
  };
}

/**
 * Create an isolated workspace directory for an agent.
 *
 * Creates the workspace root, standard subdirectories, and
 * classification-partitioned directories.
 */
export async function createWorkspace(
  options: WorkspaceOptions,
): Promise<Workspace> {
  const workspacePath = resolve(join(options.basePath, options.agentId));
  const scratchPath = join(workspacePath, "scratch");
  const integrationsPath = join(workspacePath, "integrations");
  const skillsPath = join(workspacePath, "skills");
  const internalPath = join(workspacePath, CLASSIFICATION_DIRS.INTERNAL);
  const confidentialPath = join(
    workspacePath,
    CLASSIFICATION_DIRS.CONFIDENTIAL,
  );
  const restrictedPath = join(workspacePath, CLASSIFICATION_DIRS.RESTRICTED);

  await createWorkspaceDirectories(
    workspacePath,
    scratchPath,
    integrationsPath,
    skillsPath,
  );

  const levelToDirPath: Record<string, string> = {
    INTERNAL: internalPath,
    CONFIDENTIAL: confidentialPath,
    RESTRICTED: restrictedPath,
  };

  return {
    path: workspacePath,
    scratchPath,
    integrationsPath,
    skillsPath,
    internalPath,
    confidentialPath,
    restrictedPath,
    agentId: options.agentId,
    async destroy(): Promise<void> {
      await Deno.remove(workspacePath, { recursive: true });
    },
    containsPath(targetPath: string): boolean {
      return resolve(workspacePath, targetPath).startsWith(workspacePath);
    },
    resolveClassifiedPath(
      relativePath: string,
      sessionTaint: ClassificationLevel,
      operation: "read" | "write",
    ): Result<ClassifiedPathResult, string> {
      if (sessionTaint === "PUBLIC") {
        return {
          ok: false,
          error: "PUBLIC sessions cannot access workspace files",
        };
      }
      const prefix = extractClassificationPrefix(relativePath);
      if (prefix) {
        return resolveExplicitClassifiedPath(
          prefix,
          relativePath,
          sessionTaint,
          operation,
          levelToDirPath,
          workspacePath,
        );
      }
      if (operation === "write") {
        const absPath = resolve(
          join(levelToDirPath[sessionTaint], relativePath),
        );
        const check = validatePathInWorkspace(
          absPath,
          workspacePath,
          relativePath,
        );
        if (!check.ok) return check;
        return {
          ok: true,
          value: { absolutePath: absPath, classification: sessionTaint },
        };
      }
      return searchReadableLevelsForFile(
        relativePath,
        sessionTaint,
        levelToDirPath,
        workspacePath,
      );
    },
  };
}
