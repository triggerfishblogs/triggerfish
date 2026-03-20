/**
 * Configuration management executor.
 *
 * Handles all config_manage actions: get, set, show, channel management,
 * search/model/integration/domain/floor/path/logging configuration.
 *
 * All write operations create a backup before modifying config.
 *
 * @module
 */

import { parseClassification } from "../../../core/types/classification.ts";
import {
  deleteConfigValue,
  readConfigYaml,
  writeConfigValue,
  writeConfigYaml,
} from "../../../core/config_io.ts";
import { createLogger } from "../../../core/logger/mod.ts";

const log = createLogger("config-manage");

/** Secret field patterns — values containing these are masked in show output. */
const SECRET_PATTERNS = ["key", "secret", "token", "password", "credential"];

/** Valid log levels. */
const LOG_LEVELS = new Set(["quiet", "normal", "verbose", "debug"]);

/** Context required by the config_manage executor. */
export interface ConfigManageContext {
  readonly configPath: string;
}

/** Check if a key looks like it holds a secret. */
function isSecretKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SECRET_PATTERNS.some((p) => lower.includes(p));
}

/** Deeply redact secret values in a config object for display. */
function redactSecrets(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isSecretKey(key) && typeof value === "string") {
      result[key] = value.startsWith("secret:") ? value : "***REDACTED***";
    } else if (
      typeof value === "object" && value !== null && !Array.isArray(value)
    ) {
      result[key] = redactSecrets(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** Coerce string values to boolean or number if applicable. */
function coerceValue(raw: string): unknown {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  return raw;
}

/** Handle the get action. */
function executeGet(
  configPath: string,
  key: string,
): string {
  const configResult = readConfigYaml(configPath);
  if (!configResult.ok) return `Error: ${configResult.error}`;

  const parts = key.split(".");
  // deno-lint-ignore no-explicit-any
  let current: any = configResult.value;
  for (const part of parts) {
    if (
      current === undefined || current === null || typeof current !== "object"
    ) {
      return JSON.stringify({
        key,
        value: null,
        message: `${key} is not set.`,
      });
    }
    current = current[part];
  }
  return JSON.stringify({ key, value: current ?? null });
}

/** Handle the set action. */
async function executeSet(
  configPath: string,
  key: string,
  rawValue: string,
): Promise<string> {
  // Reject raw secrets
  if (isSecretKey(key) && !rawValue.startsWith("secret:")) {
    return "Error: Secret values must use 'secret:<name>' references. " +
      "Store the actual secret with: config_manage(action: 'set', key: 'secrets...') or use the secrets tool.";
  }

  const value = coerceValue(rawValue);
  const result = await writeConfigValue(configPath, key, value);
  if (!result.ok) return `Error: ${result.error}`;

  log.info("Config value set via config_manage", {
    operation: "configManageSet",
    key,
  });

  return JSON.stringify({
    success: true,
    key,
    message: `Set ${key} successfully.`,
    restart_needed: true,
  });
}

/** Handle the show action. */
function executeShow(configPath: string): string {
  const configResult = readConfigYaml(configPath);
  if (!configResult.ok) return `Error: ${configResult.error}`;
  return JSON.stringify(redactSecrets(configResult.value));
}

/** Handle add_channel action. */
async function executeAddChannel(
  configPath: string,
  channelType: string,
  channelConfigJson: string,
): Promise<string> {
  let channelConfig: Record<string, unknown>;
  try {
    channelConfig = JSON.parse(channelConfigJson);
  } catch {
    return "Error: channel_config must be valid JSON.";
  }

  const result = await writeConfigValue(
    configPath,
    `channels.${channelType}`,
    channelConfig,
  );
  if (!result.ok) return `Error: ${result.error}`;

  log.info("Channel added via config_manage", {
    operation: "configManageAddChannel",
    channelType,
  });

  return JSON.stringify({
    success: true,
    channel_type: channelType,
    message: `Channel '${channelType}' added.`,
    restart_needed: true,
  });
}

/** Handle remove_channel action. */
async function executeRemoveChannel(
  configPath: string,
  channelType: string,
): Promise<string> {
  const result = await deleteConfigValue(
    configPath,
    `channels.${channelType}`,
  );
  if (!result.ok) return `Error: ${result.error}`;

  log.info("Channel removed via config_manage", {
    operation: "configManageRemoveChannel",
    channelType,
  });

  return JSON.stringify({
    success: true,
    channel_type: channelType,
    message: `Channel '${channelType}' removed.`,
    restart_needed: true,
  });
}

/** Handle list_channels action. */
function executeListChannels(configPath: string): string {
  const configResult = readConfigYaml(configPath);
  if (!configResult.ok) return `Error: ${configResult.error}`;

  const channels = configResult.value.channels as
    | Record<string, unknown>
    | undefined;
  if (!channels || Object.keys(channels).length === 0) {
    return JSON.stringify({ channels: [], message: "No channels configured." });
  }
  return JSON.stringify({
    channels: Object.keys(channels),
    details: redactSecrets(channels),
  });
}

/** Handle set_search action. */
async function executeSetSearch(
  configPath: string,
  provider: string,
  apiKeySecret?: string,
): Promise<string> {
  const configResult = readConfigYaml(configPath);
  if (!configResult.ok) return `Error: ${configResult.error}`;

  const config = configResult.value;
  const web = (config.web ?? {}) as Record<string, unknown>;
  const search = (web.search ?? {}) as Record<string, unknown>;
  search.provider = provider;
  if (apiKeySecret) {
    search.api_key = `secret:${apiKeySecret.replace(/^secret:/, "")}`;
  }
  web.search = search;
  config.web = web;

  const writeResult = await writeConfigYaml(configPath, config);
  if (!writeResult.ok) return `Error: ${writeResult.error}`;

  log.info("Search provider configured via config_manage", {
    operation: "configManageSetSearch",
    provider,
  });

  return JSON.stringify({
    success: true,
    message: `Search provider set to '${provider}'.`,
    restart_needed: true,
  });
}

/** Handle set_models action. */
async function executeSetModels(
  configPath: string,
  provider: string,
  model: string,
): Promise<string> {
  const configResult = readConfigYaml(configPath);
  if (!configResult.ok) return `Error: ${configResult.error}`;

  const config = configResult.value;
  const models = (config.models ?? {}) as Record<string, unknown>;
  const primary = (models.primary ?? {}) as Record<string, unknown>;
  primary.provider = provider;
  primary.model = model;
  models.primary = primary;
  config.models = models;

  const writeResult = await writeConfigYaml(configPath, config);
  if (!writeResult.ok) return `Error: ${writeResult.error}`;

  log.info("Model configuration updated via config_manage", {
    operation: "configManageSetModels",
    provider,
    model,
  });

  return JSON.stringify({
    success: true,
    message: `Primary model set to '${provider}/${model}'.`,
    restart_needed: true,
  });
}

/** Handle set_integration action. */
async function executeSetIntegration(
  configPath: string,
  integration: string,
  input: Record<string, unknown>,
): Promise<string> {
  const enabled = input.enabled === "true" || input.enabled === true;
  const classificationRaw = input.classification as string | undefined;

  if (classificationRaw) {
    const classResult = parseClassification(classificationRaw);
    if (!classResult.ok) return `Error: ${classResult.error}`;
  }

  const configResult = readConfigYaml(configPath);
  if (!configResult.ok) return `Error: ${configResult.error}`;

  const config = configResult.value;
  const section = (config[integration] ?? {}) as Record<string, unknown>;
  section.enabled = enabled;
  if (classificationRaw) section.classification = classificationRaw;
  config[integration] = section;

  const writeResult = await writeConfigYaml(configPath, config);
  if (!writeResult.ok) return `Error: ${writeResult.error}`;

  log.info("Integration configured via config_manage", {
    operation: "configManageSetIntegration",
    integration,
    enabled,
  });

  return JSON.stringify({
    success: true,
    message: `Integration '${integration}' ${
      enabled ? "enabled" : "disabled"
    }.`,
    restart_needed: true,
  });
}

/** Handle set_domain_classification action. */
async function executeSetDomainClassification(
  configPath: string,
  domainPattern: string,
  classification: string,
): Promise<string> {
  const classResult = parseClassification(classification);
  if (!classResult.ok) return `Error: ${classResult.error}`;

  const result = await writeConfigValue(
    configPath,
    `web.domains.classifications.${domainPattern}`,
    classResult.value,
  );
  if (!result.ok) return `Error: ${result.error}`;

  log.info("Domain classification set via config_manage", {
    operation: "configManageSetDomainClassification",
    domainPattern,
    classification: classResult.value,
  });

  return JSON.stringify({
    success: true,
    message: `Domain '${domainPattern}' classified as ${classResult.value}.`,
    restart_needed: true,
  });
}

/** Handle set_tool_floor action. */
async function executeSetToolFloor(
  configPath: string,
  toolPrefix: string,
  classification: string,
): Promise<string> {
  const classResult = parseClassification(classification);
  if (!classResult.ok) return `Error: ${classResult.error}`;

  const result = await writeConfigValue(
    configPath,
    `tools.floors.${toolPrefix}`,
    classResult.value,
  );
  if (!result.ok) return `Error: ${result.error}`;

  log.info("Tool floor set via config_manage", {
    operation: "configManageSetToolFloor",
    toolPrefix,
    classification: classResult.value,
  });

  return JSON.stringify({
    success: true,
    message: `Tool floor for '${toolPrefix}' set to ${classResult.value}.`,
    restart_needed: true,
  });
}

/** Handle set_filesystem_path action. */
async function executeSetFilesystemPath(
  configPath: string,
  path: string,
  classification: string,
): Promise<string> {
  const classResult = parseClassification(classification);
  if (!classResult.ok) return `Error: ${classResult.error}`;

  const result = await writeConfigValue(
    configPath,
    `filesystem.paths.${path.replace(/\./g, "\\.")}`,
    classResult.value,
  );
  if (!result.ok) return `Error: ${result.error}`;

  log.info("Filesystem path classification set via config_manage", {
    operation: "configManageSetFilesystemPath",
    path,
    classification: classResult.value,
  });

  return JSON.stringify({
    success: true,
    message: `Path '${path}' classified as ${classResult.value}.`,
    restart_needed: true,
  });
}

/** Handle set_logging action. */
async function executeSetLogging(
  configPath: string,
  level: string,
): Promise<string> {
  if (!LOG_LEVELS.has(level)) {
    return `Error: Invalid log level '${level}'. Valid levels: quiet, normal, verbose, debug.`;
  }

  const result = await writeConfigValue(configPath, "logging.level", level);
  if (!result.ok) return `Error: ${result.error}`;

  log.info("Log level set via config_manage", {
    operation: "configManageSetLogging",
    level,
  });

  return JSON.stringify({
    success: true,
    message: `Log level set to '${level}'.`,
    restart_needed: true,
  });
}

/**
 * Create a SubsystemExecutor for config_manage.
 *
 * Returns null for non-matching tool names so the dispatch chain
 * continues to the next executor.
 */
export function createConfigManageExecutor(
  ctx: ConfigManageContext,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (
    name: string,
    input: Record<string, unknown>,
  ): Promise<string | null> => {
    if (name !== "config_manage") return null;

    const action = input.action as string | undefined;
    if (!action) {
      return "Error: config_manage requires an 'action' parameter.";
    }

    switch (action) {
      case "get": {
        const key = input.key as string | undefined;
        if (!key) {
          return "Error: config_manage(get) requires a 'key' parameter.";
        }
        return executeGet(ctx.configPath, key);
      }
      case "set": {
        const key = input.key as string | undefined;
        const value = input.value as string | undefined;
        if (!key) {
          return "Error: config_manage(set) requires a 'key' parameter.";
        }
        if (value === undefined) {
          return "Error: config_manage(set) requires a 'value' parameter.";
        }
        return await executeSet(ctx.configPath, key, value);
      }
      case "show":
        return executeShow(ctx.configPath);
      case "add_channel": {
        const channelType = input.channel_type as string | undefined;
        const channelConfig = input.channel_config as string | undefined;
        if (!channelType) {
          return "Error: config_manage(add_channel) requires a 'channel_type' parameter.";
        }
        if (!channelConfig) {
          return "Error: config_manage(add_channel) requires a 'channel_config' parameter (JSON).";
        }
        return await executeAddChannel(
          ctx.configPath,
          channelType,
          channelConfig,
        );
      }
      case "remove_channel": {
        const channelType = input.channel_type as string | undefined;
        if (!channelType) {
          return "Error: config_manage(remove_channel) requires a 'channel_type' parameter.";
        }
        return await executeRemoveChannel(ctx.configPath, channelType);
      }
      case "list_channels":
        return executeListChannels(ctx.configPath);
      case "set_search": {
        const provider = input.provider as string | undefined;
        if (!provider) {
          return "Error: config_manage(set_search) requires a 'provider' parameter.";
        }
        return await executeSetSearch(
          ctx.configPath,
          provider,
          input.api_key_secret as string | undefined,
        );
      }
      case "set_models": {
        const provider = input.provider as string | undefined;
        const model = input.model as string | undefined;
        if (!provider || !model) {
          return "Error: config_manage(set_models) requires 'provider' and 'model' parameters.";
        }
        return await executeSetModels(ctx.configPath, provider, model);
      }
      case "set_integration": {
        const integration = input.integration as string | undefined;
        if (!integration) {
          return "Error: config_manage(set_integration) requires an 'integration' parameter.";
        }
        return await executeSetIntegration(ctx.configPath, integration, input);
      }
      case "set_domain_classification": {
        const domainPattern = input.domain_pattern as string | undefined;
        const classification = input.classification as string | undefined;
        if (!domainPattern || !classification) {
          return "Error: config_manage(set_domain_classification) requires 'domain_pattern' and 'classification'.";
        }
        return await executeSetDomainClassification(
          ctx.configPath,
          domainPattern,
          classification,
        );
      }
      case "set_tool_floor": {
        const toolPrefix = input.tool_prefix as string | undefined;
        const classification = input.classification as string | undefined;
        if (!toolPrefix || !classification) {
          return "Error: config_manage(set_tool_floor) requires 'tool_prefix' and 'classification'.";
        }
        return await executeSetToolFloor(
          ctx.configPath,
          toolPrefix,
          classification,
        );
      }
      case "set_filesystem_path": {
        const path = input.path as string | undefined;
        const classification = input.classification as string | undefined;
        if (!path || !classification) {
          return "Error: config_manage(set_filesystem_path) requires 'path' and 'classification'.";
        }
        return await executeSetFilesystemPath(
          ctx.configPath,
          path,
          classification,
        );
      }
      case "set_logging": {
        const level = input.level as string | undefined;
        if (!level) {
          return "Error: config_manage(set_logging) requires a 'level' parameter.";
        }
        return await executeSetLogging(ctx.configPath, level);
      }
      default:
        return `Error: Unknown action "${action}". Valid actions: get, set, show, add_channel, remove_channel, list_channels, set_search, set_models, set_integration, set_domain_classification, set_tool_floor, set_filesystem_path, set_logging.`;
    }
  };
}
