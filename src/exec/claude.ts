/**
 * Headless Claude Code CLI session management.
 *
 * Spawns `claude` as a child process using stream-json I/O format
 * for interactive sessions. Supports multiple concurrent sessions,
 * follow-up prompts, timeout enforcement, and workspace isolation.
 *
 * Sub-modules:
 * - claude_tools.ts: Tool definitions, system prompt, and tool executor
 *
 * @module
 */

import type { Result } from "../core/types/classification.ts";
import { createLogger } from "../core/logger/logger.ts";

const log = createLogger("exec");

// ─── Re-exports from claude_tools.ts ─────────────────────────────
export {
  CLAUDE_SESSION_SYSTEM_PROMPT,
  createClaudeToolExecutor,
  getClaudeToolDefinitions,
} from "./claude_tools.ts";

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
  send(sessionId: string, input: string): Promise<Result<string, string>>;
  /** Get accumulated output from a session (non-blocking). */
  getOutput(sessionId: string): Result<string, string>;
  /** Get the current status of a session. */
  status(sessionId: string): Result<ClaudeSession, string>;
  /** Terminate a running session. */
  stop(sessionId: string): Promise<Result<void, string>>;
  /** List all tracked sessions. */
  list(): readonly ClaudeSession[];
}

/**
 * Stream-JSON message types for Claude CLI I/O.
 * See: https://docs.anthropic.com/en/docs/claude-code/sdk
 */
interface StreamJsonUserMessage {
  readonly type: "user_input";
  readonly content: string;
}

/** A single result message from Claude's stream-json output. */
interface StreamJsonResultMessage {
  readonly type: "result";
  readonly result?: string;
  readonly subtype?: string;
  readonly cost_usd?: number;
  readonly duration_ms?: number;
  readonly duration_api_ms?: number;
  readonly is_error?: boolean;
  readonly num_turns?: number;
  readonly session_id?: string;
}

/** An assistant message from Claude's stream-json output. */
interface StreamJsonAssistantMessage {
  readonly type: "assistant";
  readonly message?: {
    readonly content?: ReadonlyArray<{
      readonly type: string;
      readonly text?: string;
    }>;
  };
}

/** Internal session state tracking process handles. */
interface SessionEntry {
  session: ClaudeSession;
  readonly process: Deno.ChildProcess;
  readonly stdinWriter: WritableStreamDefaultWriter<Uint8Array>;
  output: string;
  stderr: string;
  readonly timeoutId: number | null;
}

/** Options for creating a ClaudeSessionManager. */
export interface ClaudeSessionManagerOptions {
  /** Workspace root path — used to sandbox --add-dir. */
  readonly workspacePath: string;
  /** Override for the `claude` binary path (for testing). */
  readonly claudeBinary?: string;
}

let sessionCounter = 0;

/** Generate a unique session ID. */
function generateSessionId(): string {
  sessionCounter++;
  return `claude-${Date.now()}-${sessionCounter}`;
}

/** Build CLI args from config. */
function buildArgs(
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

/** Encode a stream-json user message. */
function encodeUserMessage(content: string): Uint8Array {
  const msg: StreamJsonUserMessage = { type: "user_input", content };
  const json = JSON.stringify(msg) + "\n";
  return new TextEncoder().encode(json);
}

/**
 * Parse accumulated output, extracting text from assistant messages
 * and result messages.
 */
function parseStreamOutput(raw: string): string {
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);
  const parts: string[] = [];

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as Record<string, unknown>;
      if (parsed.type === "assistant") {
        const msg = parsed as unknown as StreamJsonAssistantMessage;
        if (msg.message?.content) {
          for (const block of msg.message.content) {
            if (block.type === "text" && block.text) {
              parts.push(block.text);
            }
          }
        }
      } else if (parsed.type === "result") {
        const msg = parsed as unknown as StreamJsonResultMessage;
        if (msg.result) {
          parts.push(msg.result);
        }
      }
    } catch {
      // Non-JSON line — skip
    }
  }

  return parts.join("\n");
}

/**
 * Create a Claude session manager.
 *
 * @param options - Manager configuration
 */
export function createClaudeSessionManager(
  options: ClaudeSessionManagerOptions,
): ClaudeSessionManager {
  const sessions = new Map<string, SessionEntry>();
  const binary = options.claudeBinary ?? "claude";

  /** Start reading stdout in the background. */
  function startOutputReader(
    entry: SessionEntry,
    reader: ReadableStreamDefaultReader<Uint8Array>,
  ): void {
    const decoder = new TextDecoder();
    const read = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          entry.output += decoder.decode(value, { stream: true });
        }
      } catch {
        // Stream closed — expected on process exit
      }
    };
    read();
  }

  /** Drain stderr in background to prevent resource leaks. */
  function drainStderr(
    entry: SessionEntry,
    reader: ReadableStreamDefaultReader<Uint8Array>,
  ): void {
    const decoder = new TextDecoder();
    const read = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          entry.stderr += decoder.decode(value, { stream: true });
        }
      } catch {
        // Stream closed — expected on process exit
      }
    };
    read();
  }

  /** Handle process completion. */
  function watchProcess(entry: SessionEntry): void {
    entry.process.status.then((status) => {
      const exitCode = status.code ?? -1;
      const finalStatus = exitCode === 0 ? "completed" : "failed";
      entry.session = {
        ...entry.session,
        status: entry.session.status === "terminated"
          ? "terminated"
          : finalStatus,
        endedAt: new Date(),
        exitCode,
      };
      if (entry.timeoutId !== null) {
        clearTimeout(entry.timeoutId);
      }
      // Close stdin writer to prevent resource leaks
      entry.stdinWriter.close().catch((err: unknown) => {
        log.debug("Stdin writer close failed on session exit", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
    });
  }

  /** Set up timeout enforcement. */
  function setupTimeout(entry: SessionEntry, timeoutMs: number): number {
    return setTimeout(async () => {
      if (entry.session.status === "running") {
        try {
          entry.process.kill("SIGTERM");
        } catch {
          // Already dead
        }
        // Wait 5s then SIGKILL
        await new Promise((r) => setTimeout(r, 5000));
        if (entry.session.status === "running") {
          try {
            entry.process.kill("SIGKILL");
          } catch {
            // Already dead
          }
        }
        entry.session = {
          ...entry.session,
          status: "terminated",
          endedAt: new Date(),
        };
      }
    }, timeoutMs) as unknown as number;
  }

  return {
    start(
      prompt: string,
      config?: Partial<ClaudeSessionConfig>,
    ): Promise<Result<ClaudeSession, string>> {
      const fullConfig: ClaudeSessionConfig = {
        timeoutMs: 300_000,
        permissionMode: "bypassPermissions",
        ...config,
      };

      // Validate working directory if specified
      if (fullConfig.workingDir) {
        const resolved = fullConfig.workingDir;
        if (!resolved.startsWith(options.workspacePath)) {
          return Promise.resolve({
            ok: false as const,
            error:
              `Working directory "${resolved}" is outside the workspace "${options.workspacePath}"`,
          });
        }
      }

      const args = buildArgs(prompt, fullConfig, options.workspacePath);

      // Build env — unset CLAUDECODE to bypass nesting guard
      const env: Record<string, string> = {};
      for (const [k, v] of Object.entries(Deno.env.toObject())) {
        if (k !== "CLAUDECODE") {
          env[k] = v;
        }
      }

      let process: Deno.ChildProcess;
      try {
        const command = new Deno.Command(binary, {
          args,
          cwd: fullConfig.workingDir ?? options.workspacePath,
          stdin: "piped",
          stdout: "piped",
          stderr: "piped",
          env,
        });
        process = command.spawn();
      } catch (err) {
        return Promise.resolve({
          ok: false as const,
          error: `Failed to spawn claude: ${
            err instanceof Error ? err.message : String(err)
          }`,
        });
      }

      const id = generateSessionId();
      const session: ClaudeSession = {
        id,
        pid: process.pid,
        status: "running",
        startedAt: new Date(),
        endedAt: null,
        config: fullConfig,
        exitCode: null,
      };

      const stdinWriter = process.stdin.getWriter();
      const timeoutMs = fullConfig.timeoutMs ?? 300_000;

      const entry: SessionEntry = {
        session,
        process,
        stdinWriter,
        output: "",
        stderr: "",
        timeoutId: null,
      };

      // Set up timeout (cast to satisfy readonly — the entry is mutable internally)
      (entry as { timeoutId: number | null }).timeoutId = setupTimeout(
        entry,
        timeoutMs,
      );

      // Start reading stdout
      const reader = process.stdout.getReader();
      startOutputReader(entry, reader);

      // Drain stderr in background to prevent resource leaks
      const stderrReader = process.stderr.getReader();
      drainStderr(entry, stderrReader);

      // Watch for process exit
      watchProcess(entry);

      sessions.set(id, entry);

      return Promise.resolve({ ok: true as const, value: session });
    },

    async send(
      sessionId: string,
      input: string,
    ): Promise<Result<string, string>> {
      const entry = sessions.get(sessionId);
      if (!entry) {
        return { ok: false, error: `Session not found: ${sessionId}` };
      }
      if (entry.session.status !== "running") {
        return {
          ok: false,
          error: `Session ${sessionId} is not running (status: ${entry.session.status})`,
        };
      }

      const outputBefore = entry.output.length;

      try {
        await entry.stdinWriter.write(encodeUserMessage(input));
      } catch (err) {
        return {
          ok: false,
          error: `Failed to write to session stdin: ${
            err instanceof Error ? err.message : String(err)
          }`,
        };
      }

      // Wait for new output (poll with timeout)
      const deadline = Date.now() + 60_000; // 60s wait for response
      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 200));
        if (entry.output.length > outputBefore) {
          // Check if we got a complete response (result message)
          const newOutput = entry.output.slice(outputBefore);
          if (
            newOutput.includes('"type":"result"') ||
            newOutput.includes('"type": "result"')
          ) {
            break;
          }
        }
        if (entry.session.status !== "running") break;
      }

      const newOutput = entry.output.slice(outputBefore);
      const parsed = parseStreamOutput(newOutput);
      return { ok: true, value: parsed || newOutput };
    },

    getOutput(sessionId: string): Result<string, string> {
      const entry = sessions.get(sessionId);
      if (!entry) {
        return { ok: false, error: `Session not found: ${sessionId}` };
      }
      const parsed = parseStreamOutput(entry.output);
      return { ok: true, value: parsed || entry.output };
    },

    status(sessionId: string): Result<ClaudeSession, string> {
      const entry = sessions.get(sessionId);
      if (!entry) {
        return { ok: false, error: `Session not found: ${sessionId}` };
      }
      return { ok: true, value: entry.session };
    },

    async stop(sessionId: string): Promise<Result<void, string>> {
      const entry = sessions.get(sessionId);
      if (!entry) {
        return { ok: false, error: `Session not found: ${sessionId}` };
      }
      if (entry.session.status !== "running") {
        return { ok: true, value: undefined };
      }

      try {
        entry.stdinWriter.close().catch((err: unknown) => {
          log.debug("Stdin writer close failed during termination", {
            error: err instanceof Error ? err.message : String(err),
          });
        });
      } catch {
        // Already closed
      }

      try {
        entry.process.kill("SIGTERM");
      } catch {
        // Already dead
      }

      // Wait up to 5s for graceful shutdown
      const deadline = Date.now() + 5000;
      while (entry.session.status === "running" && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 100));
      }

      // Force kill if still running
      if (entry.session.status === "running") {
        try {
          entry.process.kill("SIGKILL");
        } catch {
          // Already dead
        }
        entry.session = {
          ...entry.session,
          status: "terminated",
          endedAt: new Date(),
        };
      }

      if (entry.timeoutId !== null) {
        clearTimeout(entry.timeoutId);
      }

      return { ok: true, value: undefined };
    },

    list(): readonly ClaudeSession[] {
      return Array.from(sessions.values()).map((e) => e.session);
    },
  };
}

