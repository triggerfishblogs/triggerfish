/**
 * Log severity levels and user-facing log level mapping.
 *
 * Five severity levels (ERROR..TRACE) with numeric ordering, plus a
 * user-friendly mapping from CLI flag values (quiet/normal/verbose/debug)
 * to internal thresholds.
 *
 * @module
 */

/** Internal log severity levels, ordered from most severe to least. */
export type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG" | "TRACE";

/** Numeric ordering — lower means more severe. */
export const LOG_LEVEL_ORDER: Readonly<Record<LogLevel, number>> = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
  TRACE: 4,
};

/**
 * Check whether a message at `level` should be emitted given `threshold`.
 *
 * A message is emitted when its severity is at least as high (numerically ≤)
 * as the threshold. e.g. threshold=INFO emits ERROR, WARN, and INFO.
 */
export function shouldLog(level: LogLevel, threshold: LogLevel): boolean {
  return LOG_LEVEL_ORDER[level] <= LOG_LEVEL_ORDER[threshold];
}

/** User-facing log level names used in CLI flags and env vars. */
export type UserLogLevel = "quiet" | "normal" | "verbose" | "debug";

/** Map user-facing level names to internal thresholds. */
export const USER_LEVEL_MAP: Readonly<Record<UserLogLevel, LogLevel>> = {
  quiet: "ERROR",
  normal: "INFO",
  verbose: "DEBUG",
  debug: "TRACE",
};

/**
 * Parse a user-provided log level string, returning "normal" for unknown values.
 *
 * Accepts case-insensitive input. Unknown values fall back to "normal".
 */
export function parseUserLogLevel(input: string): UserLogLevel {
  const lower = input.toLowerCase().trim();
  if (lower in USER_LEVEL_MAP) {
    return lower as UserLogLevel;
  }
  return "normal";
}
