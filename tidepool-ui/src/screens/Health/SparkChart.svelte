<script lang="ts">
  import type { TimeSeriesPoint } from "../../lib/types.js";

  interface Props {
    label: string;
    points: TimeSeriesPoint[];
    color?: string;
  }

  let { label, points, color = "var(--accent)" }: Props = $props();

  const W = 280;
  const H = 100;
  const PAD = 24;

  const plotW = W - PAD * 2;
  const plotH = H - PAD - 8;

  const yTicks = $derived.by(() => {
    if (points.length < 2) return [];
    const vals = points.map((p) => p.v);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (max === min) return [{ y: PAD + plotH / 2, label: String(max) }];
    return [
      { y: 8, label: String(max) },
      { y: 8 + plotH / 2, label: String(Math.round((max + min) / 2)) },
      { y: 8 + plotH, label: String(min) },
    ];
  });

  const pathD = $derived.by(() => {
    if (points.length < 2) return "";
    const vals = points.map((p) => p.v);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max === min ? 1 : max - min;

    const coords = points.map((p, i) => {
      const x = PAD + (i / (points.length - 1)) * plotW;
      const y = 8 + plotH - ((p.v - min) / range) * plotH;
      return { x, y };
    });

    return coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(
      " ",
    );
  });

  const areaD = $derived.by(() => {
    if (points.length < 2) return "";
    const bottom = 8 + plotH;
    return `${pathD} L${PAD + plotW},${bottom} L${PAD},${bottom} Z`;
  });

  const currentValue = $derived(
    points.length > 0 ? points[points.length - 1].v : 0,
  );

  const timeRange = $derived.by(() => {
    if (points.length < 2) return "";
    const first = new Date(points[0].t);
    const last = new Date(points[points.length - 1].t);
    const diffMin = Math.round((last.getTime() - first.getTime()) / 60000);
    if (diffMin < 2) return `${diffMin * 60}s`;
    if (diffMin < 120) return `${diffMin}m`;
    return `${Math.round(diffMin / 60)}h`;
  });
</script>

<div class="spark-chart glass">
  <div class="chart-header">
    <span class="chart-label">{label}</span>
    <span class="chart-value" style:color={color}>{currentValue}</span>
  </div>
  {#if points.length >= 2}
    <svg viewBox="0 0 {W} {H}" class="chart-svg">
      {#each yTicks as tick}
        <line
          x1={PAD}
          y1={tick.y}
          x2={PAD + plotW}
          y2={tick.y}
          stroke="var(--border)"
          stroke-dasharray="3,3"
        />
        <text
          x={PAD - 4}
          y={tick.y + 3}
          text-anchor="end"
          fill="var(--fg3)"
          font-size="9">{tick.label}</text
        >
      {/each}
      <path d={areaD} fill={color} opacity="0.1" />
      <path d={pathD} fill="none" stroke={color} stroke-width="2" />
      <circle
        cx={PAD + plotW}
        cy={8 + plotH - ((points[points.length - 1].v - Math.min(...points.map((p) => p.v))) / (Math.max(...points.map((p) => p.v)) - Math.min(...points.map((p) => p.v)) || 1)) * plotH}
        r="3"
        fill={color}
      />
    </svg>
    <div class="chart-footer">
      <span class="chart-range">{timeRange} window</span>
      <span class="chart-points">{points.length} samples</span>
    </div>
  {:else}
    <div class="chart-empty">Collecting data...</div>
  {/if}
</div>

<style>
  .spark-chart {
    padding: 16px;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .chart-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
  }

  .chart-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--fg2);
  }

  .chart-value {
    font-size: 22px;
    font-weight: 700;
  }

  .chart-svg {
    width: 100%;
    height: auto;
  }

  .chart-footer {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: var(--fg3);
  }

  .chart-range,
  .chart-points {
    opacity: 0.7;
  }

  .chart-empty {
    text-align: center;
    color: var(--fg3);
    font-size: 12px;
    padding: 24px 0;
  }
</style>
