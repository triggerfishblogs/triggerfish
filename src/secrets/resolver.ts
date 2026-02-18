/**
 * Secret reference resolver.
 *
 * Scans tool input arguments for `{{secret:name}}` tokens and replaces
 * them with the actual secret values from the SecretStore. The resolved
 * values are never logged or returned to the LLM — they flow directly into
 * tool arguments below the LLM layer.
 *
 * @module
 */

import type { SecretStore } from "./keychain.ts";
import type { Result } from "../core/types/classification.ts";

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
 * name→value map. Names not in the map are left as-is (their absence was
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
