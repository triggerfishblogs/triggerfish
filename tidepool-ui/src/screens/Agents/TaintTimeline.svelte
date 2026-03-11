<script lang="ts">
  import type { TaintEvent } from "../../lib/types.js";
  import TaintBadge from "../../lib/components/TaintBadge.svelte";
  import { formatTime } from "../../lib/utils/formatTime.js";

  interface Props {
    events: TaintEvent[];
  }

  let { events }: Props = $props();
</script>

{#if events.length > 0}
  <div class="taint-timeline">
    <h4 class="timeline-title">Taint History</h4>
    {#each events as event}
      <div class="taint-event">
        <TaintBadge level={event.previous} small />
        <span class="taint-arrow">&rarr;</span>
        <TaintBadge level={event.current} small />
        <span class="taint-reason">{event.reason}</span>
        <span class="taint-time">{formatTime(event.timestamp)}</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .taint-timeline {
    padding: 12px 0;
  }

  .timeline-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--fg3);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }

  .taint-event {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 0;
    font-size: 12px;
  }

  .taint-arrow {
    color: var(--fg3);
  }

  .taint-reason {
    color: var(--fg2);
    flex: 1;
  }

  .taint-time {
    color: var(--fg3);
    font-size: 11px;
  }
</style>
