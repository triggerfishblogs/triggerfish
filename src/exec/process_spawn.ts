/**
 * Claude CLI process spawning and argument construction.
 *
 * Handles building CLI arguments from session config,
 * filtering environment variables, and spawning the
 * Claude child process.
 *
 * @module
 */

import type { Result } from "../core/types/classification.ts";
import type { ClaudeSessionConfig } from "./session_types.ts";

/** Filter CLAUDECODE from environment to avoid nesting guard. */
export function buildClaudeEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(Deno.env.toObject())) {
    if (k !== "CLAUDECODE") env[k] = v;
  }
  return env;
}

/** Build CLI args from session config and workspace path. */
export function buildClaudeArgs(
  prompt: string,
  config: ClaudeSessionConfig,
  workspacePath: string,
): string[] {
  const args: string[] = [
    "--input-format",
    "stream-json",
    "--output-format",
    "stream-json",
    "--verbose",
  ];

  if (config.model) {
    args.push("--model", config.model);
  }
  if (config.maxTurns !== undefined) {
    args.push("--max-turns", String(config.maxTurns));
  }
  if (config.systemPrompt) {
    args.push("--system-prompt", config.systemPrompt);
  }
  if (config.allowedTools && config.allowedTools.length > 0) {
    args.push("--allowedTools", config.allowedTools.join(","));
  }
  if (config.maxBudgetUsd !== undefined) {
    args.push("--max-budget-usd", String(config.maxBudgetUsd));
  }
  if (config.permissionMode) {
    args.push("--permission-mode", config.permissionMode);
  }

  // Sandbox to workspace directory
  const addDir = config.workingDir ?? workspacePath;
  args.push("--add-dir", addDir);

  // Initial prompt
  args.push("--print", prompt);

  return args;
}

/** Spawn a Claude CLI child process with piped I/O. */
export function spawnClaudeProcess(
  binary: string,
  args: string[],
  cwd: string,
  env: Record<string, string>,
): Result<Deno.ChildProcess, string> {
  try {
    const command = new Deno.Command(binary, {
      args,
      cwd,
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
      env,
    });
    return { ok: true, value: command.spawn() };
  } catch (err) {
    return {
      ok: false,
      error: `Failed to spawn claude: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}
