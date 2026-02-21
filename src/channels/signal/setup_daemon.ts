/**
 * Signal-cli daemon management — TCP and Unix socket lifecycle.
 * @module
 */

import type { Result } from "../../core/types/classification.ts";

/** Normalize "localhost" to "127.0.0.1" — signal-cli binds IPv4 only. */
function normalizeHost(host: string): string {
  return host === "localhost" ? "127.0.0.1" : host;
}

/**
 * Check if signal-cli daemon is already running on the given endpoint.
 */
export async function isDaemonRunning(host: string, port: number): Promise<boolean> {
  try {
    const conn = await Deno.connect({ hostname: normalizeHost(host), port });
    conn.close();
    return true;
  } catch {
    return false;
  }
}

/** Result of starting the signal-cli daemon. */
export interface DaemonHandle {
  /** The child process. */
  readonly child: Deno.ChildProcess;
  /** Collect any stderr output (for diagnostics on failure). */
  readonly stderrText: () => Promise<string>;
  /** Resolves with the first stderr output received within 5s of start (for fast error surfacing). */
  readonly earlyStderr: Promise<string>;
}

/**
 * Start signal-cli daemon on a TCP socket.
 *
 * Normalizes "localhost" to "127.0.0.1" so signal-cli binds IPv4 — on
 * Windows dual-stack systems Java resolves "localhost" to `::1` (IPv6),
 * causing connection refused when Triggerfish probes `127.0.0.1`.
 *
 * @param account - Phone number (E.164).
 * @param host - TCP hostname. Default: localhost.
 * @param port - TCP port. Default: 7583.
 * @param signalCliPath - Path to signal-cli binary.
 * @param javaHome - Optional JAVA_HOME for managed JRE.
 * @returns A handle with the child process and stderr accessor.
 */
export function startDaemon(
  account: string,
  host: string = "localhost",
  port: number = 7583,
  signalCliPath: string = "signal-cli",
  javaHome?: string,
): Result<DaemonHandle, string> {
  try {
    const env = javaHome
      ? { ...Deno.env.toObject(), JAVA_HOME: javaHome }
      : undefined;
    const normalizedHost = normalizeHost(host);
    const cmd = new Deno.Command(signalCliPath, {
      args: ["-a", account, "daemon", "--tcp", `${normalizedHost}:${port}`],
      stdout: "null",
      stderr: "piped",
      env,
    });
    const child = cmd.spawn();

    // Read all stderr into a shared buffer for diagnostics.
    // earlyStderr resolves with the first line (within 5s); stderrText() resolves when the process ends.
    const stderrChunks: Uint8Array[] = [];
    // deno-lint-ignore no-explicit-any
    let earlyResolve: ((s: string) => void) | null = null as any;
    // deno-lint-ignore no-explicit-any
    let fullResolve: ((s: string) => void) | null = null as any;
    const earlyStderr: Promise<string> = new Promise((r) => { earlyResolve = r; });
    const _fullStderrPromise: Promise<string> = new Promise((r) => { fullResolve = r; });

    // Background reader — collects all stderr, resolves both promises
    (async () => {
      const decoder = new TextDecoder();
      const earlyDeadline = Date.now() + 5000;
      // Auto-resolve earlyStderr after 5s if not already done
      const earlyTimer = setTimeout(() => {
        if (earlyResolve) {
          const soFar = stderrChunks.map((c) => decoder.decode(c)).join("");
          earlyResolve(soFar.split("\n")[0].trim());
          earlyResolve = null;
        }
      }, 5000);
      try {
        const reader = child.stderr.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done || !value) {
              // Process ended — resolve early if not yet done
              if (earlyResolve) {
                const soFar = stderrChunks.map((c) => decoder.decode(c)).join("");
                earlyResolve(soFar.split("\n")[0].trim());
                earlyResolve = null;
              }
              break;
            }
            stderrChunks.push(value);
            // Resolve earlyStderr once we have the first complete line (before 5s deadline)
            if (earlyResolve && Date.now() < earlyDeadline) {
              const soFar = stderrChunks.map((c) => decoder.decode(c)).join("");
              if (soFar.includes("\n")) {
                earlyResolve(soFar.split("\n")[0].trim());
                earlyResolve = null;
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      } catch {
        if (earlyResolve) { earlyResolve(""); earlyResolve = null; }
      }
      clearTimeout(earlyTimer);
      // Resolve the full stderr promise
      const total = stderrChunks.reduce((n, c) => n + c.length, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const c of stderrChunks) {
        merged.set(c, offset);
        offset += c.length;
      }
      if (fullResolve) { fullResolve(new TextDecoder().decode(merged).trim()); fullResolve = null; }
    })();

    const stderrText = (): Promise<string> => _fullStderrPromise;

    return { ok: true, value: { child, stderrText, earlyStderr } };
  } catch (err) {
    return { ok: false, error: `Failed to start signal-cli daemon: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Wait for daemon to become reachable on TCP.
 */
export async function waitForDaemon(host: string, port: number, timeoutMs: number = 60000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isDaemonRunning(host, port)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

/**
 * Check if a running TCP daemon actually responds to JSON-RPC (not just accepts TCP).
 *
 * Returns true if healthy (JSON-RPC responds), false if port is occupied but
 * the daemon is broken or not yet initialized.
 */
export async function isDaemonHealthy(host: string, port: number): Promise<boolean> {
  try {
    const conn = await Deno.connect({ hostname: normalizeHost(host), port });
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const req = JSON.stringify({ jsonrpc: "2.0", method: "version", params: {}, id: "health-1" }) + "\n";
    await conn.write(encoder.encode(req));
    const buf = new Uint8Array(1024);
    const readResult = await Promise.race<number | null>([
      conn.read(buf),
      new Promise<null>((r) => setTimeout(() => r(null), 3000)),
    ]);
    conn.close();
    if (readResult === null || readResult === 0) return false;
    const resp = JSON.parse(decoder.decode(buf.subarray(0, readResult))) as Record<string, unknown>;
    return resp?.result !== undefined || resp?.error !== undefined;
  } catch {
    return false;
  }
}

/**
 * Check if signal-cli daemon is already running on a Unix socket.
 */
export async function isDaemonRunningUnix(socketPath: string): Promise<boolean> {
  try {
    const conn = await (Deno.connect as (opts: { transport: "unix"; path: string }) => Promise<Deno.Conn>)({
      transport: "unix",
      path: socketPath,
    });
    conn.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Start signal-cli daemon on a Unix socket.
 *
 * @param account - Phone number (E.164).
 * @param socketPath - Path to the Unix socket file.
 * @param signalCliPath - Path to signal-cli binary.
 * @param javaHome - Optional JAVA_HOME for managed JRE.
 * @returns A handle with the child process and stderr accessor.
 */
export function startDaemonUnix(
  account: string,
  socketPath: string,
  signalCliPath: string = "signal-cli",
  javaHome?: string,
): Result<DaemonHandle, string> {
  try {
    const env = javaHome
      ? { ...Deno.env.toObject(), JAVA_HOME: javaHome }
      : undefined;
    const cmd = new Deno.Command(signalCliPath, {
      args: ["-a", account, "daemon", "--socket", socketPath],
      stdout: "null",
      stderr: "piped",
      env,
    });
    const child = cmd.spawn();

    // Read all stderr into a shared buffer — earlyStderr resolves with the first line within 5s
    const stderrChunksUnix: Uint8Array[] = [];
    // deno-lint-ignore no-explicit-any
    let earlyResolveUnix: ((s: string) => void) | null = null as any;
    // deno-lint-ignore no-explicit-any
    let fullResolveUnix: ((s: string) => void) | null = null as any;
    const earlyStderr: Promise<string> = new Promise((r) => { earlyResolveUnix = r; });
    const _fullStderrPromiseUnix: Promise<string> = new Promise((r) => { fullResolveUnix = r; });

    (async () => {
      const decoder = new TextDecoder();
      const earlyDeadlineUnix = Date.now() + 5000;
      const earlyTimerUnix = setTimeout(() => {
        if (earlyResolveUnix) {
          const soFar = stderrChunksUnix.map((c) => decoder.decode(c)).join("");
          earlyResolveUnix(soFar.split("\n")[0].trim());
          earlyResolveUnix = null;
        }
      }, 5000);
      try {
        const reader = child.stderr.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done || !value) {
              if (earlyResolveUnix) {
                const soFar = stderrChunksUnix.map((c) => decoder.decode(c)).join("");
                earlyResolveUnix(soFar.split("\n")[0].trim());
                earlyResolveUnix = null;
              }
              break;
            }
            stderrChunksUnix.push(value);
            if (earlyResolveUnix && Date.now() < earlyDeadlineUnix) {
              const soFar = stderrChunksUnix.map((c) => decoder.decode(c)).join("");
              if (soFar.includes("\n")) {
                earlyResolveUnix(soFar.split("\n")[0].trim());
                earlyResolveUnix = null;
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      } catch {
        if (earlyResolveUnix) { earlyResolveUnix(""); earlyResolveUnix = null; }
      }
      clearTimeout(earlyTimerUnix);
      const total = stderrChunksUnix.reduce((n, c) => n + c.length, 0);
      const merged = new Uint8Array(total);
      let offset = 0;
      for (const c of stderrChunksUnix) {
        merged.set(c, offset);
        offset += c.length;
      }
      if (fullResolveUnix) { fullResolveUnix(new TextDecoder().decode(merged).trim()); fullResolveUnix = null; }
    })();

    const stderrText = (): Promise<string> => _fullStderrPromiseUnix;

    return { ok: true, value: { child, stderrText, earlyStderr } };
  } catch (err) {
    return { ok: false, error: `Failed to start signal-cli daemon: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/**
 * Wait for daemon to become reachable on a Unix socket.
 */
export async function waitForDaemonUnix(socketPath: string, timeoutMs: number = 60000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await isDaemonRunningUnix(socketPath)) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
