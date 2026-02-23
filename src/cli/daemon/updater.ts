/**
 * Self-update system: download, verify, and replace the Triggerfish binary.
 * @module
 */

import { dirname, join } from "@std/path";
import { resolveBaseDir } from "../config/paths.ts";
import { VERSION } from "../version.ts";
import { runCommand } from "./daemon.ts";
import {
  getDaemonStatus,
  installAndStartDaemon,
  stopDaemon,
} from "./lifecycle.ts";

/** Result of an update operation. */
export interface UpdateResult {
  readonly ok: boolean;
  readonly message: string;
  readonly previousVersion?: string;
  readonly newVersion?: string;
  /** Whether the daemon was running before the update began. */
  readonly wasRunning?: boolean;
}

const GITHUB_REPO = "greghavens/triggerfish";
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}`;

/**
 * Resolve the platform-specific asset name for the current OS and architecture.
 */
function resolveAssetName(): string {
  const os = Deno.build.os === "darwin" ? "macos" : Deno.build.os;
  const arch = Deno.build.arch === "aarch64" ? "arm64" : "x64";
  const ext = Deno.build.os === "windows" ? ".exe" : "";
  return `triggerfish-${os}-${arch}${ext}`;
}

/**
 * Compute SHA256 hex digest of a file.
 *
 * @param path - Absolute path to the file.
 * @returns Lowercase hex string of the SHA-256 hash.
 */
async function sha256File(path: string): Promise<string> {
  const file = await Deno.open(path, { read: true });
  try {
    const buf = await new Response(file.readable).arrayBuffer();
    const hash = await crypto.subtle.digest("SHA-256", buf);
    return [...new Uint8Array(hash)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch (e) {
    // readable stream consumed — file auto-closed
    throw e;
  }
}

/**
 * Check whether we can write to a directory.
 *
 * @param dir - Directory path to check.
 * @returns true if the current process can create files in the directory.
 */
async function canWriteToDir(dir: string): Promise<boolean> {
  const probe = join(dir, `.triggerfish-write-test-${Date.now()}`);
  try {
    await Deno.writeTextFile(probe, "");
    await Deno.remove(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Replace the binary file, handling cross-device moves and permission issues.
 *
 * On Unix: attempts atomic rename, falls back to copy+remove for cross-device.
 * If the target directory isn't writable, attempts via sudo.
 *
 * On Windows: renames current binary to .old, then moves new binary into place.
 *
 * @param tmpPath - Path to the downloaded replacement binary.
 * @param binaryPath - Path where the installed binary lives.
 */
async function replaceBinary(
  tmpPath: string,
  binaryPath: string,
): Promise<void> {
  const targetDir = dirname(binaryPath);

  if (Deno.build.os === "windows") {
    // Windows: rename current -> .old, then move new -> current
    const oldPath = `${binaryPath}.old`;
    try {
      await Deno.remove(oldPath);
    } catch { /* no old file */ }
    try {
      await Deno.rename(binaryPath, oldPath);
    } catch {
      // Binary may not exist yet (fresh install path)
    }
    await Deno.rename(tmpPath, binaryPath);
    return;
  }

  // Unix path
  const writable = await canWriteToDir(targetDir);

  if (writable) {
    // Try atomic rename (works when same filesystem)
    try {
      await Deno.rename(tmpPath, binaryPath);
    } catch {
      // Cross-device: copy + remove + chmod
      await Deno.copyFile(tmpPath, binaryPath);
      await Deno.remove(tmpPath);
    }
    await Deno.chmod(binaryPath, 0o755);
    // macOS: clear quarantine/provenance xattrs so Gatekeeper doesn't kill it
    if (Deno.build.os === "darwin") {
      await runCommand("xattr", ["-cr", binaryPath]);
    }
  } else {
    // Need elevated permissions
    console.log(
      `  Binary directory (${targetDir}) requires elevated permissions.`,
    );
    console.log("  You may be prompted for your password.\n");
    const mv = new Deno.Command("sudo", {
      args: ["mv", tmpPath, binaryPath],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    const mvResult = await mv.output();
    if (!mvResult.success) {
      throw new Error(
        "Failed to move binary with sudo. Check permissions and try again.",
      );
    }
    const chmod = new Deno.Command("sudo", {
      args: ["chmod", "755", binaryPath],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });
    await chmod.output();
    // macOS: clear quarantine/provenance xattrs so Gatekeeper doesn't kill it
    if (Deno.build.os === "darwin") {
      await runCommand("sudo", ["xattr", "-cr", binaryPath]);
    }
  }
}

/** Try to resolve binary from the currently running executable. */
async function resolveRunningExecutable(): Promise<string | null> {
  try {
    const execPath = Deno.execPath();
    if (execPath && execPath.toLowerCase().includes("triggerfish")) {
      await Deno.stat(execPath);
      return execPath;
    }
  } catch {
    // Fall through to candidate search
  }
  return null;
}

/** Build platform-specific candidate binary paths. */
function buildBinaryCandidatePaths(): string[] {
  if (Deno.build.os === "windows") {
    const localAppData = Deno.env.get("LOCALAPPDATA") ?? "";
    return [`${localAppData}\\Triggerfish\\triggerfish.exe`];
  }
  const home = Deno.env.get("HOME") ?? "";
  return ["/usr/local/bin/triggerfish", `${home}/.local/bin/triggerfish`];
}

/** Find the first existing path from a list of candidates, or return the first as default. */
async function resolveFirstExistingPath(candidates: string[]): Promise<string> {
  for (const path of candidates) {
    try {
      await Deno.stat(path);
      return path;
    } catch {
      continue;
    }
  }
  return candidates[0];
}

/**
 * Find the installed triggerfish binary path.
 */
async function findInstalledBinary(): Promise<string> {
  const running = await resolveRunningExecutable();
  if (running) return running;

  const candidates = buildBinaryCandidatePaths();
  return resolveFirstExistingPath(candidates);
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
/** Metadata about a GitHub release. */
interface ReleaseMetadata {
  readonly tag: string;
  readonly downloadUrl: string;
  readonly checksumsUrl?: string;
}

/** Fetch the latest release metadata from GitHub. */
async function fetchLatestRelease(): Promise<
  { metadata: ReleaseMetadata } | { error: string }
> {
  try {
    const resp = await fetch(`${GITHUB_API}/releases/latest`, {
      headers: { "User-Agent": "triggerfish-updater" },
    });
    if (!resp.ok) {
      return { error: `Failed to check for updates: HTTP ${resp.status}` };
    }
    const release = await resp.json() as {
      tag_name: string;
      assets: readonly { name: string; browser_download_url: string }[];
    };
    const assetName = resolveAssetName();
    const asset = release.assets.find((a) => a.name === assetName);
    if (!asset) {
      return {
        error:
          `No binary for this platform (${assetName}) in release ${release.tag_name}`,
      };
    }
    const checksums = release.assets.find((a) => a.name === "SHA256SUMS.txt");
    return {
      metadata: {
        tag: release.tag_name,
        downloadUrl: asset.browser_download_url,
        checksumsUrl: checksums?.browser_download_url,
      },
    };
  } catch (e) {
    return { error: `Failed to check for updates: ${e}` };
  }
}

/** Report download progress to stderr. */
function reportDownloadProgress(
  downloaded: number,
  totalBytes: number,
): void {
  const mb = (downloaded / 1_048_576).toFixed(1);
  const enc = new TextEncoder();
  if (totalBytes > 0) {
    const pct = Math.round((downloaded / totalBytes) * 100);
    const totalMb = (totalBytes / 1_048_576).toFixed(1);
    Deno.stderr.writeSync(
      enc.encode(`\r  Downloading... ${mb}/${totalMb} MB (${pct}%)`),
    );
  } else {
    Deno.stderr.writeSync(enc.encode(`\r  Downloading... ${mb} MB`));
  }
}

/** Download a binary from a URL to a temp path with progress. Returns error or null. */
async function downloadBinaryToFile(
  downloadUrl: string,
  tmpPath: string,
): Promise<string | null> {
  try {
    const resp = await fetch(downloadUrl);
    if (!resp.ok || !resp.body) {
      return `Download failed: HTTP ${resp.status}`;
    }
    const totalBytes = Number(resp.headers.get("content-length") ?? 0);
    const file = await Deno.open(tmpPath, {
      write: true,
      create: true,
      truncate: true,
    });
    let downloaded = 0;
    const reader = resp.body.getReader();
    const writer = file.writable.getWriter();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      await writer.write(value);
      downloaded += value.byteLength;
      reportDownloadProgress(downloaded, totalBytes);
    }
    await writer.close();
    Deno.stderr.writeSync(new TextEncoder().encode("\n"));
    if (Deno.build.os !== "windows") await Deno.chmod(tmpPath, 0o755);
    return null;
  } catch (e) {
    try {
      await Deno.remove(tmpPath);
    } catch { /* cleanup */ }
    return `Download failed: ${e}`;
  }
}

/** Verify SHA256 checksum of a downloaded binary. Returns error or null. */
async function verifyBinaryChecksum(
  checksumsUrl: string | undefined,
  tmpPath: string,
): Promise<string | null> {
  if (!checksumsUrl) {
    console.log(
      "  Warning: no SHA256SUMS.txt in release, skipping checksum verification.",
    );
    return null;
  }
  console.log("  Verifying checksum...");
  try {
    const resp = await fetch(checksumsUrl);
    if (!resp.ok) {
      console.log(
        "  Warning: could not download checksums, skipping verification.",
      );
      return null;
    }
    const text = await resp.text();
    const expectedLine = text.split("\n").find((l) =>
      l.includes(resolveAssetName())
    );
    if (!expectedLine) {
      console.log(
        "  Warning: asset not found in SHA256SUMS.txt, skipping verification.",
      );
      return null;
    }
    const expectedHash = expectedLine.split(/\s+/)[0].toLowerCase();
    const actualHash = await sha256File(tmpPath);
    if (actualHash !== expectedHash) {
      return `Checksum verification failed.\n  Expected: ${expectedHash}\n  Got:      ${actualHash}`;
    }
    console.log("  Checksum verified.");
    return null;
  } catch {
    console.log("  Warning: checksum verification failed, skipping.");
    return null;
  }
}

/** Replace the binary and restart daemon if needed. Returns error or null. */
async function performBinarySwap(
  tmpPath: string,
  binaryPath: string,
  wasRunning: boolean,
): Promise<string | null> {
  console.log("  Replacing binary...");
  try {
    await replaceBinary(tmpPath, binaryPath);
  } catch (e) {
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

/** Download and verify the release binary. Returns the temp path or an error message. */
async function downloadAndVerifyRelease(
  metadata: ReleaseMetadata,
): Promise<{ tmpPath: string } | { error: string }> {
  const tmpPath = join(resolveBaseDir(), ".update-tmp");
  const dlError = await downloadBinaryToFile(metadata.downloadUrl, tmpPath);
  if (dlError) return { error: dlError };

  const csError = await verifyBinaryChecksum(metadata.checksumsUrl, tmpPath);
  if (csError) {
    try {
      await Deno.remove(tmpPath);
    } catch { /* cleanup */ }
    return { error: csError };
  }
  return { tmpPath };
}

/** Stop the daemon if running, swap the binary, and restart if needed. */
async function stopAndSwapBinary(tmpPath: string): Promise<{
  wasRunning: boolean;
  error?: string;
}> {
  const binaryPath = await findInstalledBinary();
  const wasRunning = (await getDaemonStatus()).running;
  if (wasRunning) {
    console.log("  Stopping daemon...");
    await stopDaemon();
  }
  const swapError = await performBinarySwap(tmpPath, binaryPath, wasRunning);
  return { wasRunning, error: swapError ?? undefined };
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

/** Build the success result after a completed update. */
function buildUpdateSuccessResult(
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

export async function updateTriggerfish(): Promise<UpdateResult> {
  console.log("Checking for updates...");
  const release = await fetchLatestRelease();
  if ("error" in release) return { ok: false, message: release.error };
  const { tag: latestTag } = release.metadata;

  const upToDate = checkAlreadyUpToDate(latestTag);
  if (upToDate) return upToDate;

  console.log(`  Current: ${VERSION}`);
  console.log(`  Latest:  ${latestTag}`);

  const downloaded = await downloadAndVerifyRelease(release.metadata);
  if ("error" in downloaded) return { ok: false, message: downloaded.error };

  const swap = await stopAndSwapBinary(downloaded.tmpPath);
  if (swap.error) return { ok: false, message: swap.error };

  return buildUpdateSuccessResult(latestTag, swap.wasRunning);
}
