/**
 * Signal daemon stderr collector — stream reader and early-output capture.
 *
 * Provides the background stderr collection logic used by daemon processes.
 * Captures early stderr output (first line within 5s) and full stderr for
 * diagnostics.
 *
 * @module
 */

import { createLogger } from "../../../core/logger/logger.ts";

const log = createLogger("signal");

/** Stderr collector result for daemon processes. */
export interface StderrCollector {
  readonly earlyStderr: Promise<string>;
  readonly stderrText: () => Promise<string>;
}

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

/** Create a stderr collector that provides early and full stderr access. */
export function createDaemonStderrCollector(
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
