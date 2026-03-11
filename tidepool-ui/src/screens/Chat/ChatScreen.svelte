<script lang="ts">
  import StatusBar from "./StatusBar.svelte";
  import MessageList from "./MessageList.svelte";
  import ChatInput from "./ChatInput.svelte";
  import CanvasPanel from "./Canvas/CanvasPanel.svelte";
  import { getCanvasVisible } from "../../lib/stores/canvas.svelte.js";
</script>

<div class="chat-screen">
  <div class="chat-main">
    <StatusBar />
    <MessageList />
    <ChatInput />
  </div>
  {#if getCanvasVisible()}
    <CanvasPanel />
  {/if}
</div>

<style>
  .chat-screen {
    height: 100%;
    display: flex;
  }

  .chat-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
</style>
