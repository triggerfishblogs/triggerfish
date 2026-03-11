<script lang="ts">
  import type { AgentSession } from "../../lib/types.js";
  import { classificationColor } from "../../lib/types.js";
  import StatusDot from "../../lib/components/StatusDot.svelte";
  import TaintBadge from "../../lib/components/TaintBadge.svelte";
  import { formatAgo } from "../../lib/utils/formatTime.js";

  interface Props {
    session: AgentSession;
    selected: boolean;
    onclick: () => void;
  }

  let { session, selected, onclick }: Props = $props();

  const borderColor = $derived(classificationColor(session.taint));
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="session-card"
  class:selected
  style:border-left-color={borderColor}
  {onclick}
>
  <div class="card-top">
    <StatusDot color={session.status} size={8} />
    <span class="card-label">{session.label}</span>
  </div>
  {#if session.model}
    <span class="card-model">{session.model}</span>
  {/if}
  {#if session.lastOutput}
    <p class="card-output">{session.lastOutput}</p>
  {/if}
  <div class="card-bottom">
    <TaintBadge level={session.taint} small />
    {#if session.lastActivity}
      <span class="card-time">{formatAgo(session.lastActivity)}</span>
    {/if}
  </div>
</div>

<style>
  .session-card {
    padding: 10px 12px;
    border-left: 3px solid transparent;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition:
      background var(--transition-fast),
      transform var(--transition-fast);
  }

  .session-card:hover {
    background: var(--bg3);
    transform: translateY(-1px);
  }

  .selected {
    background: var(--bg3);
    box-shadow: inset 0 0 12px var(--accent-dim);
  }

  .card-top {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  .card-label {
    font-weight: 500;
    font-size: 13px;
    color: var(--fg);
  }

  .card-model {
    font-size: 11px;
    color: var(--fg3);
    font-family: var(--font-mono);
    display: block;
    margin-bottom: 4px;
  }

  .card-output {
    font-size: 12px;
    color: var(--fg2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-bottom: 6px;
  }

  .card-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .card-time {
    font-size: 10px;
    color: var(--fg3);
  }
</style>
