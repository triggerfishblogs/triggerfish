/**
 * YAML path utilities and shared constants for CLI config management.
 *
 * Provides dotted-key-path access for nested YAML objects and
 * canonical lists of supported channel and plugin types.
 * @module
 */

// ─── Constants ───────────────────────────────────────────────────

/** Supported channel types for add-channel. */
export const CHANNEL_TYPES = [
  "telegram",
  "slack",
  "discord",
  "whatsapp",
  "webchat",
  "email",
  "signal",
] as const;

/** Supported plugin types for add-plugin. */
export const PLUGIN_TYPES = [
  "obsidian",
] as const;

// ─── YAML path utilities ────────────────────────────────────────

/**
 * Set a nested value in an object using a dotted key path.
 * Creates intermediate objects as needed.
 */
export function writeNestedYamlValue(
  obj: Record<string, unknown>,
  keyPath: string,
  value: unknown,
): void {
  const parts = keyPath.split(".");
  // deno-lint-ignore no-explicit-any
  let current: any = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined || typeof current[part] !== "object") {
      current[part] = {};
    }
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
}

/**
 * Get a nested value from an object using a dotted key path.
 */
export function readNestedYamlValue(
  obj: Record<string, unknown>,
  keyPath: string,
): unknown {
  const parts = keyPath.split(".");
  // deno-lint-ignore no-explicit-any
  let current: any = obj;
  for (const part of parts) {
    if (
      current === undefined || current === null || typeof current !== "object"
    ) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}
