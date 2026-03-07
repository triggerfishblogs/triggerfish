/**
 * Secret access gate tests — classification enforcement boundary tests.
 *
 * These are the critical boundary tests analogous to Phase A2 memory
 * classification tests.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import { createSecretAccessGate } from "../../../../src/core/secrets/classification/secret_access_gate.ts";
import { createSecretClassifier } from "../../../../src/core/secrets/classification/secret_classifier.ts";
import type { SecretAccessHookInput } from "../../../../src/core/secrets/classification/secret_access_gate.ts";

function createTestGate() {
  const classifier = createSecretClassifier({
    mappings: [
      { path: "restricted/*", level: "RESTRICTED" },
      { path: "confidential/*", level: "CONFIDENTIAL" },
      { path: "internal/*", level: "INTERNAL" },
      { path: "public/*", level: "PUBLIC" },
    ],
    defaultLevel: "INTERNAL",
  });

  return createSecretAccessGate({ classifier });
}

// ─── Critical Boundary Tests ────────────────────────────────────────────────

Deno.test("access gate: PUBLIC session accessing INTERNAL secret -> escalates to INTERNAL", async () => {
  const gate = createTestGate();
  const result = await gate.checkAccess("internal/config", "vault", "PUBLIC");

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.action, "ALLOW");
    assertEquals(result.value.escalateTo, "INTERNAL");
  }
});

Deno.test("access gate: INTERNAL session accessing RESTRICTED secret -> escalates to RESTRICTED", async () => {
  const gate = createTestGate();
  const result = await gate.checkAccess(
    "restricted/master-key",
    "vault",
    "INTERNAL",
  );

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.action, "ALLOW");
    assertEquals(result.value.escalateTo, "RESTRICTED");
  }
});

Deno.test("access gate: CONFIDENTIAL session accessing CONFIDENTIAL secret -> allowed, no escalation", async () => {
  const gate = createTestGate();
  const result = await gate.checkAccess(
    "confidential/api-key",
    "vault",
    "CONFIDENTIAL",
  );

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.action, "ALLOW");
    assertEquals(result.value.escalateTo, undefined);
  }
});

Deno.test("access gate: RESTRICTED session accessing INTERNAL secret -> allowed, no escalation", async () => {
  const gate = createTestGate();
  const result = await gate.checkAccess(
    "internal/config",
    "vault",
    "RESTRICTED",
  );

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.action, "ALLOW");
    assertEquals(result.value.escalateTo, undefined);
  }
});

Deno.test("access gate: unmapped path uses default classification level", async () => {
  const gate = createTestGate();
  const result = await gate.checkAccess("unmapped/path", "vault", "PUBLIC");

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.action, "ALLOW");
    assertEquals(result.value.escalateTo, "INTERNAL");
  }
});

// ─── Custom Hook Dispatcher Tests ───────────────────────────────────────────

Deno.test("access gate: custom hook can DENY access", async () => {
  const classifier = createSecretClassifier({
    mappings: [{ path: "restricted/*", level: "RESTRICTED" }],
    defaultLevel: "INTERNAL",
  });

  const gate = createSecretAccessGate({
    classifier,
    hookDispatcher: (input: SecretAccessHookInput) => {
      if (input.classification === "RESTRICTED") {
        return Promise.resolve({
          action: "DENY" as const,
          reason: "Custom policy: RESTRICTED access denied",
        });
      }
      return Promise.resolve({ action: "ALLOW" as const });
    },
  });

  const result = await gate.checkAccess(
    "restricted/key",
    "vault",
    "INTERNAL",
  );
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.action, "DENY");
    assertEquals(
      result.value.reason,
      "Custom policy: RESTRICTED access denied",
    );
  }
});

Deno.test("access gate: custom hook can specify escalation level", async () => {
  const classifier = createSecretClassifier({
    mappings: [{ path: "special/*", level: "INTERNAL" }],
    defaultLevel: "PUBLIC",
  });

  const gate = createSecretAccessGate({
    classifier,
    hookDispatcher: () =>
      Promise.resolve({
        action: "ALLOW" as const,
        escalateTo: "CONFIDENTIAL" as const,
      }),
  });

  const result = await gate.checkAccess("special/key", "vault", "PUBLIC");
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.value.action, "ALLOW");
    assertEquals(result.value.escalateTo, "CONFIDENTIAL");
  }
});
