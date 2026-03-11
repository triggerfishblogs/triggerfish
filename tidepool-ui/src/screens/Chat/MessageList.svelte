<script lang="ts">
  import Message from "./Message.svelte";
  import ToolCall from "./ToolCall.svelte";
  import WebToolCall from "./WebToolCall.svelte";
  import TodoList from "./TodoList.svelte";
  import ThinkingIndicator from "./ThinkingIndicator.svelte";
  import { getMessages, getToolCalls, getThinking, getTodoItems } from "../../lib/stores/chat.svelte.js";
  import { autoScroll } from "../../lib/actions/autoScroll.js";
</script>

<div class="message-list" use:autoScroll>
  {#each getMessages() as msg (msg.id)}
    <Message message={msg} />
  {/each}

  {#if getToolCalls().length > 0}
    <div class="tool-section">
      {#each getToolCalls() as tool (tool.id)}
        {#if tool.isWeb}
          <WebToolCall {tool} />
        {:else}
          <ToolCall {tool} />
        {/if}
      {/each}
    </div>
  {/if}

  {#if getTodoItems().length > 0}
    <TodoList items={getTodoItems()} />
  {/if}

  {#if getThinking()}
    <ThinkingIndicator />
  {/if}
</div>

<style>
  .message-list {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .tool-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 85%;
    align-self: flex-start;
  }
</style>
