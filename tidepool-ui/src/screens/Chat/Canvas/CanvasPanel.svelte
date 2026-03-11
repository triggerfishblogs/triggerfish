<script lang="ts">
  import Icon from "../../../lib/components/Icon.svelte";
  import CanvasRenderer from "./CanvasRenderer.svelte";
  import RenderHistory from "./RenderHistory.svelte";
  import { getCanvasVisible, toggleCanvas, getCurrentPayload } from "../../../lib/stores/canvas.svelte.js";
</script>

{#if getCanvasVisible()}
  <div class="canvas-panel">
    <div class="canvas-header glass">
      <span class="canvas-title">Canvas</span>
      <button class="canvas-collapse" onclick={toggleCanvas} title="Close canvas">
        <Icon name="close" size={16} />
      </button>
    </div>
    <div class="canvas-body">
      <CanvasRenderer payload={getCurrentPayload()} />
    </div>
    <RenderHistory />
  </div>
{/if}

<style>
  .canvas-panel {
    width: 50%;
    min-width: 300px;
    height: 100%;
    display: flex;
    flex-direction: column;
    border-left: 1px solid var(--border);
    background: var(--bg2);
  }

  .canvas-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    border-radius: 0;
    flex-shrink: 0;
  }

  .canvas-title {
    font-weight: 600;
    font-size: 13px;
    color: var(--fg2);
  }

  .canvas-collapse {
    color: var(--fg3);
  }

  .canvas-collapse:hover {
    color: var(--fg);
  }

  .canvas-body {
    flex: 1;
    overflow: hidden;
  }
</style>
