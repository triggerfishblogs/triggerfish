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
import type {
  HealthMetricCard,
  HealthSnapshot,
  TimeSeriesPoint,
} from "../../../tools/tidepool/screens/health.ts";
import type { StatusLevel } from "../../../tools/tidepool/components/status_dot.ts";
import { createLogger } from "../../../core/logger/mod.ts";

const log = createLogger("tidepool-health");

/** Max data points retained per series (~2h at 60s intervals). */
const MAX_POINTS = 120;

/** In-memory ring buffer for time-series data. */
interface SeriesBuffer {
  readonly id: string;
  readonly label: string;
  readonly points: TimeSeriesPoint[];
}

/** Push a value into a ring-buffered series. */
function pushPoint(buf: SeriesBuffer, value: number): void {
  buf.points.push({ t: new Date().toISOString(), v: value });
  if (buf.points.length > MAX_POINTS) {
    buf.points.splice(0, buf.points.length - MAX_POINTS);
  }
}

/** Create a health snapshot provider from available services. */
export function createHealthSnapshotProvider(
  coreInfra: CoreInfraResult,
  bootstrap: BootstrapResult,
): () => Promise<HealthSnapshot> {
  const agentsSeries: SeriesBuffer = {
    id: "agents",
    label: "Active Agents",
    points: [],
  };
  const cronSeries: SeriesBuffer = {
    id: "cron_jobs",
    label: "Cron Jobs",
    points: [],
  };
  const memorySeries: SeriesBuffer = {
    id: "heap_mb",
    label: "Heap (MB)",
    points: [],
  };

  return async () => {
    const sessionCount = await countSessions(coreInfra);
    const cards = buildHealthCards(bootstrap, coreInfra, sessionCount);
    pushPoint(agentsSeries, sessionCount);

    const cronCount = coreInfra.schedulerService.cronManager.list()
      .filter((j) => j.enabled).length;
    pushPoint(cronSeries, cronCount);

    const heapMb = Math.round(Deno.memoryUsage().heapUsed / 1_048_576);
    pushPoint(memorySeries, heapMb);

    return {
      overall: deriveOverallStatus(cards),
      cards,
      timeSeries: [agentsSeries, cronSeries, memorySeries].map((s) => ({
        id: s.id,
        label: s.label,
        points: [...s.points],
      })),
      timestamp: new Date().toISOString(),
    };
  };
}

/** Count active sessions (main + managed). */
async function countSessions(coreInfra: CoreInfraResult): Promise<number> {
  let count = 1;
  if (coreInfra.enhancedSessionManager) {
    try {
      const managed = await coreInfra.enhancedSessionManager.sessionsList();
      count += managed.length;
    } catch (err: unknown) {
      log.warn("Session count retrieval failed for time-series", {
        operation: "countSessions",
        err,
      });
    }
  }
  return count;
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
function buildHealthCards(
  bootstrap: BootstrapResult,
  coreInfra: CoreInfraResult,
  sessionCount: number,
): HealthMetricCard[] {
  const rawConfig = bootstrap.config as unknown as Record<string, unknown>;
  return [
    buildGatewayCard(rawConfig),
    buildUptimeCard(),
    buildMemoryCard(),
    buildLlmCard(bootstrap),
    buildSessionsCard(sessionCount),
    buildChannelsCard(bootstrap),
    buildSkillsCard(rawConfig),
    buildSecretsCard(),
    buildSecurityCard(rawConfig),
    buildCronCard(coreInfra),
    buildTriggerCard(bootstrap),
    buildWebhooksCard(bootstrap),
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

/** Active sessions card using a pre-computed count. */
function buildSessionsCard(sessionCount: number): HealthMetricCard {
  return {
    id: "sessions",
    label: "Sessions",
    status: "green" as StatusLevel,
    value: String(sessionCount),
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

/** Daemon uptime card. */
function buildUptimeCard(): HealthMetricCard {
  const uptimeSec = Math.floor(performance.now() / 1000);
  return {
    id: "uptime",
    label: "Uptime",
    status: "green" as StatusLevel,
    value: formatUptime(uptimeSec),
  };
}

/** Format seconds into a human-readable uptime string. */
function formatUptime(totalSec: number): string {
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Memory usage card. */
function buildMemoryCard(): HealthMetricCard {
  const mem = Deno.memoryUsage();
  const heapMb = (mem.heapUsed / 1_048_576).toFixed(0);
  const rssMb = (mem.rss / 1_048_576).toFixed(0);
  const status: StatusLevel = mem.heapUsed > 512 * 1_048_576
    ? "red"
    : mem.heapUsed > 256 * 1_048_576
    ? "yellow"
    : "green";
  return {
    id: "memory",
    label: "Memory",
    status,
    value: `${heapMb} MB`,
    detail: `RSS ${rssMb} MB`,
  };
}

/** Cron jobs card. */
function buildCronCard(coreInfra: CoreInfraResult): HealthMetricCard {
  const jobs = coreInfra.schedulerService.cronManager.list();
  const activeJobs = jobs.filter((j) => j.enabled);
  return {
    id: "cron",
    label: "Cron Jobs",
    status: "green" as StatusLevel,
    value: `${activeJobs.length} active`,
    detail: jobs.length !== activeJobs.length
      ? `${jobs.length - activeJobs.length} paused`
      : undefined,
  };
}

/** Trigger card. */
function buildTriggerCard(bootstrap: BootstrapResult): HealthMetricCard {
  const trigger = bootstrap.config.scheduler?.trigger;
  const enabled = (trigger?.enabled ?? true) &&
    (trigger?.interval_minutes ?? 30) !== 0;
  const interval = trigger?.interval_minutes ?? 30;
  return {
    id: "triggers",
    label: "Triggers",
    status: (enabled ? "green" : "yellow") as StatusLevel,
    value: enabled ? `Every ${interval}m` : "Disabled",
  };
}

/** Webhooks card. */
function buildWebhooksCard(bootstrap: BootstrapResult): HealthMetricCard {
  const webhooks = bootstrap.config.scheduler?.webhooks;
  const enabled = webhooks?.enabled ?? false;
  const sourceCount = Object.keys(webhooks?.sources ?? {}).length;
  return {
    id: "webhooks",
    label: "Webhooks",
    status: (enabled ? "green" : "gray") as StatusLevel,
    value: enabled
      ? `${sourceCount} source${sourceCount !== 1 ? "s" : ""}`
      : "Disabled",
  };
}
