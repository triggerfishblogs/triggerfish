<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import LogToolbar from "./LogToolbar.svelte";
  import LogLine from "./LogLine.svelte";
  import { autoScroll } from "../../lib/actions/autoScroll.js";
  import { getEntries, subscribeLogs, unsubscribeLogs, passesFilter } from "../../lib/stores/logs.svelte.js";

  const filteredEntries = $derived(getEntries().filter(passesFilter));

  onMount(() => {
    subscribeLogs();
  });

  onDestroy(() => {
    unsubscribeLogs();
  });
</script>

<div class="logs-screen">
  <LogToolbar />
  <div class="logs-output" use:autoScroll>
    {#each filteredEntries as entry, i (entry.timestamp + i)}
      <LogLine {entry} />
    {/each}
    {#if filteredEntries.length === 0}
      <div class="empty">No log entries</div>
    {/if}
  </div>
</div>

<style>
  .logs-screen {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .logs-output {
    flex: 1;
    overflow-y: auto;
    background: var(--bg);
  }

  .empty {
    padding: 32px;
    text-align: center;
    color: var(--fg3);
    font-size: 13px;
  }
</style>
