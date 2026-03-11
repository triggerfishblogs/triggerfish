<script lang="ts">
  import type { ToolCall as ToolCallType } from "../../lib/types.js";

  interface Props {
    tool: ToolCallType;
  }

  let { tool }: Props = $props();

  const urlMatch = $derived(tool.args.match(/"url"\s*:\s*"([^"]+)"/));
  const queryMatch = $derived(tool.args.match(/"query"\s*:\s*"([^"]+)"/));
  const display = $derived(urlMatch?.[1] ?? queryMatch?.[1] ?? tool.args);
</script>

<div class="web-tool" class:done={tool.state === "done"}>
  <div class="web-tool-row">
    {#if tool.state === "running"}
      <span class="spinner"></span>
    {:else}
      <span class="globe">&#127760;</span>
    {/if}
    <span class="web-tool-name">{tool.name}</span>
    <span class="web-tool-meta">{display}</span>
  </div>
</div>

<style>
  .web-tool {
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 6px 10px;
    font-size: 13px;
    margin-bottom: 4px;
  }

  .web-tool-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid var(--fg3);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    flex-shrink: 0;
  }

  .globe {
    font-size: 14px;
    flex-shrink: 0;
  }

  .web-tool-name {
    color: var(--accent);
    font-family: var(--font-mono);
    font-weight: 500;
    white-space: nowrap;
  }

  .web-tool-meta {
    color: var(--fg3);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
