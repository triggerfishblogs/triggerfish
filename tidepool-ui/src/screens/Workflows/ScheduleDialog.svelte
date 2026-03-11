<script lang="ts">
  import Modal from "../../lib/components/Modal.svelte";
  import { scheduleWorkflow } from "../../lib/stores/workflows.svelte.js";

  interface Props {
    workflowName: string;
    onclose: () => void;
  }

  let { workflowName, onclose }: Props = $props();

  let scheduleType: "cron" | "once" = $state("cron");
  let cronExpression = $state("");
  let onceDateTime = $state("");
  let error = $state("");

  function handleSubmit(): void {
    if (scheduleType === "cron") {
      if (!cronExpression.trim()) {
        error = "Enter a cron expression";
        return;
      }
      scheduleWorkflow(workflowName, cronExpression.trim());
    } else {
      if (!onceDateTime) {
        error = "Pick a date and time";
        return;
      }
      const iso = new Date(onceDateTime).toISOString();
      scheduleWorkflow(workflowName, `once:${iso}`);
    }
    onclose();
  }
</script>

<Modal {onclose}>
  <div class="schedule-dialog">
    <h3>Schedule Workflow</h3>
    <div class="field">
      <label class="field-label">Workflow</label>
      <div class="field-value">{workflowName}</div>
    </div>
    <div class="field">
      <label class="field-label">Type</label>
      <div class="radio-group">
        <label class="radio-label">
          <input type="radio" bind:group={scheduleType} value="cron" />
          Recurring (cron)
        </label>
        <label class="radio-label">
          <input type="radio" bind:group={scheduleType} value="once" />
          One-time (run at)
        </label>
      </div>
    </div>
    {#if scheduleType === "cron"}
      <div class="field">
        <label class="field-label">Cron Expression</label>
        <input
          type="text"
          class="text-input"
          placeholder="0 9 * * *"
          bind:value={cronExpression}
        />
      </div>
    {:else}
      <div class="field">
        <label class="field-label">Run At</label>
        <input
          type="datetime-local"
          class="text-input"
          bind:value={onceDateTime}
        />
      </div>
    {/if}
    {#if error}
      <div class="error">{error}</div>
    {/if}
    <div class="actions">
      <button class="cancel-btn" onclick={onclose}>Cancel</button>
      <button class="confirm-btn" onclick={handleSubmit}>Schedule</button>
    </div>
  </div>
</Modal>

<style>
  .schedule-dialog {
    width: 380px;
  }

  h3 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
  }

  .field {
    margin-bottom: 12px;
  }

  .field-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--fg3);
    margin-bottom: 4px;
  }

  .field-value {
    font-weight: 500;
    color: var(--accent);
  }

  .radio-group {
    display: flex;
    gap: 16px;
  }

  .radio-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--fg);
    cursor: pointer;
  }

  .text-input {
    width: 100%;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--bg);
    border: 1px solid var(--border);
    color: var(--fg);
    font-family: var(--font-mono);
    font-size: 13px;
  }

  .text-input:focus {
    border-color: var(--accent);
    outline: none;
  }

  .error {
    color: var(--status-red);
    font-size: 12px;
    margin-bottom: 8px;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
  }

  .cancel-btn,
  .confirm-btn {
    padding: 8px 16px;
    border-radius: var(--radius);
    font-weight: 600;
    font-size: 13px;
  }

  .cancel-btn {
    background: var(--bg4);
    color: var(--fg2);
  }

  .cancel-btn:hover {
    color: var(--fg);
  }

  .confirm-btn {
    background: var(--accent);
    color: var(--bg);
  }

  .confirm-btn:hover {
    opacity: 0.9;
  }
</style>
