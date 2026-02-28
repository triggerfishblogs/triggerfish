/**
 * Workspace type definitions.
 *
 * Interfaces for workspace options, classified path results,
 * and the Workspace object used by the exec environment.
 *
 * @module
 */

import type {
  ClassificationLevel,
  Result,
} from "../core/types/classification.ts";

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
  /** Absolute path to the public classification directory. */
  readonly publicPath: string;
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
