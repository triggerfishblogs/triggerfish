<script lang="ts">
  import type { TodoItem } from "../../lib/types.js";

  interface Props {
    items: TodoItem[];
  }

  let { items }: Props = $props();
</script>

{#if items.length > 0}
  <div class="todo-list">
    <div class="todo-header">Todo</div>
    {#each items as item}
      <div class="todo-item" class:done={item.status === "done"} class:active={item.status === "active"}>
        <span class="todo-icon">
          {#if item.status === "done"}
            &#10003;
          {:else if item.status === "active"}
            &#9654;
          {:else}
            &#9675;
          {/if}
        </span>
        <span class="todo-text">{item.text}</span>
      </div>
    {/each}
  </div>
{/if}

<style>
  .todo-list {
    background: var(--bg3);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
    margin-bottom: 4px;
  }

  .todo-header {
    padding: 6px 10px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--fg3);
    border-bottom: 1px solid var(--border);
  }

  .todo-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    font-size: 13px;
  }

  .todo-item.done {
    color: var(--status-green);
    text-decoration: line-through;
    opacity: 0.7;
  }

  .todo-item.active {
    color: var(--accent);
  }

  .todo-icon {
    flex-shrink: 0;
    width: 16px;
    text-align: center;
  }
</style>
