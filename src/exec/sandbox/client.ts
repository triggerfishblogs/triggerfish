/**
 * Parent-side filesystem sandbox client.
 *
 * Manages the lifecycle of a sandboxed Deno subprocess and routes
 * NDJSON requests/responses over stdin/stdout. Follows the StdioTransport
 * pattern from `src/mcp/client/transport.ts`.
 *
 * The worker's Deno permissions (`--allow-read`, `--allow-write`) are
 * scoped to the taint-appropriate workspace subdirectory. When the
 * session taint escalates, the worker is automatically killed and
 * respawned with updated OS-level permissions.
 *
 * @module
 */

import { createLogger } from "../../core/logger/logger.ts";
import type { SandboxRequest, SandboxResponse } from "./protocol.ts";

const log = createLogger("fs-sandbox");

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT_MS = 30_000;

/** Interface for the filesystem sandbox client. */
export interface FilesystemSandbox {
  /** Send a request to the sandbox worker and wait for a response. */
  request(req: SandboxRequest): Promise<SandboxResponse>;
  /** Shut down the sandbox worker subprocess. */
  shutdown(): Promise<void>;
}

/** Options for creating a filesystem sandbox. */
export interface FilesystemSandboxOptions {
  /**
   * Returns the absolute path to the allowed workspace directory for
   * the current taint level. Called on every request; when the returned
   * path differs from the running worker's path, the worker is killed
   * and respawned with new OS-level permissions.
   */
  readonly resolveWorkspacePath: () => string;
  /** Request timeout in milliseconds (default: 30000). */
  readonly timeoutMs?: number;
}

/** Pending request awaiting a response from the worker. */
interface PendingRequest {
  readonly resolve: (resp: SandboxResponse) => void;
  readonly reject: (err: Error) => void;
  readonly timer: number;
}

/**
 * Extract the worker script to a real filesystem path.
 *
 * In a compiled binary (`deno compile`), `import.meta.dirname` points to a
 * virtual directory that Deno's own FS APIs can read, but a child `deno run`
 * subprocess cannot — the file doesn't physically exist on disk. So we
 * always read the source (works in both dev and compiled mode) and write it
 * to a temp file that any process can execute.
 */
function extractWorkerToTempFile(): string {
  const workerSourcePath = import.meta.dirname + "/worker.ts";
  const source = Deno.readTextFileSync(workerSourcePath);
  const tmpPath = Deno.makeTempFileSync({ suffix: "_sandbox_worker.ts" });
  Deno.writeTextFileSync(tmpPath, source);
  log.debug("Extracted sandbox worker to temp file", {
    source: workerSourcePath,
    dest: tmpPath,
  });
  return tmpPath;
}

/**
 * Create a filesystem sandbox backed by a restricted Deno subprocess.
 *
 * The worker subprocess is spawned lazily on first request and restarted
 * automatically if it crashes or the workspace path changes (taint
 * escalation). All filesystem operations are constrained by Deno's
 * `--allow-read` and `--allow-write` permission flags scoped to the
 * taint-appropriate workspace subdirectory.
 */
export function createFilesystemSandbox(
  opts: FilesystemSandboxOptions,
): FilesystemSandbox {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pending = new Map<string, PendingRequest>();
  let process: Deno.ChildProcess | null = null;
  let stdinWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;
  let idCounter = 0;
  let shutdownRequested = false;
  let workerTempPath: string | null = null;
  /** The workspace path the current worker was spawned with. */
  let activeWorkspacePath: string | null = null;

  /** Spawn the worker subprocess with restricted permissions. */
  function spawnWorker(workspacePath: string): void {
    if (!workerTempPath) {
      workerTempPath = extractWorkerToTempFile();
    }
    activeWorkspacePath = workspacePath;
    log.debug("Spawning filesystem sandbox worker", {
      workspace: workspacePath,
      workerPath: workerTempPath,
    });
    const cmd = new Deno.Command("deno", {
      args: [
        "run",
        "--no-prompt",
        "--deny-net",
        "--deny-env",
        "--deny-ffi",
        `--allow-read=${workspacePath},${workerTempPath}`,
        `--allow-write=${workspacePath}`,
        "--allow-run=grep,find",
        workerTempPath,
        workspacePath,
      ],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    });
    process = cmd.spawn();
    stdinWriter = process.stdin.getWriter();

    startReadLoop(process);
    startStderrDrain(process);
    startExitWatch(process);
  }

  /** Read stdout line-by-line, resolve matching pending promises. */
  function startReadLoop(proc: Deno.ChildProcess): void {
    const reader = proc.stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.length === 0) continue;
            dispatchResponse(trimmed);
          }
        }
      } catch (err) {
        log.debug("Sandbox worker stdout read loop ended", { err });
      }
    })();
  }

  /** Parse a response line and resolve the matching pending request. */
  function dispatchResponse(line: string): void {
    let resp: SandboxResponse;
    try {
      resp = JSON.parse(line) as SandboxResponse;
    } catch {
      log.warn("Sandbox worker sent unparseable response", { line });
      return;
    }
    const entry = pending.get(resp.id);
    if (!entry) {
      log.warn("Sandbox worker response for unknown request id", {
        id: resp.id,
      });
      return;
    }
    pending.delete(resp.id);
    clearTimeout(entry.timer);
    entry.resolve(resp);
  }

  /** Drain stderr to debug logs. */
  function startStderrDrain(proc: Deno.ChildProcess): void {
    const reader = proc.stderr.getReader();
    const decoder = new TextDecoder();

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true }).trim();
          if (text.length > 0) {
            log.debug("Sandbox worker stderr", { output: text });
          }
        }
      } catch {
        // stderr closed — expected on shutdown
      }
    })();
  }

  /** Watch for process exit, reject all pending, allow respawn. */
  function startExitWatch(proc: Deno.ChildProcess): void {
    proc.status.then((status) => {
      if (process !== proc) return; // stale exit from replaced worker
      log.debug("Sandbox worker exited unexpectedly", {
        code: status.code,
        operation: "startExitWatch",
      });
      process = null;
      stdinWriter = null;
      rejectAllPending("Sandbox worker exited unexpectedly");
    });
  }

  /** Reject all pending requests with an error message. */
  function rejectAllPending(reason: string): void {
    for (const [id, entry] of pending) {
      clearTimeout(entry.timer);
      entry.reject(new Error(`${reason} (request id: ${id})`));
    }
    pending.clear();
  }

  /** Kill the running worker synchronously (best-effort). */
  function teardownWorker(): void {
    if (stdinWriter) {
      try {
        stdinWriter.close();
      } catch {
        // already closed
      }
      stdinWriter = null;
    }
    if (process) {
      try {
        process.kill();
      } catch {
        // already dead
      }
      process = null;
    }
    activeWorkspacePath = null;
  }

  /**
   * Ensure the worker is running with the correct workspace path.
   * If the taint-resolved path differs from the active worker's path,
   * the old worker is killed and a new one spawned with updated
   * OS-level permissions.
   */
  function ensureWorker(): void {
    if (shutdownRequested) {
      throw new Error("Sandbox has been shut down");
    }
    const requiredPath = opts.resolveWorkspacePath();
    if (process && activeWorkspacePath === requiredPath) {
      return;
    }
    if (process) {
      log.info("Sandbox workspace path changed, respawning worker", {
        previous: activeWorkspacePath,
        current: requiredPath,
      });
      rejectAllPending("Sandbox workspace path changed (taint escalation)");
      teardownWorker();
    }
    spawnWorker(requiredPath);
  }

  return {
    request(req: SandboxRequest): Promise<SandboxResponse> {
      ensureWorker();

      const id = String(++idCounter);
      const tagged: SandboxRequest = { ...req, id };
      const encoder = new TextEncoder();

      return new Promise<SandboxResponse>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(
            new Error(
              `Sandbox request timed out after ${timeoutMs}ms (id: ${id}, op: ${req.op})`,
            ),
          );
          killWorker();
        }, timeoutMs);

        pending.set(id, { resolve, reject, timer });

        const payload = encoder.encode(JSON.stringify(tagged) + "\n");
        stdinWriter!.write(payload).catch((err: unknown) => {
          pending.delete(id);
          clearTimeout(timer);
          reject(
            new Error(
              `Sandbox stdin write failed: ${
                err instanceof Error ? err.message : String(err)
              }`,
            ),
          );
        });
      });
    },

    async shutdown(): Promise<void> {
      shutdownRequested = true;
      rejectAllPending("Sandbox shutting down");
      await killWorker();
    },
  };

  /** Kill the worker process and clean up (async version for shutdown). */
  async function killWorker(): Promise<void> {
    if (stdinWriter) {
      try {
        await stdinWriter.close();
      } catch {
        // already closed
      }
      stdinWriter = null;
    }
    if (process) {
      try {
        process.kill();
      } catch {
        // already dead
      }
      try {
        await process.status;
      } catch {
        // already resolved
      }
      process = null;
    }
    activeWorkspacePath = null;
    if (workerTempPath) {
      try {
        Deno.removeSync(workerTempPath);
      } catch {
        // temp file already gone
      }
      workerTempPath = null;
    }
  }
}
