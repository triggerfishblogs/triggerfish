/**
 * Self-update orchestrator: coordinate download, verification, binary swap,
 * and daemon restart.
 *
 * The updater dynamically discovers ALL platform-matching binaries in the
 * latest release and installs any that are missing or outdated. This means
 * the updater never needs to be updated when new companion binaries are
 * added to future releases.
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
import { fetchLatestRelease, type ReleaseAsset } from "./release.ts";
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

/** Check if a file exists. */
async function fileExists(path: string): Promise<boolean> {
  try {
    const stat = await Deno.stat(path);
    return stat.isFile;
  } catch {
    return false;
  }
}

/** Verify a downloaded file against a checksums URL. Returns true if valid. */
async function verifyCompanionChecksum(
  tmpPath: string,
  assetName: string,
  checksumsUrl: string,
): Promise<boolean> {
  try {
    const resp = await fetch(checksumsUrl);
    if (!resp.ok) return true; // Can't verify, allow it
    const text = await resp.text();
    const line = text.split("\n").find((l) => l.includes(assetName));
    if (!line) return true; // Asset not in checksums, allow it
    const expected = line.split(/\s+/)[0].toLowerCase();
    const actual = await sha256File(tmpPath);
    if (actual !== expected) {
      log.warn("Companion binary checksum mismatch", {
        operation: "installCompanionBinary",
        assetName,
        expected,
        actual,
      });
      return false;
    }
  } catch (err) {
    log.debug("Companion checksum verification failed", {
      operation: "installCompanionBinary",
      err,
    });
  }
  return true;
}

/**
 * Download, verify, and install a single companion binary.
 *
 * Companion binaries are any release assets besides the main triggerfish
 * binary (e.g. triggerfish-tidepool). They are discovered dynamically from
 * the release assets — no hardcoded names.
 */
async function installCompanionBinary(
  asset: ReleaseAsset,
  installDir: string,
): Promise<void> {
  const installPath = join(installDir, asset.localName);

  // Skip if already installed
  if (await fileExists(installPath)) {
    log.debug("Companion binary already installed", {
      operation: "installCompanionBinary",
      asset: asset.name,
      installPath,
    });
    return;
  }

  console.log(`  Installing ${asset.localName}...`);
  const tmpPath = join(installDir, `.${asset.localName}-update-tmp`);

  try {
    const resp = await fetch(asset.downloadUrl);
    if (!resp.ok || !resp.body) {
      log.warn("Companion binary download failed", {
        operation: "installCompanionBinary",
        asset: asset.name,
        status: resp.status,
      });
      console.log(`  Warning: ${asset.localName} download failed, skipping.`);
      return;
    }
    const file = await Deno.open(tmpPath, {
      write: true,
      create: true,
      truncate: true,
    });
    await resp.body.pipeTo(file.writable);

    if (asset.checksumsUrl) {
      const valid = await verifyCompanionChecksum(
        tmpPath,
        asset.name,
        asset.checksumsUrl,
      );
      if (!valid) {
        console.log(
          `  Warning: ${asset.localName} checksum mismatch, skipping.`,
        );
        await Deno.remove(tmpPath);
        return;
      }
    }

    await replaceBinary(tmpPath, installPath);
    console.log(`  ${asset.localName} installed.`);
  } catch (err) {
    log.warn("Companion binary install failed", {
      operation: "installCompanionBinary",
      asset: asset.name,
      err,
    });
    console.log(`  Warning: ${asset.localName} install failed, skipping.`);
    try {
      await Deno.remove(tmpPath);
    } catch { /* cleanup */ }
  }
}

/**
 * Install any companion binaries from the release that are missing locally.
 *
 * Scans all release assets matching the current platform and installs any
 * that aren't already present in the same directory as the main binary.
 * This runs even when the main binary is already up to date.
 */
async function installMissingCompanionBinaries(
  assets: readonly ReleaseAsset[],
): Promise<void> {
  const mainBinary = await findInstalledBinary();
  const installDir = dirname(mainBinary);

  const mainLocalName = Deno.build.os === "windows"
    ? "triggerfish.exe"
    : "triggerfish";
  const companions = assets.filter((a) => a.localName !== mainLocalName);

  for (const companion of companions) {
    await installCompanionBinary(companion, installDir);
  }
}

/**
 * Update Triggerfish to the latest tagged release.
 *
 * Downloads the platform binary from the latest GitHub release, verifies
 * its SHA256 checksum, stops the running daemon, replaces the binary
 * in-process (no detached child), and restarts the daemon if it was running.
 *
 * Also installs any companion binaries (e.g. triggerfish-tidepool) that
 * are present in the release but missing locally — even when the main
 * binary is already at the latest version.
 *
 * @returns Result indicating success or failure with version information.
 */
export async function upgradeTriggerfish(): Promise<UpdateResult> {
  console.log("Checking for updates...");
  const release = await fetchLatestRelease();
  if ("error" in release) return { ok: false, message: release.error };
  const { tag: latestTag, assets } = release.metadata;

  const alreadyCurrent = VERSION !== "dev" && VERSION === latestTag;

  if (alreadyCurrent) {
    // Main binary is current, but companion binaries may be missing
    await installMissingCompanionBinaries(assets);
    return {
      ok: true,
      message: `Already up to date (${VERSION})`,
      previousVersion: VERSION,
      newVersion: latestTag,
    };
  }

  console.log(`  Current: ${VERSION}`);
  console.log(`  Latest:  ${latestTag}`);

  const downloaded = await fetchAndVerifyRelease(release.metadata);
  if ("error" in downloaded) return { ok: false, message: downloaded.error };

  const swap = await stopAndSwapBinary(downloaded.tmpPath);
  if (swap.error) return { ok: false, message: swap.error };

  await installMissingCompanionBinaries(assets);

  return {
    ok: true,
    message: `Updated from ${VERSION} to ${latestTag}`,
    previousVersion: VERSION,
    newVersion: latestTag,
    wasRunning: swap.wasRunning,
  };
}

/** @deprecated Use upgradeTriggerfish instead */
export const updateTriggerfish = upgradeTriggerfish;
