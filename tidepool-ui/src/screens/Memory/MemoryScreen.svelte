<script lang="ts">
  import { onMount } from "svelte";
  import MemoryCard from "./MemoryCard.svelte";
  import MemoryDetail from "./MemoryDetail.svelte";
  import Icon from "../../lib/components/Icon.svelte";
  import {
    getResults,
    getAvailableTags,
    getHasRestricted,
    getSelectedEntry,
    getSearchQuery,
    getClassificationFilter,
    getTagFilter,
    searchMemories,
    requestTags,
    selectEntry,
    setSearchQuery,
    setClassificationFilter,
    setTagFilter,
  } from "../../lib/stores/memory.svelte.js";
  import type { ClassificationLevel } from "../../lib/types.js";

  let localQuery = $state(getSearchQuery());
  let localClassFilter = $state(getClassificationFilter() as string);
  let localTagFilter = $state(getTagFilter());

  function handleSearch(): void {
    setSearchQuery(localQuery);
    setClassificationFilter(localClassFilter as ClassificationLevel | "");
    setTagFilter(localTagFilter);
    searchMemories();
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === "Enter") handleSearch();
  }

  onMount(() => {
    requestTags();
  });
</script>

<div class="memory-screen">
  {#if getSelectedEntry()}
    <MemoryDetail entry={getSelectedEntry()!} />
  {:else}
    <div class="memory-toolbar">
      <div class="search-bar">
        <Icon name="search" size={16} />
        <input
          type="text"
          placeholder="Search memories..."
          bind:value={localQuery}
          onkeydown={handleKeydown}
        />
      </div>

      <select bind:value={localClassFilter}>
        <option value="">All classifications</option>
        <option value="PUBLIC">PUBLIC</option>
        <option value="INTERNAL">INTERNAL</option>
        <option value="CONFIDENTIAL">CONFIDENTIAL</option>
        <option value="RESTRICTED">RESTRICTED</option>
      </select>

      <select bind:value={localTagFilter}>
        <option value="">All tags</option>
        {#each getAvailableTags() as tag}
          <option value={tag}>{tag}</option>
        {/each}
      </select>

      <button class="search-btn" onclick={handleSearch}>Search</button>
    </div>

    {#if getHasRestricted()}
      <div class="visibility-note">
        Some memories are hidden due to classification restrictions.
      </div>
    {/if}

    <div class="memory-results">
      {#each getResults() as entry (entry.id)}
        <MemoryCard {entry} onclick={() => selectEntry(entry)} />
      {/each}
      {#if getResults().length === 0}
        <div class="empty">Search for memories above</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .memory-screen {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .memory-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .search-bar {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    color: var(--fg3);
  }

  .search-bar input {
    flex: 1;
    border: none;
    background: none;
    outline: none;
    padding: 0;
    font-size: 14px;
  }

  select {
    min-width: 140px;
    font-size: 12px;
  }

  .search-btn {
    padding: 8px 16px;
    border-radius: var(--radius);
    background: var(--accent);
    color: var(--bg);
    font-weight: 500;
    font-size: 13px;
  }

  .search-btn:hover {
    opacity: 0.9;
  }

  .visibility-note {
    padding: 8px 16px;
    background: rgba(255, 217, 61, 0.1);
    color: var(--taint-internal);
    font-size: 12px;
    border-bottom: 1px solid var(--border);
  }

  .memory-results {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .empty {
    padding: 32px;
    text-align: center;
    color: var(--fg3);
    font-size: 13px;
  }
</style>
