<script lang="ts">
  import type { ChatMessage } from "../../lib/types.js";
  import { classificationColor } from "../../lib/types.js";
  import { renderMarkdown } from "../../lib/utils/markdown.js";
  import { formatTimestamp } from "../../lib/utils/formatTime.js";
  import ToolCall from "./ToolCall.svelte";
  import WebToolCall from "./WebToolCall.svelte";

  interface Props {
    message: ChatMessage;
  }

  let { message }: Props = $props();

  const html = $derived(
    message.role === "user" ? message.text : renderMarkdown(message.text),
  );

  const taintStyle = $derived(
    message.taint && message.taint !== "PUBLIC"
      ? `border-color: ${classificationColor(message.taint)}; box-shadow: 0 0 8px ${classificationColor(message.taint)}`
      : undefined,
  );
</script>

<div class="message-wrap" class:user-wrap={message.role === "user"}>
  {#if message.toolCalls && message.toolCalls.length > 0}
    <div class="tool-section">
      {#each message.toolCalls as tool (tool.id)}
        {#if tool.isWeb}
          <WebToolCall {tool} />
        {:else}
          <ToolCall {tool} />
        {/if}
      {/each}
    </div>
  {/if}
  <div
    class="message"
    class:user={message.role === "user"}
    class:assistant={message.role === "assistant"}
    class:error={message.role === "error"}
    style={taintStyle}
  >
    {#if message.role === "user"}
      <div class="message-content user-content">{message.text}</div>
    {:else}
      <div class="message-content">
        {@html html}
      </div>
    {/if}
    <span class="message-time">{formatTimestamp(message.timestamp)}</span>
  </div>
</div>

<style>
  .message-wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 85%;
    align-self: flex-start;
  }

  .user-wrap {
    align-self: flex-end;
  }

  .tool-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .message {
    padding: 12px 16px;
    border-radius: var(--radius-lg);
    position: relative;
  }

  .user {
    background: linear-gradient(135deg, rgba(61, 255, 192, 0.15), rgba(61, 255, 192, 0.08));
    border: 1px solid rgba(61, 255, 192, 0.2);
  }

  .assistant {
    background: var(--glass-bg);
    backdrop-filter: blur(var(--glass-blur));
    border: 1px solid var(--border);
  }

  .error {
    background: rgba(255, 107, 138, 0.1);
    border: 1px solid rgba(255, 107, 138, 0.3);
    color: var(--status-red);
  }

  .message-content {
    line-height: 1.6;
    word-break: break-word;
  }

  .message-content :global(p) {
    margin-bottom: 8px;
  }

  .message-content :global(p:last-child) {
    margin-bottom: 0;
  }

  .message-content :global(pre) {
    margin: 8px 0;
  }

  .message-content :global(ul),
  .message-content :global(ol) {
    margin: 4px 0;
    padding-left: 20px;
  }

  .message-content :global(table) {
    border-collapse: collapse;
    width: 100%;
    margin: 8px 0;
    font-size: 13px;
  }

  .message-content :global(th),
  .message-content :global(td) {
    border: 1px solid var(--border);
    padding: 6px 10px;
    text-align: left;
    white-space: normal;
    word-break: break-word;
  }

  .message-content :global(th) {
    background: rgba(255, 255, 255, 0.05);
    font-weight: 600;
  }

  .user-content {
    white-space: pre-wrap;
  }

  .message-time {
    display: block;
    font-size: 10px;
    color: var(--fg3);
    margin-top: 4px;
    text-align: right;
  }
</style>
