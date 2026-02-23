/**
 * Logger module — structured logging with file rotation.
 *
 * @module
 */

export type { LogLevel, UserLogLevel } from "./levels.ts";
export { LOG_LEVEL_ORDER, shouldLog, USER_LEVEL_MAP, parseUserLogLevel } from "./levels.ts";
export type { FileWriterConfig, FileWriter } from "./writer.ts";
export { createFileWriter } from "./writer.ts";
export type { Logger, LoggerConfig } from "./logger.ts";
export { initLogger, shutdownLogger, createLogger, isLoggerInitialized } from "./logger.ts";
export {
  sanitizeExternal,
  tagExternal,
  formatTaggedEntry,
  MAX_EXTERNAL_BYTES,
} from "./sanitizer.ts";
export type { AuditEvent, AuditLogConfig } from "./audit.ts";
export { initAuditLog, writeAuditEvent, shutdownAuditLog } from "./audit.ts";
