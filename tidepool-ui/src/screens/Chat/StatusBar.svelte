<script lang="ts">
  import StatusDot from "../../lib/components/StatusDot.svelte";
  import TaintBadge from "../../lib/components/TaintBadge.svelte";
  import { getConnectionState } from "../../lib/stores/websocket.svelte.js";
  import { getTaint, getProvider, getModel, getMcpConnected, getMcpConfigured } from "../../lib/stores/session.svelte.js";
  import type { StatusColor } from "../../lib/types.js";

  const dotColor: StatusColor = $derived(
    getConnectionState() === "connected"
      ? "green"
      : getConnectionState() === "connecting"
        ? "yellow"
        : "red",
  );

  const mcpColor: StatusColor = $derived(
    getMcpConfigured() === 0
      ? "gray"
      : getMcpConnected() === getMcpConfigured()
        ? "green"
        : getMcpConnected() > 0
          ? "yellow"
          : "red",
  );
</script>

<div class="status-bar glass">
  <div class="status-left">
    <StatusDot color={dotColor} breathing={getConnectionState() === "connected"} />
    <span class="status-text">
      {getConnectionState() === "connected"
        ? "Connected"
        : getConnectionState() === "connecting"
          ? "Connecting..."
          : "Disconnected"}
    </span>
    {#if getProvider()}
      <span class="provider">{getProvider()}/{getModel()}</span>
    {/if}
  </div>
  <div class="status-right">
    {#if getMcpConfigured() > 0}
      <span class="mcp-status">
        <StatusDot color={mcpColor} size={6} />
        MCP {getMcpConnected()}/{getMcpConfigured()}
      </span>
    {/if}
    <TaintBadge level={getTaint()} pulse={getTaint() !== "PUBLIC"} />
  </div>
</div>

<style>
  .status-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    border-bottom: 1px solid var(--border);
    font-size: 12px;
    border-radius: 0;
  }

  .status-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-text {
    color: var(--fg2);
  }

  .provider {
    color: var(--fg3);
    font-family: var(--font-mono);
    font-size: 11px;
  }

  .status-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .mcp-status {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--fg3);
    font-size: 11px;
  }
</style>
