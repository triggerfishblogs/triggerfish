<script lang="ts">
  import Modal from "./lib/components/Modal.svelte";
  import {
    getConfirmMessage,
    submitConfirm,
  } from "./lib/stores/modal.svelte.js";

  const message = $derived(getConfirmMessage());
</script>

<Modal title="Confirm Action" onclose={() => submitConfirm(false)}>
  <div class="confirm-form">
    <p class="confirm-text">{message}</p>
    <div class="confirm-actions">
      <button class="btn btn-ghost" onclick={() => submitConfirm(false)}>
        Deny
      </button>
      <button class="btn btn-primary" onclick={() => submitConfirm(true)}>
        Approve
      </button>
    </div>
  </div>
</Modal>

<style>
  .confirm-form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .confirm-text {
    color: var(--fg2);
    font-size: 14px;
    line-height: 1.5;
  }

  .confirm-actions {
    display: flex;
    gap: 8px;
    justify-content: flex-end;
    margin-top: 4px;
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
