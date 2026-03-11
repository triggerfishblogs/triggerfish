<script lang="ts">
  import type { MemoryEntry } from "../../lib/types.js";
  import { classificationColor } from "../../lib/types.js";
  import TaintBadge from "../../lib/components/TaintBadge.svelte";
  import { formatAgo } from "../../lib/utils/formatTime.js";

  interface Props {
    entry: MemoryEntry;
    onclick: () => void;
  }

  let { entry, onclick }: Props = $props();

  const borderColor = $derived(classificationColor(entry.classification));
  const preview = $derived(
    entry.content.length > 150 ? entry.content.slice(0, 150) + "..." : entry.content,
  );
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="memory-card glass" style:border-left="3px solid {borderColor}" {onclick}>
  <div class="card-header">
    <TaintBadge level={entry.classification} small />
    <span class="card-time">{formatAgo(entry.updatedAt)}</span>
  </div>
  <p class="card-content">{preview}</p>
  {#if entry.tags.length > 0}
    <div class="card-tags">
      {#each entry.tags as tag}
        <span class="tag">{tag}</span>
      {/each}
    </div>
  {/if}
</div>

<style>
  .memory-card {
    padding: 12px;
    border-radius: var(--radius);
    cursor: pointer;
    transition:
      transform var(--transition-fast),
      box-shadow var(--transition-fast);
  }

  .memory-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .card-time {
    font-size: 11px;
    color: var(--fg3);
  }

  .card-content {
    font-size: 13px;
    color: var(--fg2);
    line-height: 1.5;
    margin-bottom: 8px;
    word-break: break-word;
  }

  .card-tags {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .tag {
    padding: 1px 6px;
    border-radius: 8px;
    font-size: 10px;
    background: var(--bg4);
    color: var(--fg2);
  }
</style>
