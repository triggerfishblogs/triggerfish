/**
 * Existing config loading and nested value traversal for the selective wizard.
 *
 * Provides safe dot-path access into parsed YAML config objects
 * so each reconfiguration section can read its current defaults.
 *
 * @module
 */

/** Safely read a nested value from a config object by dot path. */
export function readNestedConfigValue(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  let current: unknown = obj;
  for (const key of path.split(".")) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
