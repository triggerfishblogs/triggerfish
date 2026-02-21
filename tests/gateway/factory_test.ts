/**
 * Tests for gateway factory helpers — buildSchedulerConfig.
 */
import { assertEquals } from "@std/assert";
import { buildSchedulerConfig } from "../../src/gateway/factory.ts";
import type { TriggerFishConfig } from "../../src/core/config.ts";
import type { OrchestratorFactory } from "../../src/scheduler/service_types.ts";

function makeMockFactory(): OrchestratorFactory {
  return {
    create: async (_channelId: string, _opts?: unknown) => {
      await Promise.resolve();
      throw new Error("Not implemented in mock");
    },
  };
}

// ── buildSchedulerConfig: trigger classification_ceiling ─────────────────────

Deno.test("buildSchedulerConfig: trigger ceiling defaults to CONFIDENTIAL when not set", () => {
  const config: TriggerFishConfig = {};
  const result = buildSchedulerConfig(config, "/base", makeMockFactory());
  assertEquals(result.trigger.classificationCeiling, "CONFIDENTIAL");
});

Deno.test("buildSchedulerConfig: trigger ceiling defaults to CONFIDENTIAL when scheduler is empty", () => {
  const config: TriggerFishConfig = { scheduler: {} };
  const result = buildSchedulerConfig(config, "/base", makeMockFactory());
  assertEquals(result.trigger.classificationCeiling, "CONFIDENTIAL");
});

Deno.test("buildSchedulerConfig: trigger ceiling reads from YAML when explicitly set to INTERNAL", () => {
  const config: TriggerFishConfig = {
    scheduler: {
      trigger: {
        classification_ceiling: "INTERNAL",
      },
    },
  };
  const result = buildSchedulerConfig(config, "/base", makeMockFactory());
  assertEquals(result.trigger.classificationCeiling, "INTERNAL");
});

Deno.test("buildSchedulerConfig: trigger ceiling reads from YAML when explicitly set to CONFIDENTIAL", () => {
  const config: TriggerFishConfig = {
    scheduler: {
      trigger: {
        classification_ceiling: "CONFIDENTIAL",
      },
    },
  };
  const result = buildSchedulerConfig(config, "/base", makeMockFactory());
  assertEquals(result.trigger.classificationCeiling, "CONFIDENTIAL");
});

Deno.test("buildSchedulerConfig: trigger ceiling reads from YAML when explicitly set to RESTRICTED", () => {
  const config: TriggerFishConfig = {
    scheduler: {
      trigger: {
        classification_ceiling: "RESTRICTED",
      },
    },
  };
  const result = buildSchedulerConfig(config, "/base", makeMockFactory());
  assertEquals(result.trigger.classificationCeiling, "RESTRICTED");
});

Deno.test("buildSchedulerConfig: trigger enabled defaults to true", () => {
  const config: TriggerFishConfig = {};
  const result = buildSchedulerConfig(config, "/base", makeMockFactory());
  assertEquals(result.trigger.enabled, true);
});

Deno.test("buildSchedulerConfig: trigger interval defaults to 30 minutes", () => {
  const config: TriggerFishConfig = {};
  const result = buildSchedulerConfig(config, "/base", makeMockFactory());
  assertEquals(result.trigger.intervalMinutes, 30);
});

Deno.test("buildSchedulerConfig: interval_minutes 0 disables triggers", () => {
  const config: TriggerFishConfig = {
    scheduler: {
      trigger: {
        interval_minutes: 0,
      },
    },
  };
  const result = buildSchedulerConfig(config, "/base", makeMockFactory());
  assertEquals(result.trigger.enabled, false);
  assertEquals(result.trigger.intervalMinutes, 0);
});

Deno.test("buildSchedulerConfig: interval_minutes 0 disables triggers even when enabled is true", () => {
  const config: TriggerFishConfig = {
    scheduler: {
      trigger: {
        enabled: true,
        interval_minutes: 0,
      },
    },
  };
  const result = buildSchedulerConfig(config, "/base", makeMockFactory());
  assertEquals(result.trigger.enabled, false);
});
