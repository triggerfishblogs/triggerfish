<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import MetricCard from "./MetricCard.svelte";
  import SparkChart from "./SparkChart.svelte";
  import StatusDot from "../../lib/components/StatusDot.svelte";
  import Icon from "../../lib/components/Icon.svelte";
  import {
    getOverallStatus,
    getCards,
    getTimeSeries,
    requestSnapshot,
    subscribeLive,
    unsubscribeLive,
  } from "../../lib/stores/health.svelte.js";
  import type {
    HealthCard,
    HealthStatus,
    StatusColor,
    TimeSeries,
  } from "../../lib/types.js";

  let overallStatus: HealthStatus = $state("HEALTHY");
  let cards: HealthCard[] = $state([]);
  let timeSeries: TimeSeries[] = $state([]);
  let spinning = $state(false);
  let pollTimer: ReturnType<typeof setInterval> | undefined;

  $effect(() => {
    overallStatus = getOverallStatus();
  });

  $effect(() => {
    cards = getCards();
  });

  $effect(() => {
    timeSeries = getTimeSeries();
  });

  const overallColor: StatusColor = $derived(
    overallStatus === "HEALTHY"
      ? "green"
      : overallStatus === "WARNING"
        ? "yellow"
        : "red",
  );

  const CHART_COLORS: Record<string, string> = {
    agents: "var(--accent)",
    cron_jobs: "var(--taint-internal)",
    heap_mb: "#FF9E64",
  };

  function handleRefresh(): void {
    spinning = true;
    requestSnapshot();
    setTimeout(() => (spinning = false), 600);
  }

  onMount(() => {
    requestSnapshot();
    subscribeLive();
    pollTimer = setInterval(() => requestSnapshot(), 60_000);
  });

  onDestroy(() => {
    unsubscribeLive();
    if (pollTimer) clearInterval(pollTimer);
  });
</script>

<div class="health-screen">
  <div class="health-status-bar glass">
    <div class="status-left">
      <StatusDot color={overallColor} breathing size={12} />
      <span class="overall-label">{overallStatus}</span>
    </div>
    <button
      class="refresh-btn"
      class:spinning
      onclick={handleRefresh}
      title="Refresh"
    >
      <Icon name="refresh" size={16} />
    </button>
  </div>

  <div class="health-body">
    <div class="health-cards">
      {#each cards as card (card.cardId)}
        <MetricCard {card} />
      {/each}
      {#if cards.length === 0}
        <div class="empty">Loading health data...</div>
      {/if}
    </div>

    {#if timeSeries.length > 0}
      <div class="charts-section">
        <h3 class="section-title">Activity</h3>
        <div class="charts-grid">
          {#each timeSeries as series (series.id)}
            <SparkChart
              label={series.label}
              points={series.points}
              color={CHART_COLORS[series.id] ?? "var(--accent)"}
            />
          {/each}
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .health-screen {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .health-status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 20px;
    border-bottom: 1px solid var(--border);
    border-radius: 0;
    flex-shrink: 0;
  }

  .status-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .overall-label {
    font-weight: 600;
    font-size: 15px;
  }

  .refresh-btn {
    color: var(--fg3);
    padding: 6px;
    border-radius: var(--radius);
    transition: transform 0.6s ease;
  }

  .refresh-btn:hover {
    color: var(--accent);
    background: var(--accent-dim);
  }

  .spinning {
    transform: rotate(360deg);
  }

  .health-body {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 28px;
  }

  .health-cards {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    align-content: start;
  }

  .section-title {
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: var(--fg3);
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border);
  }

  .charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    max-width: calc(320px * 3 + 16px * 2 + 40px);
    gap: 16px;
  }

  .empty {
    grid-column: 1 / -1;
    text-align: center;
    color: var(--fg3);
    padding: 32px;
  }
</style>
