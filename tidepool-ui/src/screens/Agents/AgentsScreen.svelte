<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import SessionList from "./SessionList.svelte";
  import SessionDetail from "./SessionDetail.svelte";
  import { requestSessionList, getSelectedSession } from "../../lib/stores/agents.svelte.js";

  onMount(() => {
    requestSessionList();
  });
</script>

<div class="agents-screen">
  <div class="agents-sidebar">
    <div class="sidebar-header">
      <h2>Agents</h2>
    </div>
    <SessionList />
  </div>
  <div class="agents-detail">
    {#if getSelectedSession()}
      <SessionDetail session={getSelectedSession()!} />
    {:else}
      <div class="detail-placeholder">
        <p>Select a session to view details</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .agents-screen {
    height: 100%;
    display: flex;
  }

  .agents-sidebar {
    width: 320px;
    min-width: 280px;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    background: var(--bg2);
  }

  .sidebar-header {
    padding: 16px;
    border-bottom: 1px solid var(--border);
  }

  .sidebar-header h2 {
    font-size: 16px;
    font-weight: 600;
    color: var(--fg);
  }

  .agents-detail {
    flex: 1;
    min-width: 0;
  }

  .detail-placeholder {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg3);
    font-size: 14px;
  }
</style>
