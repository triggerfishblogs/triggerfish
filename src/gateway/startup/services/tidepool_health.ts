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

/** Create a health snapshot provider from available services. */
export function createHealthSnapshotProvider(
  _coreInfra: CoreInfraResult,
  bootstrap: BootstrapResult,
): () => Promise<HealthSnapshot> {
  // deno-lint-ignore require-await
  return async () => {
    const cards = buildHealthCards(bootstrap);
    const hasRed = cards.some((c) => c.status === "red");
    const hasYellow = cards.some((c) => c.status === "yellow");
    const overall = hasRed
      ? "CRITICAL" as const
      : hasYellow
        ? "WARNING" as const
        : "HEALTHY" as const;

    return { overall, cards, timestamp: new Date().toISOString() };
  };
}

/** Assemble health metric cards from config state. */
function buildHealthCards(
  bootstrap: BootstrapResult,
): HealthMetricCard[] {
  const cards: HealthMetricCard[] = [];
  const rawConfig = bootstrap.config as unknown as Record<string, unknown>;

  cards.push({
    id: "gateway",
    label: "Gateway",
    status: "green" as StatusLevel,
    value: "Running",
    detail: "Port 18789",
  });

  const provider = bootstrap.config.models?.primary;
  cards.push({
    id: "llm",
    label: "LLM Provider",
    status: (provider ? "green" : "red") as StatusLevel,
    value: provider
      ? `${provider.provider}:${provider.model}`
      : "Not configured",
  });

  cards.push({
    id: "sessions",
    label: "Sessions",
    status: "green" as StatusLevel,
    value: "1",
  });

  const channelKeys = Object.keys(bootstrap.config.channels ?? {});
  cards.push({
    id: "channels",
    label: "Channels",
    status: (channelKeys.length > 0 ? "green" : "yellow") as StatusLevel,
    value: `${channelKeys.length} configured`,
  });

  const classMode = bootstrap.config.classification?.mode;
  cards.push({
    id: "policy",
    label: "Policy",
    status: "green" as StatusLevel,
    value: classMode ? `Mode: ${classMode}` : "Default",
  });

  const skillsObj = rawConfig.skills as Record<string, unknown> | undefined;
  const skillCount = Array.isArray(skillsObj?.installed)
    ? (skillsObj!.installed as unknown[]).length
    : 0;
  cards.push({
    id: "skills",
    label: "Skills",
    status: "green" as StatusLevel,
    value: `${skillCount} installed`,
  });

  cards.push({
    id: "secrets",
    label: "Secrets",
    status: "green" as StatusLevel,
    value: "Keychain",
  });

  const securityObj = rawConfig.security as
    | Record<string, unknown>
    | undefined;
  const dmPolicy = securityObj?.dmPolicy as string | undefined;
  cards.push({
    id: "security",
    label: "Security",
    status: "green" as StatusLevel,
    value: dmPolicy ? `DM: ${dmPolicy}` : "Default",
  });

  const trigger = bootstrap.config.scheduler?.trigger;
  cards.push({
    id: "cron",
    label: "Scheduler",
    status: (trigger?.enabled ? "green" : "yellow") as StatusLevel,
    value: trigger?.enabled
      ? `Trigger every ${trigger.interval_minutes ?? 30}m`
      : "Disabled",
  });

  return cards;
}
