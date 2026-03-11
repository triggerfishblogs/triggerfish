/**
 * Integration tests for SecretAccessGate wiring.
 *
 * Verifies that createGatedKeychain correctly enforces
 * secret access policy, including the DENY rule for
 * RESTRICTED access from background sessions.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createSecretClassifier } from "../../src/core/secrets/classification/secret_classifier.ts";
import { createSecretAccessGate } from "../../src/core/secrets/classification/secret_access_gate.ts";
import type { SecretAccessGate } from "../../src/core/secrets/classification/secret_access_gate.ts";
import { createGatedKeychain } from "../../src/core/secrets/classification/gated_keychain.ts";
import {
  createDefaultSecretAccessRules,
  evaluateSecretAccessPolicy,
} from "../../src/core/policy/hooks/secret_access_hook.ts";
import type { ClassificationLevel } from "../../src/core/types/classification.ts";
import type { SecretStore } from "../../src/core/secrets/backends/secret_store.ts";

/** Create a test secret store that always returns a fixed value. */
function createTestStore(): SecretStore {
  return {
    getSecret: (name: string) =>
      Promise.resolve({ ok: true as const, value: `value-of-${name}` }),
    setSecret: () =>
      Promise.resolve({ ok: true as const, value: true as const }),
    deleteSecret: () =>
      Promise.resolve({ ok: true as const, value: true as const }),
    listSecrets: () =>
      Promise.resolve({ ok: true as const, value: [] as string[] }),
  };
}

/** Build a gated keychain with default rules for testing. */
function buildGatedTestKeychain(opts: {
  readonly isBackground: boolean;
  readonly sessionTaint: ClassificationLevel;
  readonly onEscalate?: (level: ClassificationLevel) => void;
}) {
  const classifier = createSecretClassifier({
    mappings: [
      { path: "restricted/**", level: "RESTRICTED" },
      { path: "confidential/**", level: "CONFIDENTIAL" },
    ],
    defaultLevel: "INTERNAL",
  });

  const rules = createDefaultSecretAccessRules();

  const gate = createSecretAccessGate({
    classifier,
    hookDispatcher: (input) =>
      Promise.resolve(
        evaluateSecretAccessPolicy(input, rules, opts.isBackground),
      ),
  });

  let currentTaint = opts.sessionTaint;

  return createGatedKeychain({
    inner: createTestStore(),
    gate,
    provider: "keychain",
    getSessionTaint: () => currentTaint,
    getIsBackground: () => opts.isBackground,
    onEscalate: (level) => {
      currentTaint = level;
      opts.onEscalate?.(level);
    },
  });
}

Deno.test("gated keychain: denies RESTRICTED access from background sessions", async () => {
  const gated = buildGatedTestKeychain({
    isBackground: true,
    sessionTaint: "PUBLIC",
  });

  const result = await gated.getSecret("restricted/api-key");

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("Background sessions"), true);
  }
});

Deno.test("gated keychain: allows RESTRICTED access from foreground sessions with escalation", async () => {
  const escalations: ClassificationLevel[] = [];
  const gated = buildGatedTestKeychain({
    isBackground: false,
    sessionTaint: "PUBLIC",
    onEscalate: (level) => escalations.push(level),
  });

  const result = await gated.getSecret("restricted/api-key");

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, "value-of-restricted/api-key");
  }
  assertEquals(escalations, ["RESTRICTED"]);
});

Deno.test("gated keychain: allows CONFIDENTIAL access from background with escalation", async () => {
  const escalations: ClassificationLevel[] = [];
  const gated = buildGatedTestKeychain({
    isBackground: true,
    sessionTaint: "PUBLIC",
    onEscalate: (level) => escalations.push(level),
  });

  const result = await gated.getSecret("confidential/token");

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value, "value-of-confidential/token");
  }
  assertEquals(escalations, ["CONFIDENTIAL"]);
});

Deno.test("gated keychain: no escalation when taint already covers classification", async () => {
  const escalations: ClassificationLevel[] = [];
  const gated = buildGatedTestKeychain({
    isBackground: false,
    sessionTaint: "CONFIDENTIAL",
    onEscalate: (level) => escalations.push(level),
  });

  const result = await gated.getSecret("confidential/token");

  assertEquals(result.ok, true);
  assertEquals(escalations.length, 0);
});

Deno.test("gated keychain: passes through setSecret without gating", async () => {
  const gated = buildGatedTestKeychain({
    isBackground: true,
    sessionTaint: "PUBLIC",
  });

  const result = await gated.setSecret("restricted/new-key", "value");

  assertEquals(result.ok, true);
});

Deno.test("gated keychain: surfaces gate evaluation failure as error", async () => {
  const failingGate: SecretAccessGate = {
    checkAccess: () =>
      Promise.resolve({ ok: false as const, error: "gate internal error" }),
  };

  const gated = createGatedKeychain({
    inner: createTestStore(),
    gate: failingGate,
    provider: "keychain",
    getSessionTaint: () => "PUBLIC" as ClassificationLevel,
    getIsBackground: () => false,
    onEscalate: () => {},
  });

  const result = await gated.getSecret("any-key");

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.error.includes("gate internal error"), true);
  }
});

Deno.test("gated keychain: INTERNAL secrets allowed without escalation at INTERNAL taint", async () => {
  const escalations: ClassificationLevel[] = [];
  const gated = buildGatedTestKeychain({
    isBackground: false,
    sessionTaint: "INTERNAL",
    onEscalate: (level) => escalations.push(level),
  });

  // "some-key" doesn't match any mapping, so defaults to INTERNAL
  const result = await gated.getSecret("some-key");

  assertEquals(result.ok, true);
  assertEquals(escalations.length, 0);
});
