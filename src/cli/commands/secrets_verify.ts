/**
 * Secret verification command handler.
 *
 * Verifies that all secret references in config can be resolved
 * from the configured provider(s).
 *
 * @module
 */

import type { Result } from "../../core/types/classification.ts";
import type { SecretStore } from "../../core/secrets/backends/secret_store.ts";

/** Verification result for a single secret reference. */
export interface SecretVerificationEntry {
  readonly name: string;
  readonly status: "ok" | "missing" | "error";
  readonly error?: string;
}

/** Full verification result. */
export interface VerificationResult {
  readonly total: number;
  readonly ok: number;
  readonly missing: number;
  readonly errors: number;
  readonly entries: readonly SecretVerificationEntry[];
}

/**
 * Verify that a list of secret names can be resolved from the store.
 *
 * @param names - Secret names to verify
 * @param store - Secret store to verify against
 */
export async function verifySecrets(
  names: readonly string[],
  store: SecretStore,
): Promise<Result<VerificationResult, string>> {
  const entries: SecretVerificationEntry[] = [];
  let ok = 0;
  let missing = 0;
  let errors = 0;

  for (const name of names) {
    const result = await store.getSecret(name);
    if (result.ok) {
      entries.push({ name, status: "ok" });
      ok++;
    } else if (/not found|does not exist|no secret|404/i.test(result.error)) {
      entries.push({ name, status: "missing", error: result.error });
      missing++;
    } else {
      entries.push({ name, status: "error", error: result.error });
      errors++;
    }
  }

  return {
    ok: true,
    value: {
      total: names.length,
      ok,
      missing,
      errors,
      entries,
    },
  };
}
