<script lang="ts">
  import type { ClassificationLevel } from "../types.js";

  interface Props {
    level: ClassificationLevel;
    pulse?: boolean;
    small?: boolean;
  }

  let { level, pulse = false, small = false }: Props = $props();
</script>

<span
  class="taint-badge"
  class:pulse
  class:small
  data-level={level}
>
  {level}
</span>

<style>
  .taint-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .small {
    padding: 1px 6px;
    font-size: 10px;
  }

  .taint-badge[data-level="PUBLIC"] {
    background: rgba(61, 255, 192, 0.15);
    color: var(--taint-public);
    box-shadow: 0 0 6px rgba(61, 255, 192, 0.2);
  }

  .taint-badge[data-level="INTERNAL"] {
    background: rgba(255, 217, 61, 0.15);
    color: var(--taint-internal);
    box-shadow: 0 0 6px rgba(255, 217, 61, 0.2);
  }

  .taint-badge[data-level="CONFIDENTIAL"] {
    background: rgba(255, 158, 100, 0.15);
    color: var(--taint-confidential);
    box-shadow: 0 0 6px rgba(255, 158, 100, 0.2);
  }

  .taint-badge[data-level="RESTRICTED"] {
    background: rgba(255, 107, 138, 0.15);
    color: var(--taint-restricted);
    box-shadow: 0 0 6px rgba(255, 107, 138, 0.2);
  }

  .pulse {
    animation: pulse-glow 2s ease-in-out infinite;
  }

  @keyframes pulse-glow {
    0%,
    100% {
      box-shadow: 0 0 6px currentColor;
    }
    50% {
      box-shadow: 0 0 16px currentColor;
    }
  }
</style>
