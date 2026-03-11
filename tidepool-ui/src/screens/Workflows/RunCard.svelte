<script lang="ts">
  import type { WorkflowActiveRun } from "../../lib/types.js";
  import StatusDot from "../../lib/components/StatusDot.svelte";
  import TaintBadge from "../../lib/components/TaintBadge.svelte";
  import ContextMenu from "../../lib/components/ContextMenu.svelte";
  import { controlRun } from "../../lib/stores/workflows.svelte.js";
  import { formatAgo } from "../../lib/utils/formatTime.js";

  interface Props {
    run: WorkflowActiveRun;
  }

  let { run }: Props = $props();

  let ctxMenu: { x: number; y: number } | null = $state(null);

  const statusColor = $derived(
    run.status === "running" ? "green" as const
    : run.status === "paused" ? "yellow" as const
    : "red" as const,
  );

  const ctxItems = $derived(() => {
    const items: Array<{ label: string; action: () => void; danger?: boolean }> = [];
    if (run.status === "running") {
      items.push({ label: "Pause", action: () => controlRun(run.runId, "pause") });
    } else if (run.status === "paused") {
      items.push({ label: "Resume", action: () => controlRun(run.runId, "unpause") });
    }
    items.push({ label: "Stop", action: () => controlRun(run.runId, "stop"), danger: true });
    return items;
  });

  function handleContextMenu(e: MouseEvent): void {
    e.preventDefault();
    ctxMenu = { x: e.clientX, y: e.clientY };
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="run-card glass" oncontextmenu={handleContextMenu}>
  <div class="run-header">
    <StatusDot color={statusColor} breathing={run.status === "running"} />
    <span class="run-name">{run.workflowName}</span>
    {#if run.taint}
      <TaintBadge level={run.taint} small />
    {/if}
  </div>
  <div class="run-info">
    <span class="run-task">Task {run.currentTaskIndex + 1}: {run.currentTaskName}</span>
    <span class="run-time">{formatAgo(run.startedAt)}</span>
  </div>
  <div class="run-actions">
    {#if run.status === "running"}
      <button class="action-btn" onclick={() => controlRun(run.runId, "pause")}>Pause</button>
    {:else if run.status === "paused"}
      <button class="action-btn" onclick={() => controlRun(run.runId, "unpause")}>Resume</button>
    {/if}
    <button class="action-btn danger" onclick={() => controlRun(run.runId, "stop")}>Stop</button>
  </div>
</div>

{#if ctxMenu}
  <ContextMenu items={ctxItems()} x={ctxMenu.x} y={ctxMenu.y} onclose={() => ctxMenu = null} />
{/if}

<style>
  .run-card {
    padding: 12px;
    border-radius: var(--radius);
  }

  .run-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .run-name {
    font-weight: 500;
    flex: 1;
  }

  .run-info {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--fg2);
    margin-bottom: 8px;
  }

  .run-task {
    font-family: var(--font-mono);
    font-size: 11px;
  }

  .run-time {
    color: var(--fg3);
  }

  .run-actions {
    display: flex;
    gap: 6px;
  }

  .action-btn {
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 500;
    background: var(--bg4);
    color: var(--fg2);
  }

  .action-btn:hover {
    color: var(--fg);
    background: var(--accent-dim);
  }

  .danger:hover {
    background: rgba(255, 107, 138, 0.15);
    color: var(--status-red);
  }
</style>
