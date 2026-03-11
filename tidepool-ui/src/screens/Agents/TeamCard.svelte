<script lang="ts">
  import type { AgentTeam } from "../../lib/types.js";
  import StatusDot from "../../lib/components/StatusDot.svelte";
  import TaintBadge from "../../lib/components/TaintBadge.svelte";
  import SessionCard from "./SessionCard.svelte";
  import { selectSession, getSelectedSessionId } from "../../lib/stores/agents.svelte.js";

  interface Props {
    team: AgentTeam;
  }

  let { team }: Props = $props();

  let expanded = $state(true);
</script>

<div class="team-card">
  <button class="team-header" onclick={() => (expanded = !expanded)}>
    <span class="team-toggle">{expanded ? "▼" : "▶"}</span>
    <StatusDot color={team.status} size={8} />
    <span class="team-name">{team.name}</span>
    <TaintBadge level={team.taint} small />
  </button>
  {#if expanded}
    <div class="team-members">
      {#each team.members as member (member.sessionId)}
        <SessionCard
          session={member}
          selected={getSelectedSessionId() === member.sessionId}
          onclick={() => selectSession(member)}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .team-card {
    border-bottom: 1px solid var(--border);
  }

  .team-header {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 8px 12px;
    text-align: left;
    color: var(--fg2);
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .team-header:hover {
    background: var(--bg3);
  }

  .team-toggle {
    font-size: 10px;
    width: 12px;
  }

  .team-name {
    flex: 1;
  }

  .team-members {
    border-left: 2px solid var(--border);
    margin-left: 12px;
  }
</style>
