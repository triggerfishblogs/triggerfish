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

/**
 * Platform-supplied callback to collect a secret value (and optional username)
 * from the user through a secure, out-of-LLM-context channel.
 *
 * For CLI: shows a hidden terminal prompt (input not echoed).
 * For Tidepool: sends a `secret_prompt` WebSocket event and awaits browser response.
 *
 * @param name - The secret name (shown to the user as a hint)
 * @param hint - Optional descriptive hint about what the secret is for
 * @param options - Optional flags controlling prompt behavior
 * @param options.withUsername - When true, also collect a username alongside the secret value
 * @returns The entered value (and optional username), or null if the user cancelled
 */
export type SecretPromptCallback = (
  name: string,
  hint?: string,
  options?: { readonly withUsername: boolean },
) => Promise<{ readonly value: string; readonly username?: string } | null>;

/** System prompt section explaining secret tool usage to the LLM. */
export const SECRET_TOOLS_SYSTEM_PROMPT = `## Secret Management

You have access to secure secret storage tools for managing passwords, API keys, and tokens.

### How to save a secret (value only)
Call \`secret_save\` with a descriptive name and an optional hint. The user will be prompted
to enter the value through a secure input channel — the actual value is NEVER passed through
your context and you will NEVER see it.

Reference syntax: \`{{secret:name}}\`

### How to save a credential pair (username + password)
Call \`secret_save\` with \`with_username: true\` when you need to store both a username and
a password together (e.g. email login, database credentials). The user will be prompted to
enter both values through a secure channel.

This stores two secrets automatically:
  - \`name:username\` — referenced as \`{{secret:name:username}}\`
  - \`name:password\` — referenced as \`{{secret:name:password}}\`

### How to reference a secret
Use \`{{secret:name}}\` anywhere in a tool argument. The Triggerfish runtime resolves these
references to the real values before executing the tool — the values are never visible to you.

Examples:
  \`{"api_key": "{{secret:openai_key}}"}\`
  \`{"user": "{{secret:smtp:username}}", "pass": "{{secret:smtp:password}}"}\`

### Rules
- You MUST use the reference syntax. Never ask the user to type secrets in chat.
- Call \`secret_list\` to see which secrets are already stored before asking to save a new one.
- Do not log, repeat, or reveal secret values. They are never in your context.
- Secret names should be lowercase with underscores (e.g. "github_token", "smtp_password").
- Use \`with_username: true\` whenever a username is needed alongside a password.`;

/** Tool definitions for the secret management tools. */
export function getSecretToolDefinitions(): readonly ToolDefinition[] {
  return [
    {
      name: "secret_save",
      description:
        "Prompt the user to securely enter a secret value (password, API key, token) " +
        "through a private input channel and store it under the given name. " +
        "The value is NEVER passed through LLM context. " +
        "Use secret_list first to check if the secret already exists. " +
        "Set with_username=true to also collect a username alongside the password — " +
        "the pair is stored as 'name:username' and 'name:password'.",
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
        with_username: {
          type: "boolean",
          description:
            "When true, also collect a username alongside the secret value. " +
            "Stores two secrets: 'name:username' and 'name:password'. " +
            "Use for login credentials that require both a username and a password.",
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
        const hint =
          typeof input.hint === "string" ? input.hint.trim() : undefined;
        const withUsername = input.with_username === true;

        // Collect the value (and optional username) through the out-of-band channel.
        const result = await prompt(trimmedName, hint, withUsername ? { withUsername: true } : undefined);
        if (result === null) {
          return `Secret '${trimmedName}' was not saved — input was cancelled.`;
        }
        if (result.value.length === 0) {
          return `Error: Secret value cannot be empty. Secret '${trimmedName}' was not saved.`;
        }

        if (withUsername) {
          // Store as two separate keys: name:password and name:username
          const passwordKey = `${trimmedName}:password`;
          const usernameKey = `${trimmedName}:username`;
          const username = result.username ?? "";

          const pwResult = await store.setSecret(passwordKey, result.value);
          if (!pwResult.ok) {
            return `Error saving secret '${passwordKey}': ${pwResult.error}`;
          }
          const unResult = await store.setSecret(usernameKey, username);
          if (!unResult.ok) {
            return `Error saving secret '${usernameKey}': ${unResult.error}`;
          }
          return (
            `Credential pair saved for '${trimmedName}'. ` +
            `Reference password as {{secret:${passwordKey}}}, ` +
            `username as {{secret:${usernameKey}}}.`
          );
        }

        const saveResult = await store.setSecret(trimmedName, result.value);
        if (!saveResult.ok) {
          return `Error saving secret '${trimmedName}': ${saveResult.error}`;
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
