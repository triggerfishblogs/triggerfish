/**
 * Environment detection utilities.
 *
 * Provides functions to detect runtime environment (Docker, etc.)
 * for configuring appropriate defaults.
 *
 * @module
 */

/**
 * Detect whether the process is running inside a Docker container.
 *
 * Checks `TRIGGERFISH_DOCKER` env var first ("true" or "1"),
 * then falls back to checking for `/.dockerenv` file existence.
 *
 * @returns true if running in Docker
 */
export function isDockerEnvironment(): boolean {
  const envVal = Deno.env.get("TRIGGERFISH_DOCKER");
  if (envVal === "true" || envVal === "1") {
    return true;
  }

  try {
    Deno.statSync("/.dockerenv");
    return true;
  } catch {
    return false;
  }
}
