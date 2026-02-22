/**
 * Signal-cli daemon management — TCP and Unix socket lifecycle.
 * @module
 */

import { createLogger } from "../../core/logger/logger.ts";
import type { Result } from "../../core/types/classification.ts";

const log = createLogger("signal");

/** Normalize "localhost" to "127.0.0.1" — signal-cli binds IPv4 only. */
function normalizeHost(host: string): string {
  return host === "localhost" ? "127.0.0.1" : host;
}

/**
 * Check if signal-cli daemon is already running on the given endpoint.
 */
export async function isDaemonRunning(
  host: string,
  port: number,
): Promise<boolean> {
  try {
    const conn = await Deno.connect({ hostname: normalizeHost(host), port });
    conn.close();
    return true;
  } catch (_err: unknown) {
    log.debug("Daemon not reachable", { host, port });
    return false;
  }
}

/** Result of starting the signal-cli daemon. */
export interface DaemonHandle {
  /** The child process. */
  readonly child: Deno.ChildProcess;
  /** Collect any stderr output (for diagnostics on failure). */
  readonly stderrText: () => Promise<string>;
  /** Resolves with the first stderr output received within 5s of start. */
  readonly earlyStderr: Promise<string>;
}

// ─── Shared stderr collector ─────────────────────────────────────────────────

/** Merge Uint8Array chunks into a single trimmed string. */
function mergeStderrChunks(chunks: readonly Uint8Array[]): string {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }
  return new TextDecoder().decode(merged).trim();
}

/** Decode chunks and return the first line. */
function extractFirstStderrLine(chunks: readonly Uint8Array[]): string {
  const decoder = new TextDecoder();
  return chunks.map((c) => decoder.decode(c)).join("").split("\n")[0].trim();
}

/** Read stderr stream, pushing chunks and resolving early promise on first line. */
async function readDaemonStderr(
  child: Deno.ChildProcess,
  chunks: Uint8Array[],
  resolveEarly: (line: string) => void,
  deadline: number,
): Promise<void> {
  const reader = child.stderr.getReader();
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done || !value) {
        resolveEarly(extractFirstStderrLine(chunks));
        break;
      }
      chunks.push(value);
      if (Date.now() < deadline) {
        const soFar = extractFirstStderrLine(chunks);
        if (
          chunks.map((c) => new TextDecoder().decode(c)).join("").includes("\n")
        ) {
          resolveEarly(soFar);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** Stderr collector result for daemon processes. */
interface StderrCollector {
  readonly earlyStderr: Promise<string>;
  readonly stderrText: () => Promise<string>;
}

/** Create a stderr collector that provides early and full stderr access. */
function createDaemonStderrCollector(
  child: Deno.ChildProcess,
): StderrCollector {
  const chunks: Uint8Array[] = [];
  let earlyResolved = false;
  let earlyResolve: (s: string) => void;
  let fullResolve: (s: string) => void;
  const earlyStderr = new Promise<string>((r) => {
    earlyResolve = r;
  });
  const fullPromise = new Promise<string>((r) => {
    fullResolve = r;
  });

  const deadline = Date.now() + 5000;
  const timer = setTimeout(() => {
    if (!earlyResolved) {
      earlyResolved = true;
      earlyResolve!(extractFirstStderrLine(chunks));
    }
  }, 5000);

  (async () => {
    try {
      await readDaemonStderr(child, chunks, (line) => {
        if (!earlyResolved) {
          earlyResolved = true;
          earlyResolve!(line);
        }
      }, deadline);
    } catch (err: unknown) {
      log.debug("Daemon stderr reader terminated", { error: err });
      if (!earlyResolved) {
        earlyResolved = true;
        earlyResolve!("");
      }
    }
    clearTimeout(timer);
    fullResolve!(mergeStderrChunks(chunks));
  })();

  return { earlyStderr, stderrText: () => fullPromise };
}

/** Build env with optional JAVA_HOME. */
function buildDaemonEnv(
  javaHome?: string,
): Record<string, string> | undefined {
  return javaHome ? { ...Deno.env.toObject(), JAVA_HOME: javaHome } : undefined;
}

/** Spawn a signal-cli daemon process and attach stderr collector. */
function spawnDaemonProcess(
  signalCliPath: string,
  args: string[],
  env?: Record<string, string>,
): Result<DaemonHandle, string> {
  try {
    const cmd = new Deno.Command(signalCliPath, {
      args,
      stdout: "null",
      stderr: "piped",
      env,
    });
    const child = cmd.spawn();
    const collector = createDaemonStderrCollector(child);
    return {
      ok: true,
      value: {
        child,
        stderrText: collector.stderrText,
        earlyStderr: collector.earlyStderr,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: `Failed to start signal-cli daemon: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Start signal-cli daemon on a TCP socket.
 *
 * Normalizes "localhost" to "127.0.0.1" so signal-cli binds IPv4.
 */
export function startDaemon(
  account: string,
  host: string = "localhost",
  port: number = 7583,
  signalCliPath: string = "signal-cli",
  javaHome?: string,
): Result<DaemonHandle, string> {
  const normalizedHost = normalizeHost(host);
  return spawnDaemonProcess(
    signalCliPath,
    ["-a", account, "daemon", "--tcp", `${normalizedHost}:${port}`],
    buildDaemonEnv(javaHome),
  );
}

/**
 * Wait for daemon to become reachable on TCP.
 */
export async function waitForDaemon(
  host: string,
  port: number,
  timeoutMs: number = 60000,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isDaemonRunning(host, port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

/**
 * Check if a running TCP daemon responds to JSON-RPC.
 */
export async function isDaemonHealthy(
  host: string,
  port: number,
): Promise<boolean> {
  try {
    const conn = await Deno.connect({ hostname: normalizeHost(host), port });
    const req = JSON.stringify({
      jsonrpc: "2.0",
      method: "version",
      params: {},
      id: "health-1",
    }) + "\n";
    await conn.write(new TextEncoder().encode(req));
    const buf = new Uint8Array(1024);
    const readResult = await Promise.race<number | null>([
      conn.read(buf),
      new Promise<null>((r) => setTimeout(() => r(null), 3000)),
    ]);
    conn.close();
    if (readResult === null || readResult === 0) return false;
    const resp = JSON.parse(
      new TextDecoder().decode(buf.subarray(0, readResult)),
    ) as Record<string, unknown>;
    return resp?.result !== undefined || resp?.error !== undefined;
  } catch (_err: unknown) {
    log.debug("Daemon health check failed", { host, port });
    return false;
  }
}

/**
 * Check if signal-cli daemon is already running on a Unix socket.
 */
export async function isDaemonRunningUnix(
  socketPath: string,
): Promise<boolean> {
  try {
    const conn = await (Deno.connect as (
      opts: { transport: "unix"; path: string },
    ) => Promise<Deno.Conn>)({
      transport: "unix",
      path: socketPath,
    });
    conn.close();
    return true;
  } catch (_err: unknown) {
    log.debug("Daemon not reachable on Unix socket", { socketPath });
    return false;
  }
}

/**
 * Start signal-cli daemon on a Unix socket.
 */
export function startDaemonUnix(
  account: string,
  socketPath: string,
  signalCliPath: string = "signal-cli",
  javaHome?: string,
): Result<DaemonHandle, string> {
  return spawnDaemonProcess(
    signalCliPath,
    ["-a", account, "daemon", "--socket", socketPath],
    buildDaemonEnv(javaHome),
  );
}

/**
 * Wait for daemon to become reachable on a Unix socket.
 */
export async function waitForDaemonUnix(
  socketPath: string,
  timeoutMs: number = 60000,
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isDaemonRunningUnix(socketPath)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
