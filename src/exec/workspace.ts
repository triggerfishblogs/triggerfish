/**
 * Agent workspace management for the execution environment.
 *
 * Each agent gets an isolated workspace directory with subdirectories
 * for scratch work, integrations, and skills. The workspace persists
 * across sessions (unlike the plugin sandbox which is ephemeral).
 *
 * @module
 */

import { join, resolve } from "https://deno.land/std@0.224.0/path/mod.ts";

/** Options for creating a new workspace. */
export interface WorkspaceOptions {
  /** Unique agent identifier. */
  readonly agentId: string;
  /** Base directory under which the workspace is created. */
  readonly basePath: string;
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
  /** Agent ID that owns this workspace. */
  readonly agentId: string;
  /** Remove the workspace directory and all contents. */
  destroy(): Promise<void>;
  /** Check whether a resolved path is inside the workspace. */
  containsPath(targetPath: string): boolean;
}

/**
 * Create an isolated workspace directory for an agent.
 *
 * Creates the workspace root and standard subdirectories:
 * - `scratch/` for temporary files
 * - `integrations/` for integration code being developed
 * - `skills/` for skills being authored
 */
export async function createWorkspace(
  options: WorkspaceOptions,
): Promise<Workspace> {
  const workspacePath = resolve(join(options.basePath, options.agentId));
  const scratchPath = join(workspacePath, "scratch");
  const integrationsPath = join(workspacePath, "integrations");
  const skillsPath = join(workspacePath, "skills");

  await Deno.mkdir(workspacePath, { recursive: true });
  await Deno.mkdir(scratchPath, { recursive: true });
  await Deno.mkdir(integrationsPath, { recursive: true });
  await Deno.mkdir(skillsPath, { recursive: true });

  return {
    path: workspacePath,
    scratchPath,
    integrationsPath,
    skillsPath,
    agentId: options.agentId,

    async destroy(): Promise<void> {
      await Deno.remove(workspacePath, { recursive: true });
    },

    containsPath(targetPath: string): boolean {
      const resolved = resolve(workspacePath, targetPath);
      return resolved.startsWith(workspacePath);
    },
  };
}
