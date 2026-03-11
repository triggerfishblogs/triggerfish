<script lang="ts">
  import type { HealthCard } from "../../lib/types.js";
  import StatusDot from "../../lib/components/StatusDot.svelte";

  interface Props {
    card: HealthCard;
  }

  let { card }: Props = $props();

  const isHealthy = $derived(card.status === "green");
</script>

<div class="metric-card glass" class:healthy={isHealthy}>
  <div class="card-header">
    <StatusDot color={card.status} breathing={card.status !== "gray"} size={10} />
    <span class="card-label">{card.label}</span>
  </div>
  <div class="card-value" style:color="var(--status-{card.status})">
    {card.value}
  </div>
  {#if card.detail}
    <div class="card-detail">{card.detail}</div>
  {/if}
</div>

<style>
  .metric-card {
    padding: 20px;
    border-radius: var(--radius-lg);
    transition: transform var(--transition-normal);
  }

  .healthy {
    animation: float 6s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .card-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--fg2);
    text-transform: capitalize;
  }

  .card-value {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  .card-detail {
    font-size: 12px;
    color: var(--fg3);
  }
</style>
