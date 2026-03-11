<script lang="ts">
  import type { StatusColor } from "../types.js";

  interface Props {
    color: StatusColor;
    breathing?: boolean;
    size?: number;
  }

  let { color, breathing = false, size = 8 }: Props = $props();
</script>

<span
  class="status-dot"
  class:breathing
  style:width="{size}px"
  style:height="{size}px"
  style:--dot-color="var(--status-{color})"
></span>

<style>
  .status-dot {
    display: inline-block;
    border-radius: 50%;
    background: var(--dot-color);
    flex-shrink: 0;
  }

  .breathing {
    animation: breathe 2s ease-in-out infinite;
  }

  @keyframes breathe {
    0%,
    100% {
      box-shadow: 0 0 4px var(--dot-color);
      opacity: 1;
    }
    50% {
      box-shadow: 0 0 12px var(--dot-color);
      opacity: 0.6;
    }
  }
</style>
