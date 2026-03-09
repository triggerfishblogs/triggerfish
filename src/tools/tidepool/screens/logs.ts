/**
 * Logs screen types and filter definitions.
 *
 * @module
 */

/** Log severity levels. */
export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

/** All log levels in order. */
export const LOG_LEVELS: readonly LogLevel[] = [
  "DEBUG",
  "INFO",
  "WARN",
  "ERROR",
] as const;

/** Log entry as received from the server. */
export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly source: string;
  readonly message: string;
  readonly context?: Record<string, unknown>;
}

/** Filter state for the log viewer. */
export interface LogFilter {
  readonly levels: ReadonlySet<LogLevel>;
  readonly source?: string;
  readonly search?: string;
}

/** Log subscription state. */
export interface LogSubscription {
  readonly filter: LogFilter;
  readonly paused: boolean;
  readonly bufferedCount: number;
}

/** Color mapping for log levels. */
export const LOG_LEVEL_COLORS: Readonly<Record<LogLevel, string>> = {
  DEBUG: "var(--fg3)",
  INFO: "var(--fg)",
  WARN: "var(--yellow)",
  ERROR: "var(--red)",
};

/** Create a default filter (all levels enabled). */
export function createDefaultLogFilter(): LogFilter {
  return {
    levels: new Set(LOG_LEVELS),
    source: undefined,
    search: undefined,
  };
}
