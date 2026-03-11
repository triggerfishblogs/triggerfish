<script lang="ts">
  interface Props {
    size?: number;
  }

  let { size = 10 }: Props = $props();
</script>

<div class="hex-loader" style:--hex-size="{size}px">
  <span class="hex" style:animation-delay="0ms"></span>
  <span class="hex" style:animation-delay="200ms"></span>
  <span class="hex" style:animation-delay="400ms"></span>
</div>

<style>
  .hex-loader {
    display: inline-flex;
    gap: calc(var(--hex-size) * 0.6);
    align-items: center;
  }

  .hex {
    width: var(--hex-size);
    height: var(--hex-size);
    background: var(--accent);
    clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%);
    animation: hex-pulse 1.2s ease-in-out infinite;
  }

  @keyframes hex-pulse {
    0%,
    100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(0.6);
      opacity: 0.3;
    }
  }
</style>
