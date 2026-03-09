/**
 * Status indicator types.
 *
 * Defines status levels and their visual mappings
 * for session/agent status dots.
 *
 * @module
 */

/** Status level for a status dot indicator. */
export type StatusLevel = "green" | "yellow" | "red" | "gray";

/** Status dot configuration. */
export interface StatusDotConfig {
  readonly level: StatusLevel;
  readonly label?: string;
}

/** Map a status string to a status level. */
export function resolveStatusLevel(
  status: string,
): StatusLevel {
  switch (status) {
    case "active":
    case "running":
    case "connected":
    case "healthy":
      return "green";
    case "idle":
    case "waiting":
    case "degraded":
    case "connecting":
      return "yellow";
    case "error":
    case "failed":
    case "critical":
    case "disconnected":
      return "red";
    default:
      return "gray";
  }
}
