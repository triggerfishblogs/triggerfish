<script lang="ts">
  import Icon from "../../lib/components/Icon.svelte";
  import TaintBadge from "../../lib/components/TaintBadge.svelte";
  import HexLoader from "../../lib/components/HexLoader.svelte";
  import {
    getWorkflowDetail,
    startWorkflow,
    deleteWorkflow,
  } from "../../lib/stores/workflows.svelte.js";
  import type { ClassificationLevel } from "../../lib/types.js";

  interface Props {
    name: string;
    onschedule?: (name: string) => void;
  }

  let { name, onschedule }: Props = $props();

  const detail = $derived(getWorkflowDetail());
  const isLoaded = $derived(detail?.name === name && detail?.found !== false);
  const notFound = $derived(detail?.name === name && detail?.found === false);
  const description = $derived((detail?.description as string) ?? "");
  const classification = $derived(
    (detail?.classification as string) ?? "PUBLIC",
  );
  const yaml = $derived((detail?.yaml as string) ?? "");
  const tasks = $derived(
    (detail?.tasks as Array<{ name: string; tool: string }>) ?? [],
  );
</script>

<div class="workflow-detail">
  <div class="detail-header">
    <h3>{name}</h3>
    {#if isLoaded}
      <TaintBadge level={classification as ClassificationLevel} />
    {/if}
  </div>

  {#if notFound}
    <div class="not-found">Workflow not found</div>
  {:else if isLoaded}
    {#if description}
      <p class="detail-desc">{description}</p>
    {/if}
    {#if tasks.length > 0}
      <div class="tasks-section">
        <h4>Tasks ({tasks.length})</h4>
        {#each tasks as task, i}
          <div class="task-item">
            <span class="task-num">{i + 1}</span>
            <span class="task-name">{task.name}</span>
            {#if task.tool}
              <code class="task-tool">{task.tool}</code>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
    {#if yaml}
      <div class="yaml-section">
        <h4>Definition</h4>
        <pre class="yaml-block"><code>{yaml}</code></pre>
      </div>
    {/if}
    <div class="detail-actions">
      <button class="run-btn" onclick={() => startWorkflow(name)}>
        <Icon name="play" size={14} /> Run Workflow
      </button>
      <button
        class="schedule-btn"
        onclick={() => { if (onschedule) onschedule(name); }}
      >
        <Icon name="refresh" size={14} /> Schedule
      </button>
      <button class="delete-btn" onclick={() => deleteWorkflow(name)}>
        <Icon name="trash" size={14} /> Delete
      </button>
    </div>
  {:else}
    <div class="loading">
      <HexLoader />
    </div>
  {/if}
</div>

<style>
  .workflow-detail {
    padding: 16px;
    overflow-y: auto;
    height: 100%;
  }

  .not-found {
    padding: 32px;
    text-align: center;
    color: var(--fg3);
  }

  .loading {
    padding: 32px;
    display: flex;
    justify-content: center;
  }

  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .detail-header h3 {
    font-size: 18px;
    font-weight: 600;
  }

  .detail-desc {
    color: var(--fg2);
    margin-bottom: 16px;
    line-height: 1.6;
  }

  .tasks-section {
    margin-bottom: 16px;
  }

  .tasks-section h4,
  .yaml-section h4 {
    font-size: 13px;
    font-weight: 600;
    color: var(--fg3);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }

  .task-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 0;
    border-bottom: 1px solid var(--border);
    font-size: 13px;
  }

  .task-num {
    width: 20px;
    text-align: center;
    color: var(--fg3);
    font-size: 11px;
  }

  .task-name {
    flex: 1;
  }

  .task-tool {
    font-size: 11px;
    color: var(--accent);
    background: var(--accent-dim);
    padding: 1px 6px;
    border-radius: 3px;
  }

  .yaml-section {
    margin-bottom: 16px;
  }

  .yaml-block {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px;
    overflow-x: auto;
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.5;
    color: var(--fg);
    white-space: pre;
  }

  .detail-actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .run-btn,
  .schedule-btn,
  .delete-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: var(--radius);
    font-weight: 600;
    font-size: 13px;
  }

  .run-btn {
    background: var(--accent);
    color: var(--bg);
  }

  .run-btn:hover {
    opacity: 0.9;
  }

  .schedule-btn {
    background: var(--bg4);
    color: var(--fg);
  }

  .schedule-btn:hover {
    background: var(--accent-dim);
    color: var(--accent);
  }

  .delete-btn {
    background: var(--bg4);
    color: var(--fg2);
  }

  .delete-btn:hover {
    background: rgba(255, 107, 138, 0.15);
    color: var(--status-red);
  }
</style>
