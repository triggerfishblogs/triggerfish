/**
 * Shell command execution within the agent workspace.
 *
 * Resolves the effective working directory (per-call cwd, options override,
 * or workspace root), validates it against the path jail and verifies it
 * exists on disk, then spawns `/bin/sh` in a sanitized environment.
 *
 * @module
 */

import type { Result } from "../core/types/classification.ts";
import type { Workspace } from "./workspace.ts";
import { join, resolve } from "@std/path";
import { isWithinJail } from "../core/security/path_jail.ts";
import { buildSafeEnv } from "./sanitize.ts";
import { createLogger } from "../core/logger/logger.ts";
import type { ExecToolsOptions, RunResult } from "./tools.ts";

const log = createLogger("exec");

/** Resolve the effective cwd from options, supporting both static and dynamic overrides. */
function resolveCwd(workspace: Workspace, options?: ExecToolsOptions): string {
  const override = options?.cwdOverride;
  if (typeof override === "function") return override();
  return override ?? workspace.path;
}

/** Check if a directory exists on disk. */
async function verifyDirectoryExists(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path);
    return stat.isDirectory;
  } catch (err) {
    log.debug("Working directory stat check failed", { path, err });
    return false;
  }
}

/** Resolve a per-call cwd within the workspace, returning null if it escapes. */
function resolvePerCallCwd(
  workspace: Workspace,
  cwd: string,
): string | null {
  const resolved = cwd.startsWith("/")
    ? resolve(cwd)
    : resolve(join(workspace.path, cwd));
  if (!isWithinJail(resolved, workspace.path)) return null;
  return resolved;
}

/** Resolve and validate the effective cwd, returning an error Result if invalid. */
function resolveEffectiveCwd(
  workspace: Workspace,
  options: ExecToolsOptions | undefined,
  perCallCwd: string | undefined,
): Result<string, string> {
  if (perCallCwd !== undefined) {
    const resolved = resolvePerCallCwd(workspace, perCallCwd);
    if (resolved === null) {
      log.warn("Working directory path escapes workspace jail", {
        operation: "runShellCommand",
        cwd: perCallCwd,
        workspace: workspace.path,
      });
      return {
        ok: false,
        error: `Working directory "${perCallCwd}" escapes the workspace`,
      };
    }
    return { ok: true, value: resolved };
  }
  return { ok: true, value: resolveCwd(workspace, options) };
}

/**
 * Run a shell command in the workspace with optional per-call cwd.
 *
 * The cwd is validated against the workspace path jail and checked
 * for existence before spawning the shell.
 */
export async function runShellCommand(
  workspace: Workspace,
  command: string,
  options?: ExecToolsOptions,
  perCallCwd?: string,
): Promise<Result<RunResult, string>> {
  const cwdResult = resolveEffectiveCwd(workspace, options, perCallCwd);
  if (!cwdResult.ok) return cwdResult;
  const effectiveCwd = cwdResult.value;

  const cwdExists = await verifyDirectoryExists(effectiveCwd);
  if (!cwdExists) {
    log.warn("Working directory does not exist", {
      operation: "runShellCommand",
      cwd: effectiveCwd,
    });
    return {
      ok: false,
      error: `Working directory does not exist: ${
        perCallCwd ?? "."
      }`,
    };
  }

  try {
    const start = performance.now();
    const proc = new Deno.Command("/bin/sh", {
      args: ["-c", command],
      cwd: effectiveCwd,
      stdout: "piped",
      stderr: "piped",
      env: buildSafeEnv({ workspaceHome: workspace.path }),
      clearEnv: true,
    });
    const output = await proc.output();
    const duration = performance.now() - start;

    const decoder = new TextDecoder();
    return {
      ok: true,
      value: {
        stdout: decoder.decode(output.stdout),
        stderr: decoder.decode(output.stderr),
        exitCode: output.code,
        duration,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: `Failed to run command: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}
