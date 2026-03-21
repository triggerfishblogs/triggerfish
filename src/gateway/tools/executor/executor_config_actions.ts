/**
 * Config management action handlers.
 *
 * Individual action implementations for the config_manage tool.
 * Split from executor_config_manage.ts for file size.
 *
 * @module
 */

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
export function executeConfigGet(
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
export async function executeConfigSet(
  configPath: string,
  key: string,
  rawValue: string,
): Promise<string> {
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
export function executeConfigShow(configPath: string): string {
  const configResult = readConfigYaml(configPath);
  if (!configResult.ok) return `Error: ${configResult.error}`;
  return JSON.stringify(redactSecrets(configResult.value));
}

/** Handle add_channel action. */
export async function executeConfigAddChannel(
  configPath: string,
  channelType: string,
  channelConfigJson: string,
): Promise<string> {
  let channelConfig: Record<string, unknown>;
  try {
    channelConfig = JSON.parse(channelConfigJson);
  } catch (_err: unknown) {
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
export async function executeConfigRemoveChannel(
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
export function executeConfigListChannels(configPath: string): string {
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
export async function executeConfigSetSearch(
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
export async function executeConfigSetModels(
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
