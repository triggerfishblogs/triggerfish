/**
 * Classification-aware log reader for safe LLM context injection.
 *
 * Reads Triggerfish operational logs and scans only «»-delimited regions
 * (provenance-tagged external content) for injection patterns. Trusted log
 * content outside «» delimiters is passed through unmodified.
 *
 * Security properties:
 * - Never reads audit.log (excluded by filename filter)
 * - Scans only «»-delimited regions for INJECTION_PATTERNS
 * - Strips matched patterns; trusted content is unchanged
 * - Prepends warning banner if any injection was detected
 * - Writes raw injected content to audit log for forensics
 *
 * @module
 */

import { join } from "@std/path";
import { INJECTION_PATTERNS } from "./skills/scanner.ts";
import { writeAuditEvent } from "../core/logger/audit.ts";

/** Result of reading logs for LLM context injection. */
export interface LogReadResult {
  /** LLM-safe log content — injection patterns stripped from external regions. */
  readonly content: string;
  /** Number of injection patterns detected and stripped. */
  readonly injectionCount: number;
  /** Warning prepended to content when injections were detected. */
  readonly warning?: string;
}

/** Options for reading logs. */
export interface LogReaderOptions {
  /** Maximum bytes to read per log file. Default: 51_200 (50 KB). */
  readonly maxBytesPerFile?: number;
  /** Maximum number of log files to read. Default: 3. */
  readonly maxFiles?: number;
  /** Log directory. Default: ~/.triggerfish/logs/ */
  readonly logDir?: string;
}

/** Warning prepended to LLM context when injection patterns were detected. */
const INJECTION_WARNING =
  "[WARNING: Log file contained injection attempts that were stripped. " +
  "External-origin content (marked «»  in logs) may be attacker-controlled.]";

/** Resolve the default log directory from the HOME environment variable. */
function resolveDefaultLogDir(): string {
  const home = Deno.env.get("HOME") ?? "/tmp";
  return join(home, ".triggerfish", "logs");
}

/** Check whether a filename belongs to the audit log (must never be read by LLM). */
function isAuditFile(filename: string): boolean {
  return filename.includes("audit");
}

/** List operational log files sorted by modification time (newest first). */
async function listOperationalLogFiles(
  logDir: string,
  maxFiles: number,
): Promise<string[]> {
  const files: { path: string; mtime: number }[] = [];
  try {
    for await (const entry of Deno.readDir(logDir)) {
      if (!entry.isFile) continue;
      if (!entry.name.endsWith(".log")) continue;
      if (isAuditFile(entry.name)) continue;
      const path = join(logDir, entry.name);
      try {
        const stat = await Deno.stat(path);
        files.push({ path, mtime: stat.mtime?.getTime() ?? 0 });
      } catch {
        // Skip files we cannot stat
      }
    }
  } catch {
    // Log directory does not exist — return empty list
    return [];
  }
  files.sort((a, b) => b.mtime - a.mtime);
  return files.slice(0, maxFiles).map((f) => f.path);
}

/** Read a log file up to maxBytes, returning the truncated text. */
async function readLogFileTruncated(
  filePath: string,
  maxBytes: number,
): Promise<string> {
  try {
    const file = await Deno.open(filePath, { read: true });
    try {
      const stat = await file.stat();
      const fileSize = stat.size;
      if (fileSize <= maxBytes) {
        const buf = new Uint8Array(fileSize);
        await file.read(buf);
        return new TextDecoder().decode(buf);
      }
      // Read last maxBytes (most recent log entries)
      await file.seek(-maxBytes, Deno.SeekMode.End);
      const buf = new Uint8Array(maxBytes);
      await file.read(buf);
      return new TextDecoder().decode(buf);
    } finally {
      file.close();
    }
  } catch {
    return "";
  }
}

/**
 * Scan all «»-delimited regions in a single log line for injection patterns.
 *
 * Returns the sanitized line and the number of patterns stripped.
 * Text outside «» delimiters is passed through unchanged.
 */
function scanAndSanitizeLine(line: string): {
  readonly sanitized: string;
  readonly injectionCount: number;
} {
  let result = "";
  let injectionCount = 0;
  let pos = 0;

  while (pos < line.length) {
    const openIdx = line.indexOf("\u00AB", pos); // «
    if (openIdx === -1) {
      // No more delimiters — append the rest unchanged
      result += line.slice(pos);
      break;
    }

    // Append trusted content before the delimiter
    result += line.slice(pos, openIdx + 1); // include the « char
    pos = openIdx + 1;

    const closeIdx = line.indexOf("\u00BB", pos); // »
    if (closeIdx === -1) {
      // Unclosed delimiter — treat rest as trusted
      result += line.slice(pos);
      break;
    }

    // Extract the external region content (between « and »)
    let region = line.slice(pos, closeIdx);

    // Scan and strip injection patterns from this region only
    for (const { pattern } of INJECTION_PATTERNS) {
      if (pattern.test(region)) {
        region = region.replace(pattern, "[injection stripped]");
        injectionCount++;
      }
    }

    result += region + "\u00BB"; // append sanitized region + »
    pos = closeIdx + 1;
  }

  return { sanitized: result, injectionCount };
}

/**
 * Read Triggerfish operational logs for safe LLM context injection.
 *
 * Never reads audit.log. Scans only «»-delimited regions for injection
 * patterns and strips matches. Prepends a warning if any injection was found.
 */
export async function readLogsForLlm(
  options?: LogReaderOptions,
): Promise<LogReadResult> {
  const maxBytesPerFile = options?.maxBytesPerFile ?? 51_200;
  const maxFiles = options?.maxFiles ?? 3;
  const logDir = options?.logDir ?? resolveDefaultLogDir();

  const filePaths = await listOperationalLogFiles(logDir, maxFiles);

  let totalInjectionCount = 0;
  const processedParts: string[] = [];

  for (const filePath of filePaths) {
    const rawContent = await readLogFileTruncated(filePath, maxBytesPerFile);
    if (!rawContent) continue;

    const lines = rawContent.split("\n");
    const sanitizedLines: string[] = [];
    const injectedRawLines: string[] = [];

    for (const line of lines) {
      const { sanitized, injectionCount } = scanAndSanitizeLine(line);
      sanitizedLines.push(sanitized);
      if (injectionCount > 0) {
        totalInjectionCount += injectionCount;
        injectedRawLines.push(line);
      }
    }

    // Write raw injection attempts to audit log for forensics
    if (injectedRawLines.length > 0) {
      await writeAuditEvent({
        timestamp: new Date(),
        type: "injection_attempt",
        source: filePath,
        rawContent: injectedRawLines.join("\n"),
      });
    }

    processedParts.push(sanitizedLines.join("\n"));
  }

  const content = processedParts.join("\n");

  if (totalInjectionCount > 0) {
    return {
      content: `${INJECTION_WARNING}\n\n${content}`,
      injectionCount: totalInjectionCount,
      warning: INJECTION_WARNING,
    };
  }

  return { content, injectionCount: 0 };
}
