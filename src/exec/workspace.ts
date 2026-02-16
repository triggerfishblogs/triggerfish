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
import type { ClassificationLevel, Result } from "../core/types/classification.ts";
import { canFlowTo } from "../core/types/classification.ts";
import {
  CLASSIFICATION_DIRS,
  WORKSPACE_SUBDIRS,
} from "../core/security/constants.ts";

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
  const firstSegment = firstSlash === -1 ? normalized : normalized.slice(0, firstSlash);
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
  return allLevels.filter((level) =>
    canFlowTo(level, sessionTaint)
  );
}

/**
 * Create an isolated workspace directory for an agent.
 *
 * Creates the workspace root, standard subdirectories, and
 * classification-partitioned directories:
 * - `scratch/`, `integrations/`, `skills/` (legacy, backward-compatible)
 * - `internal/{scratch,integrations,skills}/`
 * - `confidential/{scratch,integrations,skills}/`
 * - `restricted/{scratch,integrations,skills}/`
 */
export async function createWorkspace(
  options: WorkspaceOptions,
): Promise<Workspace> {
  const workspacePath = resolve(join(options.basePath, options.agentId));
  const scratchPath = join(workspacePath, "scratch");
  const integrationsPath = join(workspacePath, "integrations");
  const skillsPath = join(workspacePath, "skills");

  // Classification-partitioned directories
  const internalPath = join(workspacePath, CLASSIFICATION_DIRS.INTERNAL);
  const confidentialPath = join(workspacePath, CLASSIFICATION_DIRS.CONFIDENTIAL);
  const restrictedPath = join(workspacePath, CLASSIFICATION_DIRS.RESTRICTED);

  // Create workspace root and legacy subdirectories
  await Deno.mkdir(workspacePath, { recursive: true });
  await Deno.mkdir(scratchPath, { recursive: true });
  await Deno.mkdir(integrationsPath, { recursive: true });
  await Deno.mkdir(skillsPath, { recursive: true });

  // Create classification-partitioned directories with subdirectories
  for (const classDir of Object.values(CLASSIFICATION_DIRS)) {
    for (const subDir of WORKSPACE_SUBDIRS) {
      await Deno.mkdir(join(workspacePath, classDir, subDir), {
        recursive: true,
      });
    }
  }

  /** Map classification level to its directory path. */
  const levelToDirPath: Record<string, string> = {
    INTERNAL: internalPath,
    CONFIDENTIAL: confidentialPath,
    RESTRICTED: restrictedPath,
  };

  function resolveClassifiedPath(
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
      // Path has an explicit classification prefix (e.g., "internal/foo.txt")
      const { level, rest } = prefix;
      const targetDir = levelToDirPath[level];
      const absPath = resolve(join(targetDir, rest));

      // Path traversal check
      if (!absPath.startsWith(workspacePath)) {
        return {
          ok: false,
          error: `Path "${relativePath}" escapes the workspace directory`,
        };
      }

      if (operation === "read") {
        // Read: session taint must be >= path classification
        if (!canFlowTo(level, sessionTaint)) {
          return {
            ok: false,
            error:
              `Cannot read ${level} path from ${sessionTaint} session (insufficient taint level)`,
          };
        }
      } else {
        // Write: session taint must be able to flow to target (no write-down)
        if (!canFlowTo(sessionTaint, level)) {
          return {
            ok: false,
            error:
              `Write-down: ${sessionTaint} session cannot write to ${level} directory`,
          };
        }
      }

      return {
        ok: true,
        value: { absolutePath: absPath, classification: level },
      };
    }

    // Bare path (no classification prefix)
    if (operation === "write") {
      // Writes go to the session taint directory
      const targetDir = levelToDirPath[sessionTaint];
      const absPath = resolve(join(targetDir, relativePath));

      // Path traversal check
      if (!absPath.startsWith(workspacePath)) {
        return {
          ok: false,
          error: `Path "${relativePath}" escapes the workspace directory`,
        };
      }

      return {
        ok: true,
        value: {
          absolutePath: absPath,
          classification: sessionTaint,
        },
      };
    }

    // Read: search all readable levels, highest first
    const readableLevels = getReadableLevels(sessionTaint);
    for (const level of readableLevels) {
      const targetDir = levelToDirPath[level];
      const absPath = resolve(join(targetDir, relativePath));

      // Path traversal check
      if (!absPath.startsWith(workspacePath)) {
        continue;
      }

      // Check if file exists at this level
      try {
        Deno.statSync(absPath);
        return {
          ok: true,
          value: { absolutePath: absPath, classification: level },
        };
      } catch {
        // File not found at this level, try next
      }
    }

    // File not found at any readable level — return path at session taint level
    const fallbackDir = levelToDirPath[sessionTaint];
    const fallbackPath = resolve(join(fallbackDir, relativePath));

    if (!fallbackPath.startsWith(workspacePath)) {
      return {
        ok: false,
        error: `Path "${relativePath}" escapes the workspace directory`,
      };
    }

    return {
      ok: true,
      value: {
        absolutePath: fallbackPath,
        classification: sessionTaint,
      },
    };
  }

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
      const resolved = resolve(workspacePath, targetPath);
      return resolved.startsWith(workspacePath);
    },

    resolveClassifiedPath,
  };
}
