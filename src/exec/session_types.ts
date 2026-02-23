/**
 * Types and interfaces for headless Claude Code CLI sessions.
 *
 * Defines the configuration, session state, manager interface,
 * and internal session entry tracking used by the session manager.
 *
 * @module
 */

import type { Result } from "../core/types/classification.ts";

/** Configuration for a headless Claude CLI session. */
export interface ClaudeSessionConfig {
  /** Model to use (e.g. "sonnet", "opus"). */
  readonly model?: string;
  /** Maximum agent iteration turns (--max-turns). */
  readonly maxTurns?: number;
  /** Custom system prompt for the child session. */
  readonly systemPrompt?: string;
  /** CWD for the Claude process (must be in workspace). */
  readonly workingDir?: string;
  /** Max runtime in ms before SIGTERM (default: 300_000 = 5min). */
  readonly timeoutMs?: number;
  /** Tool allowlist for the child session (--allowedTools). */
  readonly allowedTools?: readonly string[];
  /** Spending cap in USD (--max-budget-usd). */
  readonly maxBudgetUsd?: number;
  /** Permission mode (default: "bypassPermissions"). */
  readonly permissionMode?: string;
}

/** A running or completed Claude CLI session. */
export interface ClaudeSession {
  /** Unique session identifier. */
  readonly id: string;
  /** OS process ID of the child process. */
  readonly pid: number;
  /** Current session status. */
  readonly status: "running" | "completed" | "failed" | "terminated";
  /** When the session was started. */
  readonly startedAt: Date;
  /** When the session ended (null if still running). */
  readonly endedAt: Date | null;
  /** Configuration used to start this session. */
  readonly config: ClaudeSessionConfig;
  /** Exit code of the child process (null if still running). */
  readonly exitCode: number | null;
}

/** Manages headless Claude CLI sessions. */
export interface ClaudeSessionManager {
  /** Start a new Claude session with an initial prompt. */
  start(
    prompt: string,
    config?: Partial<ClaudeSessionConfig>,
  ): Promise<Result<ClaudeSession, string>>;
  /** Send a follow-up message to a running session. */
  send(
    sessionId: string,
    input: string,
  ): Promise<Result<string, string>>;
  /** Get accumulated output from a session (non-blocking). */
  getOutput(sessionId: string): Result<string, string>;
  /** Get the current status of a session. */
  status(sessionId: string): Result<ClaudeSession, string>;
  /** Terminate a running session. */
  stop(sessionId: string): Promise<Result<void, string>>;
  /** List all tracked sessions. */
  list(): readonly ClaudeSession[];
}

/** Options for creating a ClaudeSessionManager. */
export interface ClaudeSessionManagerOptions {
  /** Workspace root path — used to sandbox --add-dir. */
  readonly workspacePath: string;
  /** Override for the `claude` binary path (for testing). */
  readonly claudeBinary?: string;
}

/** Internal session state tracking process handles. */
export interface SessionEntry {
  session: ClaudeSession;
  readonly process: Deno.ChildProcess;
  readonly stdinWriter: WritableStreamDefaultWriter<Uint8Array>;
  output: string;
  stderr: string;
  readonly timeoutId: number | null;
}
