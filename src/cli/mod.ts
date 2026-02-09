/**
 * CLI module — entry point, command parsing, config loading, and daemon management.
 * @module
 */

export {
  loadConfig,
  parseCommand,
  validateConfig,
} from "./main.ts";

export type {
  Err,
  Ok,
  ParsedCommand,
  ParseOptions,
  Result,
  TriggerFishConfig,
} from "./main.ts";

export {
  detectDaemonManager,
  generateLaunchdPlist,
  generateSystemdUnit,
} from "./daemon.ts";

export type { DaemonManagerType, DaemonOptions } from "./daemon.ts";
