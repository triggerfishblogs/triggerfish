<script lang="ts">
  import type { RunTreeNode } from "../../lib/types.js";

  interface Props {
    nodes: RunTreeNode[];
  }

  let { nodes }: Props = $props();

  function statusIcon(status: RunTreeNode["status"]): string {
    switch (status) {
      case "completed": return "&#10003;";
      case "running": return "&#9654;";
      case "failed": return "&#10007;";
      case "skipped": return "&#8212;";
      default: return "&#9675;";
    }
  }

  function statusClass(status: RunTreeNode["status"]): string {
    return status;
  }
</script>

<div class="execution-tree">
  {#each nodes as node, i}
    <div class="tree-node {statusClass(node.status)}">
      <div class="tree-line-container">
        {#if i > 0}
          <div class="tree-line-up"></div>
        {/if}
        <div class="tree-dot">
          {@html statusIcon(node.status)}
        </div>
        {#if i < nodes.length - 1}
          <div class="tree-line-down"></div>
        {/if}
      </div>
      <div class="tree-content">
        <span class="tree-index">Task {node.taskIndex + 1}</span>
        <span class="tree-name">{node.taskName}</span>
      </div>
    </div>
  {/each}
</div>

<style>
  .execution-tree {
    display: flex;
    flex-direction: column;
    padding: 12px 0;
  }

  .tree-node {
    display: flex;
    gap: 12px;
    min-height: 40px;
  }

  .tree-line-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 24px;
    flex-shrink: 0;
  }

  .tree-line-up,
  .tree-line-down {
    width: 2px;
    flex: 1;
    background: var(--border);
  }

  .running .tree-line-up,
  .completed .tree-line-up {
    background: var(--accent);
  }

  .tree-dot {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    border-radius: 50%;
    background: var(--bg3);
    border: 2px solid var(--border);
    flex-shrink: 0;
    color: var(--fg3);
  }

  .completed .tree-dot {
    border-color: var(--status-green);
    color: var(--status-green);
    background: rgba(61, 255, 192, 0.1);
  }

  .running .tree-dot {
    border-color: var(--accent);
    color: var(--accent);
    animation: pulse-glow 2s ease-in-out infinite;
  }

  .failed .tree-dot {
    border-color: var(--status-red);
    color: var(--status-red);
  }

  .tree-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    padding: 4px 0;
  }

  .tree-index {
    font-size: 10px;
    color: var(--fg3);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .tree-name {
    font-size: 13px;
    color: var(--fg);
  }

  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 4px var(--accent); }
    50% { box-shadow: 0 0 12px var(--accent); }
  }
</style>
