/**
 * Claude session lifecycle management.
 *
 * Handles polling for responses, graceful termination with
 * SIGTERM/SIGKILL escalation, stdin cleanup, and session ID
 * generation.
 *
 * @module
 */

import { createLogger } from "../core/logger/logger.ts";
import type { SessionEntry } from "./session_types.ts";

const log = createLogger("exec");

/** Generate a unique session ID with timestamp and counter. */
let sessionCounter = 0;
export function generateSessionId(): string {
  sessionCounter++;
  return `claude-${Date.now()}-${sessionCounter}`;
}

/** Poll for new output until a result message arrives or deadline passes. */
export async function pollForClaudeResponse(
  entry: SessionEntry,
  outputBefore: number,
  deadlineMs: number,
): Promise<string> {
  const deadline = Date.now() + deadlineMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 200));
    if (entry.output.length > outputBefore) {
      const newOutput = entry.output.slice(outputBefore);
      if (
        newOutput.includes('"type":"result"') ||
        newOutput.includes('"type": "result"')
      ) break;
    }
    if (entry.session.status !== "running") break;
  }
  return entry.output.slice(outputBefore);
}

/** Close the stdin writer, ignoring errors if already closed. */
export function closeSessionStdinWriter(entry: SessionEntry): void {
  try {
    entry.stdinWriter.close().catch((err: unknown) => {
      log.debug("Stdin writer close failed during termination", {
        error: err instanceof Error ? err.message : String(err),
      });
    });
  } catch {
    // Already closed
  }
}

/** Send SIGKILL and mark session terminated if still running. */
export function forceKillClaudeSession(entry: SessionEntry): void {
  if (entry.session.status !== "running") return;
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

/** Wait for session to exit within a deadline, polling every 100ms. */
async function awaitClaudeSessionExit(
  entry: SessionEntry,
  deadlineMs: number,
): Promise<void> {
  const deadline = Date.now() + deadlineMs;
  while (entry.session.status === "running" && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 100));
  }
}

/** Gracefully terminate a running Claude session with SIGTERM then SIGKILL. */
export async function terminateClaudeSession(
  entry: SessionEntry,
): Promise<void> {
  closeSessionStdinWriter(entry);
  try {
    entry.process.kill("SIGTERM");
  } catch {
    // Already dead
  }
  await awaitClaudeSessionExit(entry, 5000);
  forceKillClaudeSession(entry);
  if (entry.timeoutId !== null) clearTimeout(entry.timeoutId);
}
