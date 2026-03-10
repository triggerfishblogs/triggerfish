/**
 * Tidepool health snapshot provider.
 *
 * Assembles health metric cards from bootstrap config state
 * for the Tidepool health screen.
 *
 * @module
 */

import type { BootstrapResult } from "../bootstrap.ts";
import type { CoreInfraResult } from "../infra/core_infra.ts";
import type { HealthSnapshot } from "../../../tools/tidepool/screens/health.ts";
import type { HealthMetricCard } from "../../../tools/tidepool/screens/health.ts";
import type { StatusLevel } from "../../../tools/tidepool/components/status_dot.ts";
import { createLogger } from "../../../core/logger/mod.ts";

const log = createLogger("tidepool-health");

/** Create a health snapshot provider from available services. */
export function createHealthSnapshotProvider(
  coreInfra: CoreInfraResult,
  bootstrap: BootstrapResult,
): () => Promise<HealthSnapshot> {
  return async () => {
    const cards = await buildHealthCards(bootstrap, coreInfra);
    return {
      overall: deriveOverallStatus(cards),
      cards,
      timestamp: new Date().toISOString(),
    };
  };
}

/** Derive the overall status from the worst card status. */
function deriveOverallStatus(
  cards: readonly HealthMetricCard[],
): "HEALTHY" | "WARNING" | "CRITICAL" {
  if (cards.some((c) => c.status === "red")) return "CRITICAL";
  if (cards.some((c) => c.status === "yellow")) return "WARNING";
  return "HEALTHY";
}

/** Assemble all health metric cards. */
async function buildHealthCards(
  bootstrap: BootstrapResult,
  coreInfra: CoreInfraResult,
): Promise<HealthMetricCard[]> {
  const rawConfig = bootstrap.config as unknown as Record<string, unknown>;
  return [
    buildGatewayCard(rawConfig),
    buildLlmCard(bootstrap),
    await buildSessionsCard(coreInfra),
    buildChannelsCard(bootstrap),
    buildPolicyCard(bootstrap),
    buildSkillsCard(rawConfig),
    buildSecretsCard(),
    buildSecurityCard(rawConfig),
    buildSchedulerCard(bootstrap),
  ];
}

/** Gateway status card. */
function buildGatewayCard(
  rawConfig: Record<string, unknown>,
): HealthMetricCard {
  const port = (rawConfig.gateway as Record<string, unknown> | undefined)
    ?.port ?? 18789;
  return {
    id: "gateway",
    label: "Gateway",
    status: "green" as StatusLevel,
    value: "Running",
    detail: `Port ${port}`,
  };
}

/** LLM provider card. */
function buildLlmCard(bootstrap: BootstrapResult): HealthMetricCard {
  const provider = bootstrap.config.models?.primary;
  return {
    id: "llm",
    label: "LLM Provider",
    status: (provider ? "green" : "red") as StatusLevel,
    value: provider
      ? `${provider.provider}:${provider.model}`
      : "Not configured",
  };
}

/** Active sessions card with live count from session manager. */
async function buildSessionsCard(
  coreInfra: CoreInfraResult,
): Promise<HealthMetricCard> {
  let count = 1; // main session always exists
  if (coreInfra.enhancedSessionManager) {
    try {
      const managed = await coreInfra.enhancedSessionManager.sessionsList();
      count += managed.length;
    } catch (err: unknown) {
      log.warn("Session count retrieval failed for health card", {
        operation: "buildSessionsCard",
        err,
      });
    }
  }
  return {
    id: "sessions",
    label: "Sessions",
    status: "green" as StatusLevel,
    value: String(count),
  };
}

/** Channels card. */
function buildChannelsCard(bootstrap: BootstrapResult): HealthMetricCard {
  const channelKeys = Object.keys(bootstrap.config.channels ?? {});
  return {
    id: "channels",
    label: "Channels",
    status: (channelKeys.length > 0 ? "green" : "yellow") as StatusLevel,
    value: `${channelKeys.length} configured`,
  };
}

/** Policy card. */
function buildPolicyCard(bootstrap: BootstrapResult): HealthMetricCard {
  const classMode = bootstrap.config.classification?.mode;
  return {
    id: "policy",
    label: "Policy",
    status: "green" as StatusLevel,
    value: classMode ? `Mode: ${classMode}` : "Default",
  };
}

/** Skills card. */
function buildSkillsCard(
  rawConfig: Record<string, unknown>,
): HealthMetricCard {
  const skillsObj = rawConfig.skills as Record<string, unknown> | undefined;
  const skillCount = Array.isArray(skillsObj?.installed)
    ? (skillsObj!.installed as unknown[]).length
    : 0;
  return {
    id: "skills",
    label: "Skills",
    status: "green" as StatusLevel,
    value: `${skillCount} installed`,
  };
}

/** Secrets card. */
function buildSecretsCard(): HealthMetricCard {
  return {
    id: "secrets",
    label: "Secrets",
    status: "green" as StatusLevel,
    value: "Keychain",
  };
}

/** Security card. */
function buildSecurityCard(
  rawConfig: Record<string, unknown>,
): HealthMetricCard {
  const securityObj = rawConfig.security as
    | Record<string, unknown>
    | undefined;
  const dmPolicy = securityObj?.dmPolicy as string | undefined;
  return {
    id: "security",
    label: "Security",
    status: "green" as StatusLevel,
    value: dmPolicy ? `DM: ${dmPolicy}` : "Default",
  };
}

/** Scheduler card. */
function buildSchedulerCard(bootstrap: BootstrapResult): HealthMetricCard {
  const trigger = bootstrap.config.scheduler?.trigger;
  return {
    id: "cron",
    label: "Scheduler",
    status: (trigger?.enabled ? "green" : "yellow") as StatusLevel,
    value: trigger?.enabled
      ? `Trigger every ${trigger.interval_minutes ?? 30}m`
      : "Disabled",
  };
}
