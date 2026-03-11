<script lang="ts">
  import Modal from "./lib/components/Modal.svelte";
  import Icon from "./lib/components/Icon.svelte";
  import { getModalName, getModalHint, submitCredential } from "./lib/stores/modal.svelte.js";

  let username = $state("");
  let password = $state("");

  function handleSubmit(): void {
    submitCredential(username || null, password || null);
    username = "";
    password = "";
  }

  function handleCancel(): void {
    submitCredential(null, null);
    username = "";
    password = "";
  }
</script>

<Modal title="Credentials Required" onclose={handleCancel}>
  <div class="cred-form">
    <div class="cred-icon">
      <Icon name="lock" size={32} />
    </div>
    <p class="cred-name">{getModalName()}</p>
    {#if getModalHint()}
      <p class="cred-hint">{getModalHint()}</p>
    {/if}
    <input
      type="text"
      class="cred-input"
      placeholder="Username"
      bind:value={username}
    />
    <input
      type="password"
      class="cred-input"
      placeholder="Password"
      bind:value={password}
    />
    <div class="cred-actions">
      <button class="btn btn-ghost" onclick={handleCancel}>Cancel</button>
      <button class="btn btn-primary" onclick={handleSubmit}>Submit</button>
    </div>
  </div>
</Modal>

<style>
  .cred-form {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }

  .cred-icon {
    color: var(--accent);
    opacity: 0.7;
  }

  .cred-name {
    font-weight: 600;
    color: var(--fg);
  }

  .cred-hint {
    font-size: 13px;
    color: var(--fg2);
  }

  .cred-input {
    width: 100%;
  }

  .cred-actions {
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
