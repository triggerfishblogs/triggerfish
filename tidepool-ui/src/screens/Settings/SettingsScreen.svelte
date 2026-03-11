<script lang="ts">
  import { onMount } from "svelte";
  import SectionContent from "./SectionContent.svelte";
  import HexLoader from "../../lib/components/HexLoader.svelte";
  import {
    SECTIONS,
    getActiveSection,
    getSectionData,
    getLoading,
    requestSection,
  } from "../../lib/stores/settings.svelte.js";
  import type { SettingsSection } from "../../lib/types.js";

  const labels: Record<SettingsSection, string> = {
    general: "General",
    providers: "LLM Providers",
    channels: "Channels",
    classification: "Classification",
    scheduler: "Scheduler",
    integrations: "Integrations",
    advanced: "Advanced",
  };

  const activeIndex = $derived(SECTIONS.indexOf(getActiveSection()));
  const indicatorY = $derived(activeIndex * 40 + 8);

  onMount(() => {
    requestSection("general");
  });
</script>

<div class="settings-screen">
  <div class="settings-sidebar">
    <div class="tab-indicator" style:top="{indicatorY}px"></div>
    {#each SECTIONS as section}
      <button
        class="tab"
        class:active={getActiveSection() === section}
        onclick={() => requestSection(section)}
      >
        {labels[section]}
      </button>
    {/each}
  </div>

  <div class="settings-main">
    <div class="settings-header">
      <h2>{labels[getActiveSection()]}</h2>
      <span class="readonly-badge">Read Only</span>
    </div>
    <div class="settings-body">
      {#if getLoading()}
        <div class="loading">
          <HexLoader />
        </div>
      {:else if getSectionData()}
        <SectionContent section={getActiveSection()} data={getSectionData()!} />
      {/if}
    </div>
  </div>
</div>

<style>
  .settings-screen {
    height: 100%;
    display: flex;
  }

  .settings-sidebar {
    width: 180px;
    min-width: 160px;
    border-right: 1px solid var(--border);
    padding: 8px 0;
    display: flex;
    flex-direction: column;
    background: var(--bg2);
    position: relative;
  }

  .tab-indicator {
    position: absolute;
    right: 0;
    width: 2px;
    height: 24px;
    background: var(--accent);
    border-radius: 2px 0 0 2px;
    transition: top 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .tab {
    padding: 8px 16px;
    text-align: left;
    font-size: 13px;
    color: var(--fg3);
    height: 40px;
    display: flex;
    align-items: center;
    transition: color var(--transition-fast);
  }

  .tab:hover {
    color: var(--fg);
  }

  .tab.active {
    color: var(--accent);
    font-weight: 500;
  }

  .settings-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .settings-header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .settings-header h2 {
    font-size: 16px;
    font-weight: 600;
  }

  .readonly-badge {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 8px;
    background: var(--bg3);
    color: var(--fg3);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .settings-body {
    flex: 1;
    overflow-y: auto;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
  }
</style>
