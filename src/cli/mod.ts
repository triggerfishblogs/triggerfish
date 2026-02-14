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
  generateSchtasksXml,
  generateSystemdUnit,
  generateWindowsTaskCommand,
} from "./daemon.ts";

export type { DaemonManagerType, DaemonOptions } from "./daemon.ts";

export {
  createKeypressReader,
  createLineEditor,
  createSuggestionEngine,
  parseKeypresses,
} from "./terminal.ts";

export type {
  Keypress,
  KeypressReader,
  LineEditor,
  SuggestionEngine,
} from "./terminal.ts";

export {
  createInputHistory,
  loadInputHistory,
  saveInputHistory,
} from "./history.ts";

export type { InputHistory } from "./history.ts";

export { createScreenManager } from "./screen.ts";
export type { ScreenManager } from "./screen.ts";

export {
  formatBanner,
  formatToolCallCompact,
  formatToolCompact,
  formatToolCallExpanded,
  formatToolResultExpanded,
  formatResponse,
  formatError,
  createScreenEventHandler,
} from "./chat_ui.ts";
export type { ToolDisplayMode } from "./chat_ui.ts";
