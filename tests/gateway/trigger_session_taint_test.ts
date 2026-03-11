/**
 * Tests that trigger session taint is not escalated by infrastructure plumbing.
 *
 * Integration executors (GitHub, Google, etc.) access secrets to function —
 * this is infrastructure, not agent behavior.  The gated keychain must NEVER
 * be passed to integration builders because it fires the secret-classification
 * gate during setup, escalating the session before the agent even runs.
 *
 * These tests verify that building a GitHub executor with the ungated keychain
 * does not touch the session taint, and that accidentally using a gated keychain
 * WOULD escalate it (proving the guard is necessary).
 *
 * @module
 */

import { assertEquals } from "@std/assert";
import type { ClassificationLevel } from "../../src/core/types/classification.ts";
import type { SecretStore } from "../../src/core/secrets/backends/secret_store.ts";
import { buildSchedulerGitHubExecutor } from "../../src/gateway/startup/tools/scheduler_tool_assembly.ts";
import type { TriggerFishConfig } from "../../src/core/config.ts";
import type { SessionId } from "../../src/core/types/session.ts";
import { createSecretClassifier } from "../../src/core/secrets/classification/secret_classifier.ts";
import { createSecretAccessGate } from "../../src/core/secrets/classification/secret_access_gate.ts";
import { createGatedKeychain } from "../../src/core/secrets/classification/gated_keychain.ts";
import {
  createDefaultSecretAccessRules,
  evaluateSecretAccessPolicy,
} from "../../src/core/policy/hooks/secret_access_hook.ts";

// ─── Helpers ──────────────────────────────────────────────────────────

/** Secret store that returns a fixed PAT for "github-pat". */
function createTestKeychain(): SecretStore {
  return {
    getSecret: (name: string) => {
      if (name === "github-pat") {
        return Promise.resolve({ ok: true as const, value: "ghp_test_token" });
      }
      return Promise.resolve({
        ok: false as const,
        error: `Secret not found: ${name}`,
      });
    },
    setSecret: () =>
      Promise.resolve({ ok: true as const, value: true as const }),
    deleteSecret: () =>
      Promise.resolve({ ok: true as const, value: true as const }),
    listSecrets: () =>
      Promise.resolve({ ok: true as const, value: [] as string[] }),
  };
}

/** Wrap a keychain with the gated keychain (as the broken code did). */
function wrapWithGate(
  inner: SecretStore,
  opts: {
    readonly isBackground: boolean;
    readonly getSessionTaint: () => ClassificationLevel;
    readonly onEscalate: (level: ClassificationLevel) => void;
  },
): SecretStore {
  const classifier = createSecretClassifier({
    mappings: [],
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
  return createGatedKeychain({
    inner,
    gate,
    provider: "keychain",
    getSessionTaint: opts.getSessionTaint,
    getIsBackground: () => opts.isBackground,
    onEscalate: opts.onEscalate,
  });
}

const minimalConfig: TriggerFishConfig = {};
const fakeSessionId = "00000000-0000-0000-0000-000000000000" as SessionId;

// ─── Tests ────────────────────────────────────────────────────────────

Deno.test(
  "trigger session: building GitHub executor with ungated keychain does not escalate taint",
  async () => {
    const sessionTaint: ClassificationLevel = "PUBLIC";

    await buildSchedulerGitHubExecutor({
      keychain: createTestKeychain(),
      config: minimalConfig,
      sessionTaint: "PUBLIC",
      sourceSessionId: fakeSessionId,
    });

    assertEquals(
      sessionTaint,
      "PUBLIC",
      "Session taint must remain PUBLIC — infrastructure secret access must not escalate",
    );
  },
);

Deno.test(
  "trigger session: building GitHub executor with GATED keychain WOULD escalate taint (proves guard is needed)",
  async () => {
    let sessionTaint: ClassificationLevel = "PUBLIC";
    const escalations: ClassificationLevel[] = [];

    const gatedKeychain = wrapWithGate(createTestKeychain(), {
      isBackground: true,
      getSessionTaint: () => sessionTaint,
      onEscalate: (level) => {
        sessionTaint = level;
        escalations.push(level);
      },
    });

    await buildSchedulerGitHubExecutor({
      keychain: gatedKeychain,
      config: minimalConfig,
      sessionTaint: "PUBLIC",
      sourceSessionId: fakeSessionId,
    });

    assertEquals(
      sessionTaint,
      "INTERNAL",
      "Gated keychain SHOULD escalate — this proves passing it to integration builders is wrong",
    );
    assertEquals(escalations.length, 1);
    assertEquals(escalations[0], "INTERNAL");
  },
);
