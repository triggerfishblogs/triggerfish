<script lang="ts">
  import type { WorkflowListEntry } from "../../lib/types.js";
  import TaintBadge from "../../lib/components/TaintBadge.svelte";
  import ContextMenu from "../../lib/components/ContextMenu.svelte";
  import {
    startWorkflow,
    deleteWorkflow,
  } from "../../lib/stores/workflows.svelte.js";
  import { formatAgo } from "../../lib/utils/formatTime.js";

  interface Props {
    workflows: WorkflowListEntry[];
    selectedName: string | null;
    onselect: (name: string) => void;
    onschedule?: (name: string) => void;
  }

  let { workflows, selectedName, onselect, onschedule }: Props = $props();

  let ctxMenu: { x: number; y: number; name: string } | null = $state(null);

  function handleContextMenu(e: MouseEvent, name: string): void {
    e.preventDefault();
    ctxMenu = { x: e.clientX, y: e.clientY, name };
  }

  const ctxItems = $derived(() => {
    if (!ctxMenu) return [];
    const wfName = ctxMenu.name;
    return [
      { label: "Run Now", action: () => startWorkflow(wfName) },
      {
        label: "Schedule\u2026",
        action: () => { if (onschedule) onschedule(wfName); },
      },
      {
        label: "View Definition",
        action: () => onselect(wfName),
      },
      { label: "Delete", action: () => deleteWorkflow(wfName), danger: true },
    ];
  });
</script>

<div class="workflow-list">
  {#each workflows as wf (wf.name)}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="wf-item"
      class:selected={selectedName === wf.name}
      onclick={() => onselect(wf.name)}
      oncontextmenu={(e) => handleContextMenu(e, wf.name)}
    >
      <div class="wf-top">
        <span class="wf-name">{wf.name}</span>
        <TaintBadge level={wf.classification} small />
      </div>
      {#if wf.description}
        <p class="wf-desc">{wf.description}</p>
      {/if}
      <span class="wf-time">Saved {formatAgo(wf.savedAt)}</span>
    </div>
  {/each}
  {#if workflows.length === 0}
    <div class="empty">No saved workflows</div>
  {/if}
</div>

{#if ctxMenu}
  <ContextMenu items={ctxItems()} x={ctxMenu.x} y={ctxMenu.y} onclose={() => ctxMenu = null} />
{/if}

<style>
  .workflow-list {
    overflow-y: auto;
    flex: 1;
  }

  .wf-item {
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .wf-item:hover {
    background: var(--bg3);
  }

  .selected {
    background: var(--bg3);
    box-shadow: inset 3px 0 0 var(--accent);
  }

  .wf-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 4px;
  }

  .wf-name {
    font-weight: 500;
    font-size: 13px;
  }

  .wf-desc {
    font-size: 12px;
    color: var(--fg2);
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .wf-time {
    font-size: 10px;
    color: var(--fg3);
  }

  .empty {
    padding: 32px 16px;
    text-align: center;
    color: var(--fg3);
  }
</style>
