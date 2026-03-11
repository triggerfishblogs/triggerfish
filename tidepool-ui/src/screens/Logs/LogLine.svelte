<script lang="ts">
  import type { LogEntry } from "../../lib/types.js";
  import { formatTime } from "../../lib/utils/formatTime.js";

  interface Props {
    entry: LogEntry;
  }

  let { entry }: Props = $props();

  const levelColor = $derived(
    entry.level === "ERROR"
      ? "var(--status-red)"
      : entry.level === "WARN"
        ? "var(--status-yellow)"
        : entry.level === "INFO"
          ? "var(--status-green)"
          : "var(--fg3)",
  );
</script>

<div class="log-line" data-level={entry.level}>
  <span class="log-ts">{formatTime(entry.timestamp)}</span>
  <span class="log-dot" style:background={levelColor}></span>
  <span class="log-level" style:color={levelColor}>{entry.level.padEnd(5)}</span>
  <span class="log-source">{entry.source}</span>
  <span class="log-msg">{entry.message}</span>
</div>

<style>
  .log-line {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 2px 12px;
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.6;
    border-bottom: 1px solid rgba(30, 45, 61, 0.3);
  }

  .log-line:nth-child(even) {
    background: rgba(17, 24, 32, 0.3);
  }

  .log-ts {
    color: var(--fg3);
    flex-shrink: 0;
    font-size: 11px;
  }

  .log-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 6px;
  }

  .log-level {
    flex-shrink: 0;
    font-weight: 600;
    font-size: 11px;
    width: 45px;
  }

  .log-source {
    color: var(--fg2);
    flex-shrink: 0;
    min-width: 80px;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .log-msg {
    color: var(--fg);
    flex: 1;
    word-break: break-all;
  }
</style>
