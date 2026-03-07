/**
 * SECRET_ACCESS hook handler tests.
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import {
  createDefaultSecretAccessRules,
  evaluateSecretAccessPolicy,
} from "../../../src/core/policy/hooks/secret_access_hook.ts";
import type { SecretAccessHookInput } from "../../../src/core/secrets/classification/secret_access_gate.ts";

function makeInput(
  overrides: Partial<SecretAccessHookInput> = {},
): SecretAccessHookInput {
  return {
    secretName: "test/secret",
    provider: "vault",
    classification: "INTERNAL",
    sessionTaint: "PUBLIC",
    ...overrides,
  };
}

Deno.test("SECRET_ACCESS hook: allows access with escalation when classification > taint", () => {
  const rules = createDefaultSecretAccessRules();
  const result = evaluateSecretAccessPolicy(
    makeInput({ classification: "CONFIDENTIAL", sessionTaint: "PUBLIC" }),
    rules,
    false,
  );

  assertEquals(result.action, "ALLOW");
  assertEquals(result.escalateTo, "CONFIDENTIAL");
});

Deno.test("SECRET_ACCESS hook: allows access without escalation when taint >= classification", () => {
  const rules = createDefaultSecretAccessRules();
  const result = evaluateSecretAccessPolicy(
    makeInput({ classification: "INTERNAL", sessionTaint: "CONFIDENTIAL" }),
    rules,
    false,
  );

  assertEquals(result.action, "ALLOW");
  assertEquals(result.escalateTo, undefined);
});

Deno.test("SECRET_ACCESS hook: denies RESTRICTED access from background sessions", () => {
  const rules = createDefaultSecretAccessRules();
  const result = evaluateSecretAccessPolicy(
    makeInput({ classification: "RESTRICTED", sessionTaint: "PUBLIC" }),
    rules,
    true,
  );

  assertEquals(result.action, "DENY");
  assertEquals(
    result.reason?.includes("Background sessions"),
    true,
  );
});

Deno.test("SECRET_ACCESS hook: allows RESTRICTED access from foreground sessions", () => {
  const rules = createDefaultSecretAccessRules();
  const result = evaluateSecretAccessPolicy(
    makeInput({ classification: "RESTRICTED", sessionTaint: "INTERNAL" }),
    rules,
    false,
  );

  assertEquals(result.action, "ALLOW");
  assertEquals(result.escalateTo, "RESTRICTED");
});

Deno.test("SECRET_ACCESS hook: allows background access to non-RESTRICTED secrets", () => {
  const rules = createDefaultSecretAccessRules();
  const result = evaluateSecretAccessPolicy(
    makeInput({ classification: "CONFIDENTIAL", sessionTaint: "INTERNAL" }),
    rules,
    true,
  );

  assertEquals(result.action, "ALLOW");
  assertEquals(result.escalateTo, "CONFIDENTIAL");
});

Deno.test("SECRET_ACCESS hook: same classification and taint — no escalation", () => {
  const rules = createDefaultSecretAccessRules();
  const result = evaluateSecretAccessPolicy(
    makeInput({ classification: "INTERNAL", sessionTaint: "INTERNAL" }),
    rules,
    false,
  );

  assertEquals(result.action, "ALLOW");
  assertEquals(result.escalateTo, undefined);
});

Deno.test("SECRET_ACCESS hook: custom rule overrides default behavior", () => {
  const customRules = [
    {
      name: "deny_all_vault",
      condition: (ctx: { provider: string }) => ctx.provider === "vault",
      action: "DENY" as const,
      reason: "Vault access temporarily disabled",
    },
  ];

  const result = evaluateSecretAccessPolicy(
    makeInput({ provider: "vault" }),
    customRules,
    false,
  );

  assertEquals(result.action, "DENY");
  assertEquals(result.reason, "Vault access temporarily disabled");
});
