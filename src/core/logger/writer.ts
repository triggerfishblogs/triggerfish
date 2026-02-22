/**
 * File-based log writer with size-based rotation.
 *
 * Writes log lines to `~/.triggerfish/logs/triggerfish.log`, rotating when
 * the file exceeds `maxBytes` (default 1 MB). Keeps up to `maxFiles`
 * rotated copies (default 10): `.1.log` through `.10.log`.
 *
 * @module
 */

import { join } from "@std/path";

/** Configuration for the file writer. */
export interface FileWriterConfig {
  /** Directory where log files are written. */
  readonly logDir: string;
  /** Base name for the log file (without extension). Default: "triggerfish". */
  readonly baseName?: string;
  /** Maximum bytes per file before rotation. Default: 1_048_576 (1 MB). */
  readonly maxBytes?: number;
  /** Maximum number of rotated files to keep. Default: 10. */
  readonly maxFiles?: number;
}

/** Interface for a log file writer. */
export interface FileWriter {
  /** Append a log line (including newline). */
  write(line: string): Promise<void>;
  /** Flush and close the underlying file handle. */
  close(): Promise<void>;
}

/** Open a log file for appending, creating it and its directory if needed. */
async function openLogFileForAppend(
  logDir: string,
  logPath: string,
): Promise<{ file: Deno.FsFile; size: number }> {
  await Deno.mkdir(logDir, { recursive: true });
  const file = await Deno.open(logPath, {
    write: true,
    create: true,
    append: true,
  });
  const stat = await file.stat();
  return { file, size: stat.size };
}

/** Shift existing rotated log files (.9→.10, .8→.9, etc.) and delete oldest. */
async function shiftRotatedLogFiles(
  logDir: string,
  baseName: string,
  maxFiles: number,
  logPath: string,
): Promise<void> {
  for (let i = maxFiles; i >= 1; i--) {
    const src = i === 1 ? logPath : join(logDir, `${baseName}.${i - 1}.log`);
    const dst = join(logDir, `${baseName}.${i}.log`);
    if (i === maxFiles) {
      try {
        await Deno.remove(dst);
      } catch { /* File doesn't exist — fine */ }
    }
    try {
      await Deno.rename(src, dst);
    } catch { /* Source doesn't exist — fine */ }
  }
}

/**
 * Create a file writer with size-based rotation.
 *
 * On each `write()`, tracks the cumulative byte count. When it exceeds
 * `maxBytes`, the current file is closed, existing rotated files are
 * shifted (`.9.log` → `.10.log`, etc.), and a fresh file is opened.
 */
export async function createFileWriter(
  config: FileWriterConfig,
): Promise<FileWriter> {
  const baseName = config.baseName ?? "triggerfish";
  const maxBytes = config.maxBytes ?? 1_048_576;
  const maxFiles = config.maxFiles ?? 10;
  const logDir = config.logDir;
  const logPath = join(logDir, `${baseName}.log`);

  const init = await openLogFileForAppend(logDir, logPath);
  let file = init.file;
  let currentBytes = init.size;
  const encoder = new TextEncoder();

  return {
    async write(line: string): Promise<void> {
      const bytes = encoder.encode(line);
      await file.write(bytes);
      currentBytes += bytes.byteLength;
      if (currentBytes >= maxBytes) {
        file.close();
        await shiftRotatedLogFiles(logDir, baseName, maxFiles, logPath);
        file = await Deno.open(logPath, {
          write: true,
          create: true,
          truncate: true,
        });
        currentBytes = 0;
      }
    },
    close(): Promise<void> {
      try {
        file.close();
      } catch { /* Already closed */ }
      return Promise.resolve();
    },
  };
}
