<script lang="ts">
  import { getRenders, getActiveRenderId, showRender } from "../../../lib/stores/canvas.svelte.js";
</script>

{#if getRenders().length > 0}
  <div class="render-history">
    {#each getRenders() as render (render.id)}
      <button
        class="history-pill"
        class:active={render.id === getActiveRenderId()}
        onclick={() => showRender(render.id)}
      >
        {render.label}
      </button>
    {/each}
  </div>
{/if}

<style>
  .render-history {
    display: flex;
    gap: 4px;
    padding: 8px 12px;
    overflow-x: auto;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  .history-pill {
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 11px;
    color: var(--fg3);
    background: var(--bg3);
    white-space: nowrap;
    transition:
      color var(--transition-fast),
      background var(--transition-fast);
  }

  .history-pill:hover {
    color: var(--fg);
    background: var(--bg4);
  }

  .history-pill.active {
    color: var(--accent);
    background: var(--accent-dim);
  }
</style>
