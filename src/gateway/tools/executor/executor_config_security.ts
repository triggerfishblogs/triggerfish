/**
 * Config management security action handlers.
 *
 * Integration, domain classification, tool floor, filesystem path,
 * and logging configuration. Split from executor_config_actions.ts.
 *
 * @module
 */

import { parseClassification } from "../../../core/types/classification.ts";
import {
  readConfigYaml,
  writeConfigValue,
  writeConfigYaml,
} from "../../../core/config_io.ts";
import { createLogger } from "../../../core/logger/mod.ts";

const log = createLogger("config-manage");

/** Valid log levels. */
const LOG_LEVELS = new Set(["quiet", "normal", "verbose", "debug"]);

/** Handle set_integration action. */
export async function executeConfigSetIntegration(
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
export async function executeConfigSetDomainClassification(
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
export async function executeConfigSetToolFloor(
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
export async function executeConfigSetFilesystemPath(
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
export async function executeConfigSetLogging(
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
