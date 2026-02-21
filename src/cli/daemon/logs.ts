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
      ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3, TRACE: 4,
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

/**
 * Bundle all Triggerfish log files into a temporary directory.
 *
 * Collects `triggerfish.log` and any rotated variants (`triggerfish.1.log`,
 * `triggerfish.2.log`, etc.) from the log directory and copies them to a
 * freshly-created temporary directory. Prints the bundle path to stdout.
 */
export async function bundleLogs(): Promise<void> {
  const dir = logDir();

  // Collect log files from the log directory
  const logFiles: string[] = [];
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (entry.isFile && /^triggerfish(\.\d+)?\.log$/.test(entry.name)) {
        logFiles.push(entry.name);
      }
    }
  } catch {
    console.log(`No log directory found at ${dir}`);
    console.log("Start the daemon first: triggerfish start");
    return;
  }

  if (logFiles.length === 0) {
    console.log(`No log files found in ${dir}`);
    console.log("Start the daemon first: triggerfish start");
    return;
  }

  // Sort so the primary log comes first, then rotated in order
  logFiles.sort((a, b) => {
    const numA = a === "triggerfish.log" ? -1 : parseInt(a.match(/\.(\d+)\.log$/)?.[1] ?? "0", 10);
    const numB = b === "triggerfish.log" ? -1 : parseInt(b.match(/\.(\d+)\.log$/)?.[1] ?? "0", 10);
    return numA - numB;
  });

  const bundleDir = await Deno.makeTempDir({ prefix: "triggerfish-logs-" });

  for (const name of logFiles) {
    await Deno.copyFile(join(dir, name), join(bundleDir, name));
  }

  console.log(`Log bundle created at: ${bundleDir}`);
  console.log(`Bundled ${logFiles.length} log file(s).`);
}
