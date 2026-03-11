<script lang="ts">
  import Icon from "./lib/components/Icon.svelte";
  import Badge from "./lib/components/Badge.svelte";
  import StatusDot from "./lib/components/StatusDot.svelte";
  import {
    SCREENS,
    getActiveScreen,
    getBadges,
    getStatusDots,
    navigateTo,
  } from "./lib/stores/nav.svelte.js";
  import { statusToColor } from "./lib/types.js";
  import type { ScreenId, StatusColor } from "./lib/types.js";

  const labels: Record<ScreenId, string> = {
    chat: "Chat",
    agents: "Agents",
    workflows: "Workflows",
    health: "Health",
    settings: "Settings",
    logs: "Logs",
    memory: "Memory",
  };

  const iconNames: Record<ScreenId, string> = {
    chat: "chat",
    agents: "agents",
    workflows: "workflows",
    health: "health",
    settings: "settings",
    logs: "logs",
    memory: "memory",
  };

  // Calculate indicator Y position based on active screen index
  const activeIndex = $derived(SCREENS.indexOf(getActiveScreen()));
  const indicatorY = $derived(8 + activeIndex * 56 + 14);
</script>

<nav class="nav-bar">
  <div class="nav-brand">
    <svg width="32" height="32" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Line-art triggerfish from brand logo -->
      <g stroke="var(--accent)" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <!-- Body outline — tall oval, triggerfish shape -->
        <path d="M12 32 C12 22 16 14 22 10 C28 6 36 8 40 14 C44 20 46 26 46 32 C46 38 44 44 40 50 C36 56 28 58 22 54 C16 50 12 42 12 32Z"/>
        <!-- Dorsal fin — tall triangular with curved leading edge -->
        <path d="M28 10 C32 4 38 2 42 6 L44 14"/>
        <!-- Trigger spine — small spine with curl -->
        <path d="M26 10 L24 4 C24 2 26 2 26 4"/>
        <!-- Eye — concentric circles -->
        <circle cx="20" cy="28" r="4"/>
        <circle cx="20" cy="28" r="2"/>
        <circle cx="20" cy="28" r="0.8" fill="var(--accent)"/>
        <!-- Mouth -->
        <path d="M12 30 L8 32 L12 34"/>
        <!-- Tail — forked -->
        <path d="M46 26 L56 18"/>
        <path d="M46 38 L56 46"/>
        <path d="M46 26 C48 32 48 32 46 38"/>
        <!-- Pectoral fin (lower-left) -->
        <path d="M18 44 L10 54 L22 50"/>
        <!-- Ventral fin -->
        <path d="M32 52 L34 60 L40 50"/>
        <!-- Anal fin -->
        <path d="M40 50 C42 52 44 50 46 46"/>
      </g>
      <!-- Hexagons on body — filled, brand motif -->
      <g fill="var(--accent)" opacity="0.5" stroke="none">
        <path d="M28 26 L30 25 L32 26 L32 28 L30 29 L28 28Z"/>
        <path d="M33 26 L35 25 L37 26 L37 28 L35 29 L33 28Z"/>
        <path d="M28 30 L30 29 L32 30 L32 32 L30 33 L28 32Z"/>
        <path d="M33 30 L35 29 L37 30 L37 32 L35 33 L33 32Z"/>
        <path d="M28 34 L30 33 L32 34 L32 36 L30 37 L28 36Z"/>
        <path d="M33 34 L35 33 L37 34 L37 36 L35 37 L33 36Z"/>
      </g>
      <!-- Dot texture hints -->
      <g fill="var(--accent)" opacity="0.3" stroke="none">
        <circle cx="24" cy="20" r="0.6"/><circle cx="26" cy="22" r="0.6"/>
        <circle cx="38" cy="20" r="0.6"/><circle cx="40" cy="24" r="0.6"/>
        <circle cx="36" cy="40" r="0.6"/><circle cx="38" cy="44" r="0.6"/>
        <circle cx="24" cy="40" r="0.6"/><circle cx="22" cy="38" r="0.6"/>
      </g>
      <!-- Honeycomb hint on belly -->
      <g stroke="var(--accent)" stroke-width="0.8" fill="none" opacity="0.3">
        <path d="M18 46 L20 45 L22 46 L22 48 L20 49 L18 48Z"/>
        <path d="M22 46 L24 45 L26 46 L26 48 L24 49 L22 48Z"/>
        <path d="M20 49 L22 48 L24 49 L24 51 L22 52 L20 51Z"/>
      </g>
    </svg>
  </div>

  <div class="nav-items">
    <!-- Sliding indicator -->
    <div class="nav-indicator" style:top="{indicatorY}px"></div>

    {#each SCREENS as screen}
      {@const isActive = getActiveScreen() === screen}
      {@const badge = getBadges()[screen]}
      {@const dot = getStatusDots()[screen]}
      <button
        class="nav-item"
        class:active={isActive}
        onclick={() => navigateTo(screen)}
        title={labels[screen]}
      >
        <div class="nav-icon">
          <Icon name={iconNames[screen]} size={20} />
          {#if badge > 0}
            <div class="nav-badge-wrap">
              <Badge count={badge} />
            </div>
          {/if}
          {#if dot}
            <div class="nav-dot-wrap">
              <StatusDot color={statusToColor(dot) as StatusColor} size={6} />
            </div>
          {/if}
        </div>
        <span class="nav-label">{labels[screen]}</span>
      </button>
    {/each}
  </div>
</nav>

<style>
  .nav-bar {
    width: var(--nav-width);
    min-width: var(--nav-width);
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg2);
    border-right: 1px solid var(--border);
    z-index: 10;
  }

  .nav-brand {
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid var(--border);
  }

  .nav-items {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 8px 0;
    position: relative;
  }

  .nav-indicator {
    position: absolute;
    left: 0;
    width: 3px;
    height: 28px;
    background: var(--accent);
    border-radius: 0 3px 3px 0;
    transition: top 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 56px;
    gap: 4px;
    color: var(--fg3);
    transition:
      color var(--transition-fast),
      box-shadow var(--transition-fast);
    position: relative;
  }

  .nav-item:hover {
    color: var(--fg);
    box-shadow: inset 0 0 12px var(--accent-dim);
  }

  .nav-item.active {
    color: var(--accent);
  }

  .nav-icon {
    position: relative;
  }

  .nav-label {
    font-size: 9px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .nav-badge-wrap {
    position: absolute;
    top: -6px;
    right: -8px;
  }

  .nav-dot-wrap {
    position: absolute;
    bottom: -2px;
    right: -2px;
  }
</style>
