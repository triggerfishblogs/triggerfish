<script lang="ts">
  import type { SettingsSection, ClassificationLevel } from "../../lib/types.js";
  import TaintBadge from "../../lib/components/TaintBadge.svelte";
  import Icon from "../../lib/components/Icon.svelte";

  interface Props {
    section: SettingsSection;
    data: Record<string, unknown>;
  }

  let { section, data }: Props = $props();

  const SAFE_FIELDS = new Set([
    "classification", "owner", "port", "webhook", "endpoint", "account",
    "interactive", "pairing", "default_group_mode", "from", "imap", "poll",
    "allowed", "pubsub", "phoneNumberId", "enabled", "interval", "ceiling",
    "quiet_hours", "mode", "default", "paths", "base_url", "overrides",
    "search_provider", "vault_path", "daily_notes", "exclude_folders",
    "folder_classifications", "auth_type", "rate_limit", "classification_floor",
    "server_url", "default_calendar", "description", "name", "model", "type",
  ]);

  const SECRET_FIELDS = new Set([
    "botToken", "appToken", "signingSecret", "accessToken", "verifyToken",
    "smtpApiKey", "imapPassword", "credentials_ref", "token", "apiKey",
    "secret", "password", "credential_ref",
  ]);

  function isSecret(key: string): boolean {
    return SECRET_FIELDS.has(key);
  }

  function toYaml(obj: unknown, indent: number = 0): string {
    const pad = "  ".repeat(indent);
    if (obj === null || obj === undefined) return `${pad}null`;
    if (typeof obj === "string") return `${pad}${obj}`;
    if (typeof obj === "number" || typeof obj === "boolean") return `${pad}${obj}`;
    if (Array.isArray(obj)) {
      return obj.map((item) => `${pad}- ${typeof item === "object" ? "\n" + toYaml(item, indent + 1) : item}`).join("\n");
    }
    if (typeof obj === "object") {
      return Object.entries(obj as Record<string, unknown>)
        .map(([k, v]) => {
          if (typeof v === "object" && v !== null) {
            return `${pad}${k}:\n${toYaml(v, indent + 1)}`;
          }
          return `${pad}${k}: ${isSecret(k) ? "••••••••" : v}`;
        })
        .join("\n");
    }
    return `${pad}${String(obj)}`;
  }
</script>

<div class="section-content">
  {#if section === "advanced"}
    <pre class="yaml-view">{toYaml(data)}</pre>
  {:else}
    {#each Object.entries(data) as [key, value]}
      <div class="field-group">
        <div class="field-label">{key}</div>
        <div class="field-value">
          {#if isSecret(key)}
            <span class="secret-val">
              <Icon name="lock" size={12} />
              ••••••••
            </span>
          {:else if typeof value === "object" && value !== null}
            {#if key === "classification" || key.includes("classification")}
              {#if typeof value === "string"}
                <TaintBadge level={value as ClassificationLevel} small />
              {:else}
                <pre class="code-val">{toYaml(value)}</pre>
              {/if}
            {:else}
              <pre class="code-val">{toYaml(value)}</pre>
            {/if}
          {:else if typeof value === "boolean"}
            <span class="bool-val" class:true={value}>{value ? "Yes" : "No"}</span>
          {:else}
            <span>{String(value ?? "—")}</span>
          {/if}
        </div>
      </div>
    {/each}
    {#if Object.keys(data).length === 0}
      <div class="empty">No configuration data</div>
    {/if}
  {/if}
</div>

<style>
  .section-content {
    padding: 16px;
    overflow-y: auto;
  }

  .field-group {
    padding: 8px 0;
    border-bottom: 1px solid var(--border);
  }

  .field-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--fg3);
    margin-bottom: 4px;
  }

  .field-value {
    font-size: 13px;
    color: var(--fg);
  }

  .secret-val {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--fg3);
    font-family: var(--font-mono);
  }

  .code-val {
    font-size: 12px;
    margin: 4px 0;
    padding: 8px;
    max-height: 200px;
    overflow: auto;
  }

  .bool-val {
    font-family: var(--font-mono);
    font-size: 12px;
  }

  .bool-val.true {
    color: var(--status-green);
  }

  .yaml-view {
    font-size: 12px;
    white-space: pre-wrap;
    word-break: break-all;
  }

  .empty {
    padding: 32px;
    text-align: center;
    color: var(--fg3);
  }
</style>
