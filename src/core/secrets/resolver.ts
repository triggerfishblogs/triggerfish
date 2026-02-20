/**
 * Secret reference resolver.
 *
 * Two resolution modes:
 *
 * 1. **Config-level** (`secret:<key>`) — Resolves `secret:<key>` references in
 *    triggerfish.yaml config values at startup time from the OS keychain.
 *    Example: `apiKey: "secret:provider:anthropic:apiKey"`
 *
 * 2. **Tool-argument-level** (`{{secret:name}}`) — Scans tool input arguments
 *    for `{{secret:name}}` tokens and replaces them with actual secret values
 *    from the SecretStore. The resolved values are never logged or returned to
 *    the LLM — they flow directly into tool arguments below the LLM layer.
 *
 * @module
 */

import type { Result } from "../types/classification.ts";
import type { SecretStore } from "./keychain.ts";

// ─── Config-level resolution (`secret:<key>`) ────────────────────────────────

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

// ─── Tool-argument-level resolution (`{{secret:name}}`) ──────────────────────

/** Pattern matching `{{secret:name}}` tokens anywhere in a string. */
const SECRET_REF_PATTERN = /\{\{secret:([^}]+)\}\}/g;

/** Result of a resolution pass — the resolved input and any errors encountered. */
export interface ResolveResult {
  /** The input with all `{{secret:name}}` tokens replaced by their values. */
  readonly resolved: Record<string, unknown>;
  /**
   * Names of secrets that were referenced but could not be found in the store.
   * Empty array if all references resolved successfully.
   */
  readonly missing: readonly string[];
}

/**
 * Recursively walk a value and collect all `{{secret:name}}` tokens.
 *
 * @param value - Any JSON-compatible value
 * @returns Array of secret names referenced (may contain duplicates)
 */
function collectSecretRefs(value: unknown): string[] {
  if (typeof value === "string") {
    const refs: string[] = [];
    let match: RegExpExecArray | null;
    const re = new RegExp(SECRET_REF_PATTERN.source, "g");
    while ((match = re.exec(value)) !== null) {
      refs.push(match[1].trim());
    }
    return refs;
  }
  if (Array.isArray(value)) {
    return value.flatMap(collectSecretRefs);
  }
  if (value !== null && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(
      collectSecretRefs,
    );
  }
  return [];
}

/**
 * Substitute all `{{secret:name}}` tokens in a string using the provided
 * name->value map. Names not in the map are left as-is (their absence was
 * already reported in the missing list).
 */
function substituteInString(
  str: string,
  secrets: ReadonlyMap<string, string>,
): string {
  return str.replace(
    new RegExp(SECRET_REF_PATTERN.source, "g"),
    (_match, name: string) => {
      const trimmed = name.trim();
      return secrets.get(trimmed) ?? `{{secret:${trimmed}}}`;
    },
  );
}

/**
 * Recursively substitute `{{secret:name}}` tokens in any JSON-compatible value.
 */
function substituteValue(
  value: unknown,
  secrets: ReadonlyMap<string, string>,
): unknown {
  if (typeof value === "string") {
    return substituteInString(value, secrets);
  }
  if (Array.isArray(value)) {
    return value.map((item) => substituteValue(item, secrets));
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = substituteValue(v, secrets);
    }
    return result;
  }
  return value;
}

/**
 * Resolve all `{{secret:name}}` references in tool input arguments.
 *
 * Fetches required secrets from the store in parallel. Returns the resolved
 * input and a list of any names that could not be found. The LLM never sees
 * the resolved values — they are substituted at the tool executor layer.
 *
 * @param input - Raw tool input from the LLM
 * @param store - SecretStore to retrieve values from
 * @returns ResolveResult with substituted input and missing secret names
 */
export async function resolveSecretRefs(
  input: Record<string, unknown>,
  store: SecretStore,
): Promise<Result<ResolveResult, string>> {
  // Collect all unique secret names referenced in the input.
  const allRefs = collectSecretRefs(input);
  const uniqueNames = [...new Set(allRefs)];

  if (uniqueNames.length === 0) {
    return {
      ok: true,
      value: { resolved: input, missing: [] },
    };
  }

  // Fetch all secrets in parallel.
  const results = await Promise.all(
    uniqueNames.map((name) => store.getSecret(name).then((r) => ({ name, r }))),
  );

  const secrets = new Map<string, string>();
  const missing: string[] = [];

  for (const { name, r } of results) {
    if (r.ok) {
      secrets.set(name, r.value);
    } else {
      missing.push(name);
    }
  }

  const resolved = substituteValue(input, secrets) as Record<string, unknown>;

  return {
    ok: true,
    value: { resolved, missing },
  };
}
