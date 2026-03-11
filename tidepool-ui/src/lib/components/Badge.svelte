<script lang="ts">
  interface Props {
    count: number;
  }

  let { count }: Props = $props();

  const display = $derived(count > 99 ? "99+" : String(count));
</script>

{#if count > 0}
  <span class="badge">{display}</span>
{/if}

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: var(--status-red);
    color: var(--bg);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
  }
</style>
