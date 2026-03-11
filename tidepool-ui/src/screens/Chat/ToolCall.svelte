<script lang="ts">
  import type { ToolCall as ToolCallType } from "../../lib/types.js";
  import Icon from "../../lib/components/Icon.svelte";

  interface Props {
    tool: ToolCallType;
  }

  let { tool }: Props = $props();

  const shortArgs = $derived(
    tool.args.length > 80 ? tool.args.slice(0, 80) + "..." : tool.args,
  );

  let expanded = $state(false);
</script>

<div class="tool-call" class:done={tool.state === "done"} class:error={tool.state === "error"}>
  <div class="tool-header" role="button" tabindex="0" onclick={() => (expanded = !expanded)} onkeydown={(e) => e.key === "Enter" && (expanded = !expanded)}>
    <div class="tool-left">
      {#if tool.state === "running"}
        <span class="spinner"></span>
      {:else if tool.state === "done"}
        <span class="check">&#10003;</span>
      {:else}
        <span class="error-icon">&#10007;</span>
      {/if}
      <span class="tool-name">{tool.name}</span>
      <span class="tool-args">{shortArgs}</span>
    </div>
    <Icon name={expanded ? "collapse" : "expand"} size={14} />
  </div>

  {#if expanded && tool.result}
    <div class="tool-result">
      <pre>{tool.result}</pre>
    </div>
  {/if}
</div>

<style>
  .tool-call {
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    font-size: 13px;
    margin-bottom: 4px;
  }

  .tool-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    cursor: pointer;
    gap: 8px;
  }

  .tool-header:hover {
    background: var(--bg4);
  }

  .tool-left {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    overflow: hidden;
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

  .check {
    color: var(--status-green);
    font-weight: bold;
    flex-shrink: 0;
  }

  .error-icon {
    color: var(--status-red);
    font-weight: bold;
    flex-shrink: 0;
  }

  .tool-name {
    color: var(--accent);
    font-family: var(--font-mono);
    font-weight: 500;
    white-space: nowrap;
  }

  .tool-args {
    color: var(--fg3);
    font-family: var(--font-mono);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tool-result {
    border-top: 1px solid var(--border);
    padding: 8px 10px;
    max-height: 200px;
    overflow-y: auto;
  }

  .tool-result pre {
    margin: 0;
    padding: 0;
    border: none;
    background: none;
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-all;
    color: var(--fg2);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
