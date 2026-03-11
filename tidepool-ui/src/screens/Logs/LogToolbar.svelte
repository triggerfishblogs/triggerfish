<script lang="ts">
  import Icon from "../../lib/components/Icon.svelte";
  import Badge from "../../lib/components/Badge.svelte";
  import {
    getActiveLevels,
    getKnownSources,
    getPaused,
    toggleLevel,
    togglePause,
    clearLogs,
    setSourceFilter,
    setSearchText,
  } from "../../lib/stores/logs.svelte.js";
  import type { LogLevel } from "../../lib/types.js";

  const LEVELS: LogLevel[] = ["DEBUG", "INFO", "WARN", "ERROR"];

  const levelColors: Record<LogLevel, string> = {
    DEBUG: "var(--fg3)",
    INFO: "var(--status-green)",
    WARN: "var(--status-yellow)",
    ERROR: "var(--status-red)",
  };

  let searchInput = $state("");
  let searchTimer: ReturnType<typeof setTimeout>;

  function handleSearchInput(): void {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => setSearchText(searchInput), 150);
  }
</script>

<div class="logs-toolbar">
  <div class="level-filters">
    {#each LEVELS as level}
      <button
        class="level-btn"
        class:active={getActiveLevels()[level]}
        style:--level-color={levelColors[level]}
        onclick={() => toggleLevel(level)}
      >
        {level}
      </button>
    {/each}
  </div>

  <select class="source-filter" onchange={(e) => setSourceFilter((e.target as HTMLSelectElement).value)}>
    <option value="">All sources</option>
    {#each getKnownSources() as source}
      <option value={source}>{source}</option>
    {/each}
  </select>

  <input
    type="text"
    class="search-input"
    placeholder="Search logs..."
    bind:value={searchInput}
    oninput={handleSearchInput}
  />

  <button class="toolbar-btn" onclick={togglePause} title={getPaused() ? "Resume" : "Pause"}>
    <Icon name={getPaused() ? "play" : "pause"} size={14} />
  </button>

  <button class="toolbar-btn" onclick={clearLogs} title="Clear">
    <Icon name="trash" size={14} />
  </button>
</div>

<style>
  .logs-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .level-filters {
    display: flex;
    gap: 4px;
  }

  .level-btn {
    padding: 3px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: var(--fg3);
    background: var(--bg3);
    transition:
      color var(--transition-fast),
      background var(--transition-fast);
  }

  .level-btn.active {
    color: var(--bg);
    background: var(--level-color);
  }

  .source-filter {
    padding: 4px 8px;
    font-size: 12px;
    min-width: 120px;
  }

  .search-input {
    flex: 1;
    min-width: 100px;
    padding: 4px 8px;
    font-size: 12px;
  }

  .toolbar-btn {
    padding: 6px;
    border-radius: var(--radius-sm);
    color: var(--fg3);
  }

  .toolbar-btn:hover {
    color: var(--fg);
    background: var(--bg3);
  }
</style>
