/**
 * Secret reference resolver for triggerfish.yaml config values.
 *
 * Resolves `secret:<key>` references in config strings to their
 * corresponding values from a SecretStore at config-load time.
 *
 * Reference syntax:
 *   secret:<key>   — resolved from OS keychain at startup
 *
 * Example:
 *   apiKey: "secret:provider:anthropic:apiKey"
 *   botToken: "secret:telegram:botToken"
 *
 * @module
 */

import type { Result } from "../core/types/classification.ts";
import type { SecretStore } from "./keychain.ts";

/** Prefix used to identify secret references in config values. */
const SECRET_PREFIX = "secret:";

/**
 * Resolve a single config value.
 *
 * If the value is a string matching `secret:<key>`, retrieves the
 * secret from the store. Non-string values and strings without the
 * prefix are returned unchanged.
 *
 * @param value - The config value to check and possibly resolve
 * @param store - The secret store to look up values from
 * @returns The resolved value, or an error if the secret was not found
 */
export async function resolveSecretRef(
  value: unknown,
  store: SecretStore,
): Promise<Result<unknown, string>> {
  if (typeof value !== "string" || !value.startsWith(SECRET_PREFIX)) {
    return { ok: true, value };
  }

  const key = value.slice(SECRET_PREFIX.length);
  if (key.length === 0) {
    return { ok: false, error: `Invalid secret reference: "${value}" has empty key` };
  }

  const result = await store.getSecret(key);
  if (!result.ok) {
    return {
      ok: false,
      error: `Secret reference "${value}" could not be resolved: ${result.error}`,
    };
  }

  return { ok: true, value: result.value };
}

/**
 * Recursively walk a config object and resolve all `secret:` references.
 *
 * Performs a depth-first traversal of plain objects and arrays.
 * All string leaf values matching the `secret:` prefix are substituted
 * with their keychain values. Non-string leaves pass through unchanged.
 *
 * Fails fast: if any secret reference cannot be resolved, the entire
 * operation returns an error without partial substitution guarantees
 * (though earlier resolved values in the traversal have been applied).
 *
 * @param config - The raw config object (or any nested value)
 * @param store - The secret store to look up values from
 * @returns The resolved config tree, or an error string
 */
export async function resolveConfigSecrets(
  config: unknown,
  store: SecretStore,
): Promise<Result<unknown, string>> {
  if (config === null || config === undefined) {
    return { ok: true, value: config };
  }

  if (typeof config === "string") {
    return resolveSecretRef(config, store);
  }

  if (Array.isArray(config)) {
    const resolved: unknown[] = [];
    for (const item of config) {
      const result = await resolveConfigSecrets(item, store);
      if (!result.ok) {
        return result;
      }
      resolved.push(result.value);
    }
    return { ok: true, value: resolved };
  }

  if (typeof config === "object") {
    const resolved: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(config as Record<string, unknown>)) {
      const result = await resolveConfigSecrets(v, store);
      if (!result.ok) {
        return result;
      }
      resolved[k] = result.value;
    }
    return { ok: true, value: resolved };
  }

  // Booleans, numbers — pass through
  return { ok: true, value: config };
}

/**
 * Detect all `secret:` references in a config object without resolving them.
 *
 * Useful for the `migrate-secrets` command to identify which fields
 * still contain plaintext values vs. which already use secret references.
 *
 * @param config - The config object to scan
 * @returns Array of dotted key paths that contain `secret:` references
 */
export function findSecretRefs(
  config: unknown,
  prefix = "",
): string[] {
  if (config === null || config === undefined) {
    return [];
  }

  if (typeof config === "string") {
    if (config.startsWith(SECRET_PREFIX)) {
      return [prefix];
    }
    return [];
  }

  if (Array.isArray(config)) {
    const refs: string[] = [];
    config.forEach((item, i) => {
      refs.push(...findSecretRefs(item, `${prefix}[${i}]`));
    });
    return refs;
  }

  if (typeof config === "object") {
    const refs: string[] = [];
    for (const [k, v] of Object.entries(config as Record<string, unknown>)) {
      const childPrefix = prefix.length > 0 ? `${prefix}.${k}` : k;
      refs.push(...findSecretRefs(v, childPrefix));
    }
    return refs;
  }

  return [];
}
