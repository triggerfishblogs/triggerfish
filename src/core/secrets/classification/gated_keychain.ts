/**
 * Gated keychain — wraps a SecretStore with classification enforcement.
 *
 * Intercepts `getSecret` calls and checks the {@link SecretAccessGate}
 * before allowing access. Other methods (setSecret, deleteSecret,
 * listSecrets) pass through unchanged since they are administrative
 * operations, not runtime data access.
 *
 * @module
 */

import type { Result } from "../../types/classification.ts";
import type { ClassificationLevel } from "../../types/classification.ts";
import { createLogger } from "../../logger/logger.ts";
import type { SecretStore } from "../backends/secret_store.ts";
import type { SecretAccessGate } from "./secret_access_gate.ts";

const log = createLogger("secrets:gated-keychain");

/** Options for creating a gated keychain. */
export interface GatedKeychainOptions {
  /** Underlying secret store to delegate to. */
  readonly inner: SecretStore;
  /** Access gate that enforces classification policy. */
  readonly gate: SecretAccessGate;
  /** Provider name used for classification lookups (e.g. "keychain"). */
  readonly provider: string;
  /** Live getter for the current session taint level. */
  readonly getSessionTaint: () => ClassificationLevel;
  /** Whether the current session is a background/trigger session. */
  readonly getIsBackground: () => boolean;
  /** Callback invoked when taint escalation is needed. */
  readonly onEscalate?: (level: ClassificationLevel) => void;
}

/**
 * Create a gated keychain that enforces secret access policy.
 *
 * Wraps `getSecret` with a {@link SecretAccessGate} check. If the gate
 * returns DENY, the secret is not fetched and an error is returned.
 * If the gate returns ALLOW with an `escalateTo` field, the
 * `onEscalate` callback is invoked before returning the secret.
 */
export function createGatedKeychain(options: GatedKeychainOptions): SecretStore {
  const { inner, gate, provider, getSessionTaint, getIsBackground, onEscalate } = options;

  return {
    getSecret: async (name: string): Promise<Result<string, string>> => {
      const accessResult = await gate.checkAccess(
        name,
        provider,
        getSessionTaint(),
      );

      if (!accessResult.ok) {
        log.error("Secret access gate evaluation failed", {
          operation: "getSecret",
          secretName: name,
          err: accessResult.error,
        });
        return { ok: false, error: `Secret access gate error: ${accessResult.error}` };
      }

      const decision = accessResult.value;

      if (decision.action === "DENY") {
        log.warn("Secret access denied by gated keychain", {
          operation: "getSecret",
          secretName: name,
          provider,
          sessionTaint: getSessionTaint(),
          isBackground: getIsBackground(),
          reason: decision.reason,
        });
        return {
          ok: false,
          error: decision.reason ?? `Secret access denied: ${name}`,
        };
      }

      if (decision.escalateTo && onEscalate) {
        log.info("Secret access triggering taint escalation", {
          operation: "getSecret",
          secretName: name,
          escalateTo: decision.escalateTo,
        });
        onEscalate(decision.escalateTo);
      }

      return inner.getSecret(name);
    },
    setSecret: inner.setSecret,
    deleteSecret: inner.deleteSecret,
    listSecrets: inner.listSecrets,
  };
}
