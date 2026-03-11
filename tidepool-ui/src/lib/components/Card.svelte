<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    borderColor?: string;
    hover?: boolean;
    children: Snippet;
  }

  let { borderColor, hover = false, children }: Props = $props();
</script>

<div
  class="card glass"
  class:hover
  style:border-left-color={borderColor}
  style:border-left-width={borderColor ? "3px" : undefined}
>
  {@render children()}
</div>

<style>
  .card {
    padding: 16px;
    transition:
      transform var(--transition-fast),
      box-shadow var(--transition-fast);
  }

  .hover:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }
</style>
