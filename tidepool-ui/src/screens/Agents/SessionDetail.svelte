<script lang="ts">
  import type { AgentSession } from "../../lib/types.js";
  import { classificationColor } from "../../lib/types.js";
  import TaintBadge from "../../lib/components/TaintBadge.svelte";
  import StatusDot from "../../lib/components/StatusDot.svelte";
  import TaintTimeline from "./TaintTimeline.svelte";
  import { terminateSession, deselectSession } from "../../lib/stores/agents.svelte.js";
  import { formatTime } from "../../lib/utils/formatTime.js";
  import Icon from "../../lib/components/Icon.svelte";

  interface Props {
    session: AgentSession;
  }

  let { session }: Props = $props();

  const taintColor = $derived(classificationColor(session.taint));
</script>

<div class="session-detail">
  <div class="detail-header" style:background="linear-gradient(135deg, {taintColor}15, transparent)">
    <button class="back-btn" onclick={deselectSession}>
      <Icon name="back" size={16} />
    </button>
    <div class="detail-title">
      <StatusDot color={session.status} size={10} breathing />
      <h3>{session.label}</h3>
    </div>
    <TaintBadge level={session.taint} />
  </div>

  <div class="detail-meta">
    {#if session.role}
      <div class="meta-item">
        <span class="meta-label">Role</span>
        <span class="meta-value">{session.role}</span>
      </div>
    {/if}
    {#if session.model}
      <div class="meta-item">
        <span class="meta-label">Model</span>
        <span class="meta-value">{session.model}</span>
      </div>
    {/if}
    {#if session.channel}
      <div class="meta-item">
        <span class="meta-label">Channel</span>
        <span class="meta-value">{session.channel}</span>
      </div>
    {/if}
    {#if session.createdAt}
      <div class="meta-item">
        <span class="meta-label">Created</span>
        <span class="meta-value">{formatTime(session.createdAt)}</span>
      </div>
    {/if}
  </div>

  {#if session.group === "background"}
    <div class="detail-actions">
      <button class="terminate-btn" onclick={() => terminateSession(session.sessionId)}>
        Terminate
      </button>
    </div>
  {/if}

  {#if session.taintHistory}
    <TaintTimeline events={session.taintHistory} />
  {/if}
</div>

<style>
  .session-detail {
    height: 100%;
    overflow-y: auto;
  }

  .detail-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid var(--border);
  }

  .back-btn {
    color: var(--fg3);
    padding: 4px;
  }

  .back-btn:hover {
    color: var(--fg);
  }

  .detail-title {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .detail-title h3 {
    font-size: 16px;
    font-weight: 600;
  }

  .detail-meta {
    padding: 12px 16px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    border-bottom: 1px solid var(--border);
  }

  .meta-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .meta-label {
    font-size: 11px;
    color: var(--fg3);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .meta-value {
    font-size: 13px;
    color: var(--fg);
  }

  .detail-actions {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
  }

  .terminate-btn {
    padding: 6px 12px;
    border-radius: var(--radius);
    background: rgba(255, 107, 138, 0.15);
    color: var(--status-red);
    font-size: 13px;
    font-weight: 500;
  }

  .terminate-btn:hover {
    background: rgba(255, 107, 138, 0.25);
  }
</style>
