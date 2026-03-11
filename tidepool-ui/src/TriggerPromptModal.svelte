<script lang="ts">
  import Modal from "./lib/components/Modal.svelte";
  import TaintBadge from "./lib/components/TaintBadge.svelte";
  import {
    getTriggerSource,
    getTriggerClassification,
    getTriggerPreview,
    submitTrigger,
  } from "./lib/stores/modal.svelte.js";
  import { getTaint } from "./lib/stores/session.svelte.js";
  import type { ClassificationLevel } from "./lib/types.js";

  const source = $derived(getTriggerSource());
  const classification = $derived(getTriggerClassification());
  const preview = $derived(getTriggerPreview());
  const sessionTaint = $derived(getTaint());

  const willEscalate = $derived(
    classification && sessionTaint && classification !== sessionTaint,
  );
</script>

<Modal title="Trigger Result" onclose={() => submitTrigger(false)}>
  <div class="trigger-form">
    <p class="trigger-text">
      A trigger has produced a result. Allow it into your conversation context?
    </p>
    <div class="trigger-meta">
      <div class="meta-row">
        <span class="meta-label">Source</span>
        <code class="trigger-source">{source}</code>
      </div>
      {#if classification}
        <div class="meta-row">
          <span class="meta-label">Classification</span>
          <TaintBadge level={classification as ClassificationLevel} small />
        </div>
      {/if}
    </div>
    {#if preview}
      <div class="trigger-preview">
        <span class="preview-label">Preview</span>
        <pre class="preview-text">{preview}</pre>
      </div>
    {/if}
    {#if willEscalate}
      <div class="trigger-warning">
        Your session will escalate from {sessionTaint} to {classification}.
      </div>
    {/if}
    <div class="trigger-actions">
      <button class="btn btn-ghost" onclick={() => submitTrigger(false)}>
        Dismiss
      </button>
      <button class="btn btn-primary" onclick={() => submitTrigger(true)}>
        Add to Context
      </button>
    </div>
  </div>
</Modal>

<style>
  .trigger-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .trigger-text {
    color: var(--fg2);
    font-size: 14px;
    line-height: 1.5;
  }

  .trigger-meta {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .meta-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .meta-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--fg3);
    min-width: 80px;
  }

  .trigger-source {
    padding: 2px 8px;
    background: var(--bg);
    border-radius: var(--radius-sm);
    color: var(--accent);
    font-size: 13px;
  }

  .trigger-preview {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .preview-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--fg3);
  }

  .preview-text {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 8px 10px;
    font-size: 12px;
    color: var(--fg2);
    max-height: 120px;
    overflow-y: auto;
    white-space: pre-wrap;
    margin: 0;
  }

  .trigger-warning {
    padding: 8px 12px;
    background: rgba(255, 217, 61, 0.1);
    border: 1px solid rgba(255, 217, 61, 0.3);
    border-radius: var(--radius);
    color: var(--taint-internal);
    font-size: 13px;
    font-weight: 500;
  }

  .trigger-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 8px;
  }

  .btn {
    padding: 8px 16px;
    border-radius: var(--radius);
    font-weight: 500;
    font-size: 13px;
  }

  .btn-ghost {
    color: var(--fg2);
  }

  .btn-ghost:hover {
    color: var(--fg);
    background: var(--bg3);
  }

  .btn-primary {
    background: var(--accent);
    color: var(--bg);
  }

  .btn-primary:hover {
    opacity: 0.9;
  }
</style>
