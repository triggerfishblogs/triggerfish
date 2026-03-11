<script lang="ts">
  import Modal from "./lib/components/Modal.svelte";
  import Icon from "./lib/components/Icon.svelte";
  import { getModalName, getModalHint, submitSecret, closeModal } from "./lib/stores/modal.svelte.js";

  let value = $state("");

  function handleSubmit(): void {
    submitSecret(value || null);
    value = "";
  }

  function handleCancel(): void {
    submitSecret(null);
    value = "";
  }

  function handleKeydown(e: KeyboardEvent): void {
    if (e.key === "Enter") handleSubmit();
  }
</script>

<Modal title="Secret Required" onclose={handleCancel}>
  <div class="secret-form">
    <div class="secret-icon">
      <Icon name="lock" size={32} />
    </div>
    <p class="secret-name">{getModalName()}</p>
    {#if getModalHint()}
      <p class="secret-hint">{getModalHint()}</p>
    {/if}
    <input
      type="password"
      class="secret-input"
      placeholder="Enter secret value..."
      bind:value
      onkeydown={handleKeydown}
    />
    <div class="secret-actions">
      <button class="btn btn-ghost" onclick={handleCancel}>Cancel</button>
      <button class="btn btn-primary" onclick={handleSubmit}>Submit</button>
    </div>
  </div>
</Modal>

<style>
  .secret-form {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .secret-icon {
    color: var(--accent);
    opacity: 0.7;
  }

  .secret-name {
    font-weight: 600;
    color: var(--fg);
  }

  .secret-hint {
    font-size: 13px;
    color: var(--fg2);
  }

  .secret-input {
    width: 100%;
  }

  .secret-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    width: 100%;
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
