/**
 * Structured logger with dual output (stderr + file).
 *
 * Call `initLogger()` once at startup to configure the global log level
 * and optional file writer. Then use `createLogger(component)` anywhere
 * to get a component-scoped Logger instance.
 *
 * Without `initLogger()`, loggers degrade gracefully to stderr-only at
 * INFO level — safe for tests and one-off scripts.
 *
 * Format: `[2026-02-17T14:30:45.123Z] [INFO] [gateway] message`
 * Console output goes to **stderr** to keep stdout clean for structured
 * CLI output.
 *
 * @module
 */

import type { LogLevel } from "./levels.ts";
import { shouldLog } from "./levels.ts";
import type { FileWriter } from "./writer.ts";

/** Logger interface — one method per severity level. */
export interface Logger {
  error(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  info(msg: string, ...args: unknown[]): void;
  debug(msg: string, ...args: unknown[]): void;
  trace(msg: string, ...args: unknown[]): void;
}

/** Configuration for the global logger. */
export interface LoggerConfig {
  /** Minimum severity to emit. */
  readonly level: LogLevel;
  /** Optional file writer for persistent logging. */
  readonly fileWriter?: FileWriter;
  /** Write to stderr. Default: true. */
  readonly console?: boolean;
}

/** Global logger state. */
let globalLevel: LogLevel = "INFO";
let globalFileWriter: FileWriter | undefined;
let globalConsole = true;
let initialized = false;

/**
 * Initialize the global logger. Call once at startup.
 *
 * Subsequent calls override the previous configuration.
 */
export function initLogger(config: LoggerConfig): void {
  globalLevel = config.level;
  globalFileWriter = config.fileWriter;
  globalConsole = config.console ?? true;
  initialized = true;
}

/**
 * Shut down the global logger — flush and close the file writer.
 *
 * Safe to call even if `initLogger()` was never called.
 */
export async function shutdownLogger(): Promise<void> {
  if (globalFileWriter) {
    await globalFileWriter.close();
    globalFileWriter = undefined;
  }
  initialized = false;
}

/** Format a log line with timestamp, level, and component. */
function formatLine(
  level: LogLevel,
  component: string,
  msg: string,
  args: unknown[],
): string {
  const ts = new Date().toISOString();
  const extra = args.length > 0
    ? " " + args.map((a) =>
        typeof a === "string" ? a : JSON.stringify(a)
      ).join(" ")
    : "";
  return `[${ts}] [${level}] [${component}] ${msg}${extra}\n`;
}

/**
 * Create a component-scoped logger.
 *
 * The returned Logger reads the global configuration set by `initLogger()`.
 * If `initLogger()` was never called, defaults to stderr-only at INFO.
 */
export function createLogger(component: string): Logger {
  function log(level: LogLevel, msg: string, args: unknown[]): void {
    if (!shouldLog(level, globalLevel)) return;

    const line = formatLine(level, component, msg, args);

    if (globalConsole) {
      Deno.stderr.writeSync(new TextEncoder().encode(line));
    }

    if (globalFileWriter) {
      // Fire-and-forget write — do not block the caller
      globalFileWriter.write(line).catch((err: unknown) => {
        Deno.stderr.writeSync(new TextEncoder().encode(
          `[logger] File write failed: ${err instanceof Error ? err.message : String(err)}\n`,
        ));
      });
    }
  }

  return {
    error(msg: string, ...args: unknown[]) {
      log("ERROR", msg, args);
    },
    warn(msg: string, ...args: unknown[]) {
      log("WARN", msg, args);
    },
    info(msg: string, ...args: unknown[]) {
      log("INFO", msg, args);
    },
    debug(msg: string, ...args: unknown[]) {
      log("DEBUG", msg, args);
    },
    trace(msg: string, ...args: unknown[]) {
      log("TRACE", msg, args);
    },
  };
}

/** Check whether the global logger has been initialized. */
export function isLoggerInitialized(): boolean {
  return initialized;
}
