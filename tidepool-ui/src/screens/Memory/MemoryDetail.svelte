<script lang="ts">
  import type { MemoryEntry } from "../../lib/types.js";
  import TaintBadge from "../../lib/components/TaintBadge.svelte";
  import Icon from "../../lib/components/Icon.svelte";
  import { deselectEntry, deleteEntry } from "../../lib/stores/memory.svelte.js";
  import { formatTime, formatAgo } from "../../lib/utils/formatTime.js";

  interface Props {
    entry: MemoryEntry;
  }

  let { entry }: Props = $props();
</script>

<div class="memory-detail">
  <div class="detail-header">
    <button class="back-btn" onclick={deselectEntry}>
      <Icon name="back" size={16} />
      Back
    </button>
    <TaintBadge level={entry.classification} />
  </div>

  <div class="detail-content">
    <pre>{entry.content}</pre>
  </div>

  <div class="detail-meta">
    <div class="meta-item">
      <span class="meta-label">Created</span>
      <span>{formatTime(entry.createdAt)} ({formatAgo(entry.createdAt)})</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Updated</span>
      <span>{formatTime(entry.updatedAt)} ({formatAgo(entry.updatedAt)})</span>
    </div>
    {#if entry.sessionId}
      <div class="meta-item">
        <span class="meta-label">Session</span>
        <code>{entry.sessionId}</code>
      </div>
    {/if}
    {#if entry.tags.length > 0}
      <div class="meta-item">
        <span class="meta-label">Tags</span>
        <div class="tags">
          {#each entry.tags as tag}
            <span class="tag">{tag}</span>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <div class="detail-actions">
    <button class="delete-btn" onclick={() => deleteEntry(entry.id)}>
      <Icon name="trash" size={14} />
      Delete
    </button>
  </div>
</div>

<style>
  .memory-detail {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--fg2);
    font-size: 13px;
  }

  .back-btn:hover {
    color: var(--accent);
  }

  .detail-content {
    padding: 16px;
    flex: 1;
  }

  .detail-content pre {
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 13px;
    line-height: 1.6;
    background: none;
    border: none;
    padding: 0;
  }

  .detail-meta {
    padding: 12px 16px;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }

  .meta-label {
    font-weight: 600;
    color: var(--fg3);
    min-width: 60px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: 10px;
  }

  .tags {
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

  .detail-actions {
    padding: 12px 16px;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  .delete-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-radius: var(--radius);
    color: var(--status-red);
    background: rgba(255, 107, 138, 0.1);
    font-size: 13px;
  }

  .delete-btn:hover {
    background: rgba(255, 107, 138, 0.2);
  }
</style>
