/**
 * Unit tests for restartDaemon() in lifecycle_restart.ts.
 *
 * Uses dependency injection to mock stopDaemon, getDaemonStatus,
 * and installAndStartDaemon without touching real OS services.
 */

import { assertEquals } from "@std/assert";
import type { RestartDeps } from "../../src/cli/daemon/lifecycle_restart.ts";
import { restartDaemon } from "../../src/cli/daemon/lifecycle_restart.ts";
import type {
  DaemonResult,
  DaemonStatus,
} from "../../src/cli/daemon/daemon.ts";

/** Build a minimal DaemonStatus stub. */
function stubStatus(running: boolean): DaemonStatus {
  return { running, manager: "systemd", message: running ? "up" : "down" };
}

/** Build RestartDeps with overrides. */
function buildDeps(overrides: Partial<RestartDeps>): RestartDeps {
  return {
    stopDaemon: () => Promise.resolve({ ok: true, message: "stopped" }),
    getDaemonStatus: () => Promise.resolve(stubStatus(false)),
    installAndStartDaemon: () =>
      Promise.resolve({ ok: true, message: "started" }),
    pollIntervalMs: 0,
    pollTimeoutMs: 50,
    ...overrides,
  };
}

// ─── Branch 1: stop fails early ──────────────────────────────────────────────

Deno.test("restartDaemon returns error when stopDaemon fails", async () => {
  const deps = buildDeps({
    stopDaemon: (): Promise<DaemonResult> =>
      Promise.resolve({ ok: false, message: "not installed" }),
  });

  const result = await restartDaemon("/usr/bin/triggerfish", deps);

  assertEquals(result.ok, false);
  assertEquals(result.message, "Restart failed (stop): not installed");
});

// ─── Branch 2: poll timeout ──────────────────────────────────────────────────

Deno.test("restartDaemon returns error when daemon does not stop in time", async () => {
  const deps = buildDeps({
    getDaemonStatus: (): Promise<DaemonStatus> =>
      Promise.resolve(stubStatus(true)),
    pollTimeoutMs: 50,
    pollIntervalMs: 10,
  });

  const result = await restartDaemon("/usr/bin/triggerfish", deps);

  assertEquals(result.ok, false);
  assertEquals(
    result.message,
    "Restart failed: daemon did not stop within 50ms",
  );
});

// ─── Branch 3: successful stop-then-start ────────────────────────────────────

Deno.test("restartDaemon succeeds when stop and start both succeed", async () => {
  let startCalled = false;
  const deps = buildDeps({
    installAndStartDaemon: (binaryPath: string): Promise<DaemonResult> => {
      startCalled = true;
      assertEquals(binaryPath, "/usr/bin/triggerfish");
      return Promise.resolve({ ok: true, message: "daemon started" });
    },
  });

  const result = await restartDaemon("/usr/bin/triggerfish", deps);

  assertEquals(result.ok, true);
  assertEquals(result.message, "daemon started");
  assertEquals(startCalled, true);
});
