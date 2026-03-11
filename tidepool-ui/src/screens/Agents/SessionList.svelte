<script lang="ts">
  import SessionCard from "./SessionCard.svelte";
  import TeamCard from "./TeamCard.svelte";
  import { getSessions, getTeams, getSelectedSessionId, selectSession } from "../../lib/stores/agents.svelte.js";
  import type { AgentSession } from "../../lib/types.js";

  const mainSessions = $derived(getSessions().filter((s) => s.group === "main"));
  const bgSessions = $derived(getSessions().filter((s) => s.group === "background"));
  const historySessions = $derived(getSessions().filter((s) => s.group === "history"));

  let teamsExpanded = $state(true);
  let historyExpanded = $state(false);
</script>

<div class="session-list">
  {#if mainSessions.length > 0}
    <div class="group-header">Active</div>
    {#each mainSessions as session (session.sessionId)}
      <SessionCard
        {session}
        selected={getSelectedSessionId() === session.sessionId}
        onclick={() => selectSession(session)}
      />
    {/each}
  {/if}

  {#if getTeams().length > 0}
    <button class="group-header collapsible" onclick={() => (teamsExpanded = !teamsExpanded)}>
      <span>{teamsExpanded ? "▼" : "▶"}</span> Teams
    </button>
    {#if teamsExpanded}
      {#each getTeams() as team (team.teamId)}
        <TeamCard {team} />
      {/each}
    {/if}
  {/if}

  {#if bgSessions.length > 0}
    <div class="group-header">Background</div>
    {#each bgSessions as session (session.sessionId)}
      <SessionCard
        {session}
        selected={getSelectedSessionId() === session.sessionId}
        onclick={() => selectSession(session)}
      />
    {/each}
  {/if}

  {#if historySessions.length > 0}
    <button class="group-header collapsible" onclick={() => (historyExpanded = !historyExpanded)}>
      <span>{historyExpanded ? "▼" : "▶"}</span> History
    </button>
    {#if historyExpanded}
      {#each historySessions as session (session.sessionId)}
        <SessionCard
          {session}
          selected={getSelectedSessionId() === session.sessionId}
          onclick={() => selectSession(session)}
        />
      {/each}
    {/if}
  {/if}

  {#if getSessions().length === 0 && getTeams().length === 0}
    <div class="empty">No sessions</div>
  {/if}
</div>

<style>
  .session-list {
    height: 100%;
    overflow-y: auto;
  }

  .group-header {
    padding: 8px 12px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--fg3);
    border-bottom: 1px solid var(--border);
    background: var(--bg2);
    position: sticky;
    top: 0;
    z-index: 1;
  }

  .collapsible {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    text-align: left;
  }

  .collapsible:hover {
    color: var(--fg2);
  }

  .empty {
    padding: 32px 16px;
    text-align: center;
    color: var(--fg3);
    font-size: 13px;
  }
</style>
