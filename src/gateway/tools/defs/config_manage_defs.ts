/**
 * Configuration management tool definition.
 *
 * Provides a `config_manage` tool for reading, writing, and managing
 * all triggerfish.yaml configuration sections: channels, models, search,
 * integrations, domains, tool floors, filesystem paths, webhooks, logging.
 *
 * @module
 */

import type { ToolDefinition } from "../../../core/types/tool.ts";

/** Build the config_manage tool definition. */
function buildConfigManageDef(): ToolDefinition {
  return {
    name: "config_manage",
    description:
      "Triggerfish configuration management. Actions: get, set, show, add_channel, remove_channel, list_channels, set_search, set_models, set_integration, set_domain_classification, set_tool_floor, set_filesystem_path, set_logging.\n" +
      "- get: read a config value. Params: key (required, dotted path)\n" +
      "- set: write a config value. Params: key (required), value (required)\n" +
      "- show: show full config (secrets redacted)\n" +
      "- add_channel: add a channel. Params: channel_type (required), channel_config (required, JSON)\n" +
      "- remove_channel: remove a channel. Params: channel_type (required)\n" +
      "- list_channels: list configured channels\n" +
      "- set_search: configure search provider. Params: provider (required), api_key_secret?\n" +
      "- set_models: configure LLM models. Params: provider (required), model (required)\n" +
      "- set_integration: configure an integration. Params: integration (required), enabled, classification?\n" +
      "- set_domain_classification: set a domain classification. Params: domain_pattern (required), classification (required)\n" +
      "- set_tool_floor: set minimum classification for a tool prefix. Params: tool_prefix (required), classification (required)\n" +
      "- set_filesystem_path: classify a filesystem path. Params: path (required), classification (required)\n" +
      "- set_logging: set log level. Params: level (required: quiet/normal/verbose/debug)",
    parameters: {
      action: {
        type: "string",
        description: "The operation to perform",
        required: true,
      },
      key: {
        type: "string",
        description:
          "Dotted config key path (get/set). E.g. 'models.primary.model'",
        required: false,
      },
      value: {
        type: "string",
        description:
          "Value to set (set only). Booleans and numbers are auto-coerced.",
        required: false,
      },
      channel_type: {
        type: "string",
        description:
          "Channel type (add_channel/remove_channel). E.g. telegram, slack, discord, whatsapp, webchat, email, signal",
        required: false,
      },
      channel_config: {
        type: "string",
        description: "Channel configuration as JSON object (add_channel only)",
        required: false,
      },
      provider: {
        type: "string",
        description:
          "Provider name (set_search/set_models). E.g. 'brave', 'anthropic', 'openai'",
        required: false,
      },
      model: {
        type: "string",
        description:
          "Model name (set_models). E.g. 'claude-sonnet-4-5-20250514'",
        required: false,
      },
      api_key_secret: {
        type: "string",
        description:
          "Secret reference name for API key (set_search). Use 'secret:<name>' format.",
        required: false,
      },
      integration: {
        type: "string",
        description:
          "Integration name (set_integration). E.g. 'github', 'notion', 'caldav'",
        required: false,
      },
      classification: {
        type: "string",
        description:
          "Classification level: PUBLIC, INTERNAL, CONFIDENTIAL, or RESTRICTED",
        required: false,
      },
      domain_pattern: {
        type: "string",
        description:
          "Domain pattern (set_domain_classification). E.g. '*.internal.corp'",
        required: false,
      },
      tool_prefix: {
        type: "string",
        description:
          "Tool name prefix (set_tool_floor). E.g. 'github_', 'google_'",
        required: false,
      },
      path: {
        type: "string",
        description:
          "Filesystem path (set_filesystem_path). E.g. '/home/user/secrets'",
        required: false,
      },
      level: {
        type: "string",
        description:
          "Log level (set_logging). One of: quiet, normal, verbose, debug",
        required: false,
      },
      enabled: {
        type: "string",
        description:
          "Enable/disable flag as 'true' or 'false' (set_integration)",
        required: false,
      },
    },
  };
}

/** Get the config management tool definitions. */
export function getConfigManageToolDefinitions(): readonly ToolDefinition[] {
  return [buildConfigManageDef()];
}

/** System prompt section explaining config_manage to the LLM. */
export const CONFIG_MANAGE_SYSTEM_PROMPT = `## Configuration Management

Use \`config_manage\` to read or modify triggerfish.yaml settings.

**Reading:**
- \`action: "show"\` — full config (secrets redacted)
- \`action: "get", key: "models.primary.model"\` — read a single value
- \`action: "list_channels"\` — list configured channels

**Writing:**
- \`action: "set", key: "...", value: "..."\` — set any config value
- \`action: "add_channel", channel_type: "telegram", channel_config: "{\\"bot_token\\": \\"secret:tg-token\\"}"\`
- \`action: "remove_channel", channel_type: "telegram"\`
- \`action: "set_search", provider: "brave", api_key_secret: "brave-api-key"\`
- \`action: "set_models", provider: "anthropic", model: "claude-sonnet-4-5-20250514"\`
- \`action: "set_integration", integration: "github", enabled: "true", classification: "INTERNAL"\`
- \`action: "set_domain_classification", domain_pattern: "*.corp.example.com", classification: "CONFIDENTIAL"\`
- \`action: "set_tool_floor", tool_prefix: "github_", classification: "INTERNAL"\`
- \`action: "set_filesystem_path", path: "/home/user/secrets", classification: "RESTRICTED"\`
- \`action: "set_logging", level: "verbose"\`

Most config writes require a daemon restart to take effect. The response indicates whether restart is needed.
Secret values must use \`secret:<name>\` references — raw API keys are rejected.

**NEVER use config_manage for MCP servers.** Use \`mcp_manage\` exclusively for adding, removing, enabling, disabling, or checking MCP server status. Do not use \`config_manage(action: "set", key: "mcp.servers...")\`.

**CRITICAL:** NEVER use \`read_file\`, \`write_file\`, \`edit_file\`, or \`run_command\` on \`triggerfish.yaml\`. NEVER use \`run_command\` with \`triggerfish config\` CLI commands. The \`config_manage\` and \`mcp_manage\` tools are the ONLY way to read or modify configuration. Direct file access to triggerfish.yaml is forbidden — it is a RESTRICTED file.`;
