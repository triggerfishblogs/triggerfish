/**
 * Self-update orchestrator: coordinate download, verification, binary swap,
 * and daemon restart.
 * @module
 */

import { VERSION } from "../../version.ts";
import {
  fetchDaemonStatus,
  installAndStartDaemon,
  stopDaemon,
} from "../lifecycle.ts";
import { findInstalledBinary, replaceBinary, sha256File } from "./binary.ts";
import { fetchAndVerifyRelease } from "./download.ts";
import {
  fetchLatestRelease,
  type ReleaseMetadata,
  resolveTauriAssetName,
} from "./release.ts";
import { TIDEPOOL_NATIVE_BINARY } from "../../constants.ts";
import { dirname, join } from "@std/path";
import { createLogger } from "../../../core/logger/mod.ts";

const log = createLogger("cli.updater");

/** Result of an update operation. */
export interface UpdateResult {
  readonly ok: boolean;
  readonly message: string;
  readonly previousVersion?: string;
  readonly newVersion?: string;
  /** Whether the daemon was running before the update began. */
  readonly wasRunning?: boolean;
}

/** Check whether the current version already matches the latest. */
function checkAlreadyUpToDate(latestTag: string): UpdateResult | null {
  if (VERSION !== "dev" && VERSION === latestTag) {
    return {
      ok: true,
      message: `Already up to date (${VERSION})`,
      previousVersion: VERSION,
      newVersion: latestTag,
    };
  }
  return null;
}

/** Replace the binary and restart daemon if needed. */
async function performBinarySwap(
  tmpPath: string,
  binaryPath: string,
  wasRunning: boolean,
): Promise<string | null> {
  log.info("Replacing binary", {
    operation: "applyUpdate",
    step: "replaceBinary",
  });
  console.log("  Replacing binary...");
  try {
    await replaceBinary(tmpPath, binaryPath);
  } catch (e) {
    log.error("Binary replacement failed", {
      operation: "applyUpdate",
      err: e,
    });
    if (wasRunning) {
      console.log("  Restarting daemon with old binary...");
      await installAndStartDaemon(binaryPath);
    }
    try {
      await Deno.remove(tmpPath);
    } catch { /* cleanup */ }
    return `Failed to replace binary: ${e}`;
  }
  if (wasRunning) {
    console.log("  Restarting daemon...");
    await installAndStartDaemon(binaryPath);
  }
  return null;
}

/** Stop the daemon if running, swap the binary, and restart if needed. */
async function stopAndSwapBinary(tmpPath: string): Promise<{
  wasRunning: boolean;
  error?: string;
}> {
  const binaryPath = await findInstalledBinary();
  const wasRunning = (await fetchDaemonStatus()).running;
  if (wasRunning) {
    log.info("Stopping daemon for update", {
      operation: "applyUpdate",
      step: "stopDaemon",
    });
    console.log("  Stopping daemon...");
    await stopDaemon();
  }
  const swapError = await performBinarySwap(tmpPath, binaryPath, wasRunning);
  return { wasRunning, error: swapError ?? undefined };
}

/** Resolve the install directory for the Tauri binary (same dir as the main binary). */
async function resolveTauriInstallPath(): Promise<string> {
  const mainBinary = await findInstalledBinary();
  const dir = dirname(mainBinary);
  const ext = Deno.build.os === "windows" ? ".exe" : "";
  return join(dir, `${TIDEPOOL_NATIVE_BINARY}${ext}`);
}

/** Download, verify, and install the Tauri native UI binary. */
async function upgradeTauriBinary(
  metadata: ReleaseMetadata,
): Promise<void> {
  if (!metadata.tauri) {
    log.debug("No Tauri binary in this release", {
      operation: "upgradeTauriBinary",
    });
    return;
  }

  console.log("  Updating Tidepool native UI...");
  const tmpPath = join(
    dirname(await findInstalledBinary()),
    ".tidepool-update-tmp",
  );

  try {
    const resp = await fetch(metadata.tauri.binaryUrl);
    if (!resp.ok || !resp.body) {
      log.warn("Tauri binary download failed", {
        operation: "upgradeTauriBinary",
        status: resp.status,
      });
      console.log("  Warning: Tidepool native UI download failed, skipping.");
      return;
    }
    const file = await Deno.open(tmpPath, {
      write: true,
      create: true,
      truncate: true,
    });
    await resp.body.pipeTo(file.writable);

    if (metadata.tauri.checksumsUrl) {
      const csResp = await fetch(metadata.tauri.checksumsUrl);
      if (csResp.ok) {
        const text = await csResp.text();
        const assetName = resolveTauriAssetName();
        const line = text.split("\n").find((l) => l.includes(assetName));
        if (line) {
          const expected = line.split(/\s+/)[0].toLowerCase();
          const actual = await sha256File(tmpPath);
          if (actual !== expected) {
            log.warn("Tauri binary checksum mismatch", {
              operation: "upgradeTauriBinary",
              expected,
              actual,
            });
            console.log(
              "  Warning: Tidepool native UI checksum mismatch, skipping.",
            );
            await Deno.remove(tmpPath);
            return;
          }
        }
      }
    }

    const installPath = await resolveTauriInstallPath();
    await replaceBinary(tmpPath, installPath);
    console.log("  Tidepool native UI updated.");
  } catch (err) {
    log.warn("Tauri binary update failed", {
      operation: "upgradeTauriBinary",
      err,
    });
    console.log("  Warning: Tidepool native UI update failed, skipping.");
    try {
      await Deno.remove(tmpPath);
    } catch { /* cleanup */ }
  }
}

/** Build the success result after a completed update. */
function buildSuccessResult(
  latestTag: string,
  wasRunning: boolean,
): UpdateResult {
  return {
    ok: true,
    message: `Updated from ${VERSION} to ${latestTag}`,
    previousVersion: VERSION,
    newVersion: latestTag,
    wasRunning,
  };
}

/**
 * Update Triggerfish to the latest tagged release.
 *
 * Downloads the platform binary from the latest GitHub release, verifies
 * its SHA256 checksum, stops the running daemon, replaces the binary
 * in-process (no detached child), and restarts the daemon if it was running.
 *
 * @returns Result indicating success or failure with version information.
 */
export async function upgradeTriggerfish(): Promise<UpdateResult> {
  console.log("Checking for updates...");
  const release = await fetchLatestRelease();
  if ("error" in release) return { ok: false, message: release.error };
  const { tag: latestTag } = release.metadata;

  const upToDate = checkAlreadyUpToDate(latestTag);
  if (upToDate) return upToDate;

  console.log(`  Current: ${VERSION}`);
  console.log(`  Latest:  ${latestTag}`);

  const downloaded = await fetchAndVerifyRelease(release.metadata);
  if ("error" in downloaded) return { ok: false, message: downloaded.error };

  const swap = await stopAndSwapBinary(downloaded.tmpPath);
  if (swap.error) return { ok: false, message: swap.error };

  await upgradeTauriBinary(release.metadata);

  return buildSuccessResult(latestTag, swap.wasRunning);
}

/** @deprecated Use upgradeTriggerfish instead */
export const updateTriggerfish = upgradeTriggerfish;
