/**
 * Audit log writer — separate file for raw forensic events.
 *
 * Audit events capture raw (un-sanitized) injection attempts for forensic
 * analysis. The audit log is intentionally separate from the operational log
 * and is NEVER read by log_reader.ts or any LLM-facing tool.
 *
 * @module
 */

import { createFileWriter } from "./writer.ts";
import type { FileWriter } from "./writer.ts";

/** An audit event recording a raw injection attempt or policy block. */
export interface AuditEvent {
  /** When the event occurred. */
  readonly timestamp: Date;
  /** Category of audit event. */
  readonly type: "injection_attempt" | "policy_block" | "raw_content";
  /** Source identifier (e.g. log file path or component name). */
  readonly source: string;
  /** Raw, un-sanitized content captured for forensic analysis. */
  readonly rawContent: string;
}

/** Configuration for the audit log. */
export interface AuditLogConfig {
  /** Directory where the audit log is written. */
  readonly logDir: string;
  /** Maximum bytes per file before rotation. Default: 1_048_576 (1 MB). */
  readonly maxBytes?: number;
  /** Maximum number of rotated files to keep. Default: 10. */
  readonly maxFiles?: number;
}

/** Global audit log writer — never exposed to LLM tools. */
let auditWriter: FileWriter | undefined;

/**
 * Initialize the audit log writer. Call once at startup alongside initLogger().
 *
 * Writes to `audit.log` in the same log directory as the operational log,
 * with the same rotation settings (1 MB, 10 files by default).
 */
export async function initAuditLog(config: AuditLogConfig): Promise<void> {
  auditWriter = await createFileWriter({
    logDir: config.logDir,
    baseName: "audit",
    maxBytes: config.maxBytes ?? 1_048_576,
    maxFiles: config.maxFiles ?? 10,
  });
}

/**
 * Write a raw audit event to the audit log.
 *
 * Safe to call even if initAuditLog() was never called — writes nothing.
 * Never exposed to LLM-facing tools.
 */
export async function writeAuditEvent(event: AuditEvent): Promise<void> {
  if (!auditWriter) return;
  const ts = event.timestamp.toISOString();
  const line =
    `[${ts}] [AUDIT] [${event.type}] source=${event.source}\n${event.rawContent}\n---\n`;
  await auditWriter.write(line);
}

/**
 * Flush and close the audit log writer.
 *
 * Safe to call even if initAuditLog() was never called.
 */
export async function shutdownAuditLog(): Promise<void> {
  if (auditWriter) {
    await auditWriter.close();
    auditWriter = undefined;
  }
}
