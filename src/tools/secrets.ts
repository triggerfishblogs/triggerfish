/**
 * LLM tool definitions and executor for secret management.
 *
 * Provides three LLM-callable tools:
 * - `secret_save`  — prompt the user for a secret value outside LLM context, store it
 * - `secret_list`  — list stored secret names (never values)
 * - `secret_delete` — delete a stored secret by name
 *
 * The secret value is NEVER accepted from the LLM. The `secret_save` tool
 * triggers an out-of-band input mechanism (terminal prompt or browser form)
 * via a platform-supplied `PromptCallback`. The actual value flows directly
 * into the SecretStore without passing through the LLM context.
 *
 * @module
 */

import type { ToolDefinition } from "../core/types/tool.ts";
import type { SecretStore } from "../core/secrets/keychain.ts";
import { createLogger } from "../core/logger/logger.ts";

const log = createLogger("secrets");

/**
 * Platform-supplied callback to collect a secret value from the user
 * through a secure, out-of-LLM-context channel.
 *
 * For CLI: shows a hidden terminal prompt (input not echoed).
 * For Tidepool: sends a `secret_prompt` WebSocket event and awaits browser response.
 *
 * @param name - The secret name (shown to the user as a hint)
 * @param hint - Optional descriptive hint about what the secret is for
 * @returns The entered secret value, or null if the user cancelled
 */
export type SecretPromptCallback = (
  name: string,
  hint?: string,
) => Promise<string | null>;

/** System prompt section explaining secret tool usage to the LLM. */
export const SECRET_TOOLS_SYSTEM_PROMPT = `## Secret Management

You have access to secure secret storage tools for managing passwords, API keys, and tokens.

### How to save a secret
Call \`secret_save\` with a descriptive name and an optional hint. The user will be prompted
to enter the value through a secure input channel — the actual value is NEVER passed through
your context and you will NEVER see it.

### How to reference a secret
Use the reference syntax \`{{secret:name}}\` anywhere in a tool argument where a password,
API key, or token is required. The Triggerfish runtime resolves these references to the real
values before executing the tool — the values are never visible to you.

Example: to use a stored API key named "openai_key" in a tool argument:
  \`{"api_key": "{{secret:openai_key}}"}\`

### Rules
- You MUST use the reference syntax. Never ask the user to type secrets in chat.
- Call \`secret_list\` to see which secrets are already stored before asking to save a new one.
- Do not log, repeat, or reveal secret values. They are never in your context.
- Secret names should be lowercase with underscores (e.g. "github_token", "smtp_password").`;

/** Tool definitions for the secret management tools. */
export function getSecretToolDefinitions(): readonly ToolDefinition[] {
  return [
    {
      name: "secret_save",
      description:
        "Prompt the user to securely enter a secret value (password, API key, token) " +
        "through a private input channel and store it under the given name. " +
        "The value is NEVER passed through LLM context. " +
        "Use secret_list first to check if the secret already exists.",
      parameters: {
        name: {
          type: "string",
          description:
            "Unique name for this secret (lowercase, underscores). " +
            "Example: 'github_token', 'smtp_password', 'openai_key'.",
          required: true,
        },
        hint: {
          type: "string",
          description:
            "Optional human-readable description shown to the user when prompting " +
            "for the value. Example: 'GitHub personal access token with repo scope'.",
        },
      },
    },
    {
      name: "secret_list",
      description:
        "List the names of all stored secrets. " +
        "Returns names only — secret values are never returned.",
      parameters: {},
    },
    {
      name: "secret_delete",
      description: "Delete a stored secret by name.",
      parameters: {
        name: {
          type: "string",
          description: "The name of the secret to delete.",
          required: true,
        },
      },
    },
  ];
}

/**
 * Create a tool executor for secret management tools.
 *
 * @param store - The SecretStore backend to read/write secrets.
 * @param prompt - Platform-supplied callback to collect the secret value from the user.
 * @returns An executor function returning null for non-secret tools (standard pattern).
 */
export function createSecretToolExecutor(
  store: SecretStore,
  prompt: SecretPromptCallback,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    switch (name) {
      case "secret_save": {
        const secretName = input.name;
        if (typeof secretName !== "string" || secretName.trim().length === 0) {
          return "Error: secret_save requires a 'name' argument (string).";
        }
        const trimmedName = secretName.trim();
        log.warn("Secret save requested via LLM tool", { name: trimmedName });
        const hint =
          typeof input.hint === "string" ? input.hint.trim() : undefined;

        // Collect the value through the out-of-band channel — never from LLM args.
        const value = await prompt(trimmedName, hint);
        if (value === null) {
          return `Secret '${trimmedName}' was not saved — input was cancelled.`;
        }
        if (value.length === 0) {
          return `Error: Secret value cannot be empty. Secret '${trimmedName}' was not saved.`;
        }

        const result = await store.setSecret(trimmedName, value);
        if (!result.ok) {
          return `Error saving secret '${trimmedName}': ${result.error}`;
        }
        return `Secret '${trimmedName}' saved successfully. Reference it in tool arguments as {{secret:${trimmedName}}}.`;
      }

      case "secret_list": {
        const result = await store.listSecrets();
        if (!result.ok) {
          return `Error listing secrets: ${result.error}`;
        }
        if (result.value.length === 0) {
          return "No secrets stored. Use secret_save to store a secret.";
        }
        const names = result.value.map((n) => `  - ${n}`).join("\n");
        return `Stored secrets (${result.value.length}):\n${names}\n\nReference them as {{secret:name}} in tool arguments.`;
      }

      case "secret_delete": {
        const secretName = input.name;
        if (typeof secretName !== "string" || secretName.trim().length === 0) {
          return "Error: secret_delete requires a 'name' argument (string).";
        }
        const trimmedName = secretName.trim();
        log.warn("Secret delete requested via LLM tool", { name: trimmedName });
        const result = await store.deleteSecret(trimmedName);
        if (!result.ok) {
          return `Error deleting secret '${trimmedName}': ${result.error}`;
        }
        return `Secret '${trimmedName}' deleted successfully.`;
      }

      default:
        return null;
    }
  };
}
