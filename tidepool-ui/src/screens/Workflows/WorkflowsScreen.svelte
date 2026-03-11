<script lang="ts">
  import { onMount } from "svelte";
  import WorkflowList from "./WorkflowList.svelte";
  import WorkflowDetail from "./WorkflowDetail.svelte";
  import RunCard from "./RunCard.svelte";
  import ScheduleDialog from "./ScheduleDialog.svelte";
  import {
    getWorkflows,
    getActiveRuns,
    requestWorkflowList,
    requestActiveRuns,
    requestWorkflowDetail,
    subscribeLive,
    unsubscribeLive,
  } from "../../lib/stores/workflows.svelte.js";
  import { onDestroy } from "svelte";

  let selectedName: string | null = $state(null);
  let schedulingName: string | null = $state(null);

  onMount(() => {
    requestWorkflowList();
    requestActiveRuns();
    subscribeLive();
  });

  onDestroy(() => {
    unsubscribeLive();
  });

  function handleSelect(name: string): void {
    selectedName = name;
    requestWorkflowDetail(name);
  }

  function handleSchedule(name: string): void {
    schedulingName = name;
  }
</script>

<div class="workflows-screen">
  <div class="wf-sidebar">
    <div class="sidebar-header">
      <h2>Workflows</h2>
    </div>
    <WorkflowList
      workflows={getWorkflows()}
      {selectedName}
      onselect={handleSelect}
      onschedule={handleSchedule}
    />
  </div>

  <div class="wf-main">
    {#if getActiveRuns().length > 0}
      <div class="runs-section">
        <h3 class="section-title">Active Runs</h3>
        <div class="runs-list">
          {#each getActiveRuns() as run (run.runId)}
            <RunCard {run} />
          {/each}
        </div>
      </div>
    {/if}

    <div class="detail-section">
      {#if selectedName}
        <WorkflowDetail name={selectedName} onschedule={handleSchedule} />
      {:else}
        <div class="detail-placeholder">
          <p>Select a workflow to view details</p>
        </div>
      {/if}
    </div>
  </div>
</div>

{#if schedulingName}
  <ScheduleDialog
    workflowName={schedulingName}
    onclose={() => schedulingName = null}
  />
{/if}

<style>
  .workflows-screen {
    height: 100%;
    display: flex;
  }

  .wf-sidebar {
    width: 300px;
    min-width: 240px;
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
  }

  .wf-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  .runs-section {
    border-bottom: 1px solid var(--border);
    padding: 16px;
    max-height: 250px;
    overflow-y: auto;
  }

  .section-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--fg3);
    margin-bottom: 8px;
  }

  .runs-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .detail-section {
    flex: 1;
    overflow: hidden;
  }

  .detail-placeholder {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg3);
  }
</style>
