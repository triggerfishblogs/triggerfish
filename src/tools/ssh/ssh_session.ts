/**
 * SSH session manager — spawns and tracks persistent SSH connections.
 *
 * Each session wraps a Deno.ChildProcess with stdin/stdout/stderr pipes,
 * buffering output for on-demand reads. Sessions are identified by opaque
 * string IDs and tracked in an in-memory map.
 *
 * All credentials (keys, passwords, passphrases) arrive as resolved secret
 * values from the dispatch pipeline. The LLM never sees them — they come
 * through {{secret:name}} references resolved before the executor runs.
 *
 * @module
 */

import { createLogger } from "../../core/logger/logger.ts";

const log = createLogger("ssh-session");

/** Unique identifier for an SSH session. */
export type SshSessionId = string & { readonly __brand: "SshSessionId" };

/** SSH credential options — all sourced from the secret store. */
export interface SshCredentials {
  /** SSH private key content (resolved from {{secret:name}}). */
  readonly key?: string;
  /** SSH password for password-based auth (resolved from {{secret:name}}). */
  readonly password?: string;
  /** Passphrase for an encrypted private key (resolved from {{secret:name}}). */
  readonly passphrase?: string;
}

/** Options for opening a new SSH session. */
export interface SshSessionOpenOptions extends SshCredentials {
  readonly host: string;
  readonly port?: number;
}

/** A live interactive SSH session. */
export interface SshSession {
  readonly id: SshSessionId;
  readonly host: string;
  readonly openedAt: number;
  readonly process: Deno.ChildProcess;
  readonly writer: WritableStreamDefaultWriter<Uint8Array>;
  /** Accumulated stdout since last drain. */
  stdoutBuffer: string;
  /** Accumulated stderr since last drain. */
  stderrBuffer: string;
  /** Whether the remote process has exited. */
  closed: boolean;
  /** Temp key file path to clean up on close (if key was materialized). */
  readonly tempKeyPath?: string;
  /** Temp askpass script to clean up on close (if passphrase was used). */
  readonly tempAskpassPath?: string;
}

// ─── Temp file helpers ───────────────────────────────────────────────────────

/**
 * Write a private key to a secure temp file (mode 0600).
 * Returns the file path. Caller is responsible for cleanup.
 */
export async function materializeKeyToTempFile(
  keyContent: string,
): Promise<string> {
  const tmpDir = Deno.env.get("TMPDIR") || "/tmp";
  const filename = `triggerfish-ssh-key-${crypto.randomUUID().slice(0, 12)}`;
  const keyPath = `${tmpDir}/${filename}`;

  // Ensure key content ends with a newline (SSH requires it).
  const normalized = keyContent.endsWith("\n") ? keyContent : keyContent + "\n";

  await Deno.writeTextFile(keyPath, normalized, { mode: 0o600 });

  log.info("Materialized SSH key to temp file", {
    operation: "materializeKeyToTempFile",
    keyPath,
  });

  return keyPath;
}

/**
 * Write an SSH_ASKPASS helper script that echoes a secret value.
 * Used for password auth and key passphrase input.
 * Returns the script path. Caller is responsible for cleanup.
 */
export async function materializeAskpassScript(
  secret: string,
): Promise<string> {
  const tmpDir = Deno.env.get("TMPDIR") || "/tmp";
  const filename = `triggerfish-ssh-askpass-${crypto.randomUUID().slice(0, 12)}`;
  const scriptPath = `${tmpDir}/${filename}`;

  // Shell script that echoes the secret. Single quotes inside the heredoc
  // prevent expansion — the secret value is embedded literally.
  const escaped = secret.replaceAll("'", "'\\''");
  const script = `#!/bin/sh\necho '${escaped}'\n`;

  await Deno.writeTextFile(scriptPath, script, { mode: 0o700 });

  log.info("Materialized SSH askpass script", {
    operation: "materializeAskpassScript",
    scriptPath,
  });

  return scriptPath;
}

/** Remove a materialized temp file (key or askpass script). */
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await Deno.remove(filePath);
    log.info("Removed temp SSH file", {
      operation: "cleanupTempFile",
      filePath,
    });
  } catch (err) {
    log.warn("Failed to remove temp SSH file", {
      operation: "cleanupTempFile",
      filePath,
      err,
    });
  }
}

// ─── SSH argument builders ───────────────────────────────────────────────────

/** Resolved credential paths for SSH invocation. */
export interface ResolvedSshCredentials {
  readonly tempKeyPath?: string;
  readonly tempAskpassPath?: string;
}

/**
 * Materialize credentials to temp files.
 * Returns paths that must be cleaned up by the caller.
 */
export async function resolveCredentials(
  creds: SshCredentials,
): Promise<ResolvedSshCredentials> {
  let tempKeyPath: string | undefined;
  let tempAskpassPath: string | undefined;

  if (creds.key) {
    tempKeyPath = await materializeKeyToTempFile(creds.key);
  }

  // Password (no key) → askpass for password auth.
  // Passphrase (with key) → askpass for key passphrase.
  // Password + key (no passphrase) → askpass for password (key used via -i).
  const askpassSecret = creds.passphrase ?? creds.password;
  if (askpassSecret) {
    tempAskpassPath = await materializeAskpassScript(askpassSecret);
  }

  return { tempKeyPath, tempAskpassPath };
}

/** Clean up all temp credential files. */
export async function cleanupCredentials(
  resolved: ResolvedSshCredentials,
): Promise<void> {
  if (resolved.tempKeyPath) await cleanupTempFile(resolved.tempKeyPath);
  if (resolved.tempAskpassPath) await cleanupTempFile(resolved.tempAskpassPath);
}

/** Build base SSH args shared by session and one-shot modes. */
function buildBaseArgs(
  opts: { readonly port?: number },
  resolved: ResolvedSshCredentials,
): string[] {
  const args: string[] = [];

  // When using askpass for password/passphrase, disable BatchMode.
  // Otherwise enable it to prevent hanging on unexpected prompts.
  if (resolved.tempAskpassPath) {
    args.push("-o", "BatchMode=no");
  } else {
    args.push("-o", "BatchMode=yes");
  }

  args.push("-o", "StrictHostKeyChecking=accept-new");

  if (opts.port !== undefined) {
    args.push("-p", String(opts.port));
  }
  if (resolved.tempKeyPath) {
    args.push("-i", resolved.tempKeyPath);
  }

  return args;
}

/** Build env vars for SSH_ASKPASS-based credential passing. */
export function buildAskpassEnv(
  resolved: ResolvedSshCredentials,
): Record<string, string> {
  if (!resolved.tempAskpassPath) return {};
  return {
    SSH_ASKPASS: resolved.tempAskpassPath,
    SSH_ASKPASS_REQUIRE: "force",
    DISPLAY: ":0",
  };
}

/** Build the ssh command arguments for an interactive session. */
function buildSessionArgs(
  opts: SshSessionOpenOptions,
  resolved: ResolvedSshCredentials,
): string[] {
  const args = buildBaseArgs(opts, resolved);
  args.push(
    "-o", "ServerAliveInterval=15",
    "-o", "ServerAliveCountMax=3",
    "-tt",
  );
  args.push(opts.host);
  return args;
}

/** Build the ssh command arguments for a one-shot command. */
export function buildExecuteArgs(
  host: string,
  command: string,
  opts: { readonly port?: number },
  resolved: ResolvedSshCredentials,
): string[] {
  const args = buildBaseArgs(opts, resolved);
  args.push(host, "--", command);
  return args;
}

// ─── Session ID ──────────────────────────────────────────────────────────────

/** Generate a unique session ID. */
function generateSessionId(): SshSessionId {
  return crypto.randomUUID().slice(0, 8) as SshSessionId;
}

// ─── Stream pump ─────────────────────────────────────────────────────────────

/** Pump a ReadableStream into a mutable buffer string on a session. */
function pumpStream(
  stream: ReadableStream<Uint8Array>,
  session: SshSession,
  target: "stdoutBuffer" | "stderrBuffer",
): void {
  const decoder = new TextDecoder();
  const reader = stream.getReader();

  function read(): void {
    reader.read().then(({ done, value }) => {
      if (done) return;
      session[target] += decoder.decode(value);
      read();
    }).catch((err) => {
      if (!session.closed) {
        log.warn("SSH stream read failed", {
          operation: "pumpStream",
          sessionId: session.id,
          target,
          err,
        });
      }
    });
  }

  read();
}

// ─── Session manager ─────────────────────────────────────────────────────────

/** Manages the lifecycle of interactive SSH sessions. */
export class SshSessionManager {
  private readonly sessions = new Map<SshSessionId, SshSession>();

  /** Open a new interactive SSH session. */
  async openSession(opts: SshSessionOpenOptions): Promise<SshSession> {
    const id = generateSessionId();
    const resolved = await resolveCredentials(opts);
    const args = buildSessionArgs(opts, resolved);
    const env = buildAskpassEnv(resolved);

    log.info("Opening SSH session", {
      operation: "openSession",
      sessionId: id,
      host: opts.host,
      hasKey: !!opts.key,
      hasPassword: !!opts.password,
      hasPassphrase: !!opts.passphrase,
    });

    const command = new Deno.Command("ssh", {
      args,
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
      env: Object.keys(env).length > 0 ? env : undefined,
    });

    const process = command.spawn();
    const writer = process.stdin.getWriter();

    const session: SshSession = {
      id,
      host: opts.host,
      openedAt: Date.now(),
      process,
      writer,
      stdoutBuffer: "",
      stderrBuffer: "",
      closed: false,
      tempKeyPath: resolved.tempKeyPath,
      tempAskpassPath: resolved.tempAskpassPath,
    };

    pumpStream(process.stdout, session, "stdoutBuffer");
    pumpStream(process.stderr, session, "stderrBuffer");

    process.status.then((status) => {
      session.closed = true;
      log.info("SSH session process exited", {
        operation: "openSession.onExit",
        sessionId: id,
        exitCode: status.code,
      });
    }).catch((err) => {
      session.closed = true;
      log.error("SSH session process failed", {
        operation: "openSession.onExit",
        sessionId: id,
        err,
      });
    });

    this.sessions.set(id, session);

    // Brief wait to collect initial connection output or errors.
    await new Promise((r) => setTimeout(r, 1500));

    if (session.closed) {
      const errOutput = session.stderrBuffer || session.stdoutBuffer;
      this.sessions.delete(id);
      await cleanupCredentials(resolved);
      throw new Error(
        `SSH connection to ${opts.host} failed: ${errOutput || "process exited immediately"}`,
      );
    }

    return session;
  }

  /** Get a session by ID. */
  getSession(id: SshSessionId): SshSession | undefined {
    return this.sessions.get(id);
  }

  /** Write input to a session's stdin. */
  async writeToSession(id: SshSessionId, input: string): Promise<void> {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`SSH session not found: ${id}`);
    }
    if (session.closed) {
      throw new Error(`SSH session ${id} is closed`);
    }

    const text = input.endsWith("\n") ? input : input + "\n";
    const encoded = new TextEncoder().encode(text);
    await session.writer.write(encoded);

    log.info("Wrote to SSH session", {
      operation: "writeToSession",
      sessionId: id,
      inputLength: text.length,
    });
  }

  /** Drain buffered output from a session. */
  async readFromSession(
    id: SshSessionId,
    timeoutMs = 5000,
  ): Promise<{ readonly stdout: string; readonly stderr: string }> {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`SSH session not found: ${id}`);
    }

    // Wait for output to accumulate, checking periodically.
    const deadline = Date.now() + timeoutMs;
    const pollInterval = 200;

    while (
      Date.now() < deadline &&
      session.stdoutBuffer.length === 0 &&
      session.stderrBuffer.length === 0 &&
      !session.closed
    ) {
      await new Promise((r) => setTimeout(r, pollInterval));
    }

    const stdout = session.stdoutBuffer;
    const stderr = session.stderrBuffer;
    session.stdoutBuffer = "";
    session.stderrBuffer = "";
    return { stdout, stderr };
  }

  /** Close a session and return remaining output. */
  async closeSession(
    id: SshSessionId,
  ): Promise<{ readonly stdout: string; readonly stderr: string }> {
    const session = this.sessions.get(id);
    if (!session) {
      throw new Error(`SSH session not found: ${id}`);
    }

    log.info("Closing SSH session", {
      operation: "closeSession",
      sessionId: id,
      host: session.host,
    });

    if (!session.closed) {
      try {
        await session.writer.write(new TextEncoder().encode("exit\n"));
        await session.writer.close();
      } catch {
        // Writer may already be closed if the process exited.
      }

      // Give the process a moment to exit gracefully.
      const raceResult = await Promise.race([
        session.process.status,
        new Promise<null>((r) => setTimeout(() => r(null), 3000)),
      ]);

      if (raceResult === null && !session.closed) {
        try {
          session.process.kill("SIGTERM");
        } catch {
          // Process may have already exited.
        }
      }
    }

    session.closed = true;
    const stdout = session.stdoutBuffer;
    const stderr = session.stderrBuffer;
    session.stdoutBuffer = "";
    session.stderrBuffer = "";
    this.sessions.delete(id);

    // Clean up credential temp files.
    if (session.tempKeyPath) await cleanupTempFile(session.tempKeyPath);
    if (session.tempAskpassPath) await cleanupTempFile(session.tempAskpassPath);

    return { stdout, stderr };
  }

  /** Close all open sessions. */
  async closeAll(): Promise<void> {
    const ids = [...this.sessions.keys()];
    for (const id of ids) {
      try {
        await this.closeSession(id);
      } catch (err) {
        log.error("Failed to close SSH session during cleanup", {
          operation: "closeAll",
          sessionId: id,
          err,
        });
      }
    }
  }

  /** List all active session IDs and hosts. */
  listSessions(): readonly {
    readonly id: SshSessionId;
    readonly host: string;
    readonly openedAt: number;
  }[] {
    return [...this.sessions.values()].map((s) => ({
      id: s.id,
      host: s.host,
      openedAt: s.openedAt,
    }));
  }
}
