/**
 * Log file management: tail, filter, and bundle log files.
 * @module
 */

import { join } from "@std/path";
import { logDir, logFilePath } from "./daemon.ts";

/**
 * Tail the Triggerfish log file. Streams output to stdout.
 *
 * Always reads from the file-based log (`~/.triggerfish/logs/triggerfish.log`)
 * on all platforms. This ensures consistent behaviour on Linux (where systemd
 * captures stdout to journalctl but the FileWriter writes to the log file)
 * and Windows (minimal service capture).
 *
 * @param follow - Whether to follow (tail -f) the log. Default: true.
 * @param lines - Number of lines to show. Default: 50.
 * @param levelFilter - Optional log level filter (e.g. "ERROR", "WARN"). Only shows lines at or above this level.
 */
export async function tailLogs(
  follow = true,
  lines = 50,
  levelFilter?: string,
): Promise<void> {
  const path = logFilePath();
  try {
    await Deno.stat(path);
  } catch {
    console.log(`No log file found at ${path}`);
    console.log("Start the daemon first: triggerfish start");
    return;
  }

  if (levelFilter) {
    // Read-and-filter mode: read the file, filter by level, print matching lines
    const content = await Deno.readTextFile(path);
    const levelOrder: Record<string, number> = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3,
      TRACE: 4,
    };
    const threshold = levelOrder[levelFilter.toUpperCase()] ?? 2;
    const allLines = content.split("\n");
    const filtered = allLines.filter((line) => {
      const match = line.match(/\[(ERROR|WARN|INFO|DEBUG|TRACE)\]/);
      if (!match) return false;
      return (levelOrder[match[1]] ?? 5) <= threshold;
    });
    const tail = filtered.slice(-lines);
    for (const line of tail) {
      console.log(line);
    }
    return;
  }

  if (Deno.build.os === "windows") {
    // PowerShell Get-Content is the Windows equivalent of tail
    const psArgs = follow
      ? `Get-Content -Path '${path}' -Tail ${lines} -Wait -Encoding UTF8`
      : `Get-Content -Path '${path}' -Tail ${lines} -Encoding UTF8`;
    const cmd = new Deno.Command("powershell", {
      args: ["-NoProfile", "-Command", psArgs],
      stdout: "inherit",
      stderr: "inherit",
    });
    const child = cmd.spawn();
    await child.status;
  } else if (follow) {
    const cmd = new Deno.Command("tail", {
      args: ["-f", `-n${lines}`, path],
      stdout: "inherit",
      stderr: "inherit",
    });
    const child = cmd.spawn();
    await child.status;
  } else {
    const cmd = new Deno.Command("tail", {
      args: [`-n${lines}`, path],
      stdout: "inherit",
      stderr: "inherit",
    });
    const child = cmd.spawn();
    await child.status;
  }
}

/** Collect triggerfish log file names from the log directory. Returns null if dir missing. */
async function collectLogFileNames(dir: string): Promise<string[] | null> {
  const logFiles: string[] = [];
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (entry.isFile && /^triggerfish(\.\d+)?\.log$/.test(entry.name)) {
        logFiles.push(entry.name);
      }
    }
  } catch {
    return null;
  }
  return logFiles;
}

/** Sort log files: primary log first, then rotated in numeric order. */
function sortLogFileNames(logFiles: string[]): string[] {
  return [...logFiles].sort((a, b) => {
    const numA = a === "triggerfish.log"
      ? -1
      : parseInt(a.match(/\.(\d+)\.log$/)?.[1] ?? "0", 10);
    const numB = b === "triggerfish.log"
      ? -1
      : parseInt(b.match(/\.(\d+)\.log$/)?.[1] ?? "0", 10);
    return numA - numB;
  });
}

/** Create a .tar.gz archive from log files (Linux/macOS). */
async function archiveTarGz(
  sourceDir: string,
  fileNames: readonly string[],
  archivePath: string,
): Promise<boolean> {
  const cmd = new Deno.Command("tar", {
    args: ["-czf", archivePath, "-C", sourceDir, ...fileNames],
    stdout: "null",
    stderr: "piped",
  });
  const { success } = await cmd.output();
  return success;
}

/** Create a .zip archive from log files (Windows). */
async function archiveZip(
  sourceDir: string,
  fileNames: readonly string[],
  archivePath: string,
): Promise<boolean> {
  const sourcePaths = fileNames
    .map((n) => `'${join(sourceDir, n)}'`)
    .join(",");
  const psCmd =
    `Compress-Archive -Path ${sourcePaths} -DestinationPath '${archivePath}'`;
  const cmd = new Deno.Command("powershell", {
    args: ["-NoProfile", "-Command", psCmd],
    stdout: "null",
    stderr: "piped",
  });
  const { success } = await cmd.output();
  return success;
}

/**
 * Bundle all Triggerfish log files into a compressed archive.
 *
 * Collects `triggerfish.log` and any rotated variants (`triggerfish.1.log`,
 * `triggerfish.2.log`, etc.) from the log directory and compresses them into
 * a `.tar.gz` (Linux/macOS) or `.zip` (Windows) archive in the system temp
 * directory. Prints the archive path to stdout.
 */
export async function bundleLogs(): Promise<void> {
  const dir = logDir();
  const logFiles = await collectLogFileNames(dir);

  if (!logFiles) {
    console.log(`No log directory found at ${dir}`);
    console.log("Start the daemon first: triggerfish start");
    return;
  }
  if (logFiles.length === 0) {
    console.log(`No log files found in ${dir}`);
    console.log("Start the daemon first: triggerfish start");
    return;
  }

  const sorted = sortLogFileNames(logFiles);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const isWindows = Deno.build.os === "windows";
  const ext = isWindows ? "zip" : "tar.gz";
  const tmpDir = await Deno.makeTempDir({ prefix: "triggerfish-logs-" });
  const archivePath = join(tmpDir, `triggerfish-logs-${timestamp}.${ext}`);

  const ok = isWindows
    ? await archiveZip(dir, sorted, archivePath)
    : await archiveTarGz(dir, sorted, archivePath);

  if (!ok) {
    console.log("Log bundle archive failed — falling back to file copy.");
    for (const name of sorted) {
      await Deno.copyFile(join(dir, name), join(tmpDir, name));
    }
    console.log(`Log files copied to: ${tmpDir}`);
  } else {
    console.log(`Log bundle created at: ${archivePath}`);
  }
  console.log(`Bundled ${sorted.length} log file(s).`);
}
