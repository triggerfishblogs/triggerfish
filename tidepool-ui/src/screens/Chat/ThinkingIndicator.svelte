<script lang="ts">
  import HexLoader from "../../lib/components/HexLoader.svelte";
</script>

<div class="thinking">
  <HexLoader size={8} />
  <span class="thinking-text">Thinking...</span>
</div>

<style>
  .thinking {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    color: var(--fg3);
    font-size: 13px;
  }

  .thinking-text {
    opacity: 0.7;
  }
</style>
