import { assertEquals } from "@std/assert";
import { triageIntervention } from "../../../src/gateway/healing/intervention_triage.ts";
import type { SelfHealingConfig } from "../../../src/core/types/healing.ts";

const DEFAULT_CONFIG: SelfHealingConfig = {
  enabled: true,
  pause_on_intervention: "blocking_only",
  pause_timeout_seconds: 300,
  pause_timeout_policy: "escalate_and_halt",
  retry_budget: 3,
  approval_required: true,
  notify_on: [],
  run_history_window: 10,
};

Deno.test("triageIntervention: transient_retry for network errors", () => {
  const result = triageIntervention({
    errorMessage: "ECONNREFUSED: connection refused",
    retryCount: 0,
    config: DEFAULT_CONFIG,
  });
  assertEquals(result, "transient_retry");
});

Deno.test("triageIntervention: transient_retry for rate limit", () => {
  const result = triageIntervention({
    errorMessage: "HTTP 429 rate limit exceeded",
    retryCount: 0,
    config: DEFAULT_CONFIG,
  });
  assertEquals(result, "transient_retry");
});

Deno.test("triageIntervention: transient_retry for 503", () => {
  const result = triageIntervention({
    errorMessage: "HTTP 503 service unavailable",
    retryCount: 0,
    config: DEFAULT_CONFIG,
  });
  assertEquals(result, "transient_retry");
});

Deno.test("triageIntervention: transient_retry for timeout", () => {
  const result = triageIntervention({
    errorMessage: "Request timeout after 30s",
    retryCount: 0,
    config: DEFAULT_CONFIG,
  });
  assertEquals(result, "transient_retry");
});

Deno.test("triageIntervention: plugin_gap for auth errors", () => {
  const result = triageIntervention({
    errorMessage: "HTTP 401 authentication required",
    retryCount: 0,
    config: DEFAULT_CONFIG,
  });
  assertEquals(result, "plugin_gap");
});

Deno.test("triageIntervention: plugin_gap for token expired", () => {
  const result = triageIntervention({
    errorMessage: "token expired, please re-authenticate",
    retryCount: 0,
    config: DEFAULT_CONFIG,
  });
  assertEquals(result, "plugin_gap");
});

Deno.test("triageIntervention: structural_fix for recurring failures", () => {
  const result = triageIntervention({
    errorMessage: "unexpected field format in response",
    retryCount: 0,
    config: DEFAULT_CONFIG,
    historicalFailureCount: 3,
  });
  assertEquals(result, "structural_fix");
});

Deno.test("triageIntervention: runtime_workaround for first unknown failure", () => {
  const result = triageIntervention({
    errorMessage: "unexpected data format",
    retryCount: 0,
    config: DEFAULT_CONFIG,
    historicalFailureCount: 0,
  });
  assertEquals(result, "runtime_workaround");
});

Deno.test("triageIntervention: unresolvable when budget exhausted", () => {
  const result = triageIntervention({
    errorMessage: "ECONNREFUSED: connection refused",
    retryCount: 3,
    config: DEFAULT_CONFIG,
  });
  assertEquals(result, "unresolvable");
});

Deno.test("triageIntervention: structural_fix for non-first retry of unknown error", () => {
  const result = triageIntervention({
    errorMessage: "unexpected data format",
    retryCount: 1,
    config: DEFAULT_CONFIG,
    historicalFailureCount: 0,
  });
  assertEquals(result, "structural_fix");
});
