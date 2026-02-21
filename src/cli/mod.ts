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
} from "./daemon/daemon.ts";

export type { DaemonManagerType, DaemonOptions } from "./daemon/daemon.ts";

export {
  createKeypressReader,
  createLineEditor,
  createSuggestionEngine,
  parseKeypresses,
} from "./terminal/terminal.ts";

export type {
  Keypress,
  KeypressReader,
  LineEditor,
  SuggestionEngine,
} from "./terminal/terminal.ts";

export {
  createInputHistory,
  loadInputHistory,
  saveInputHistory,
} from "./chat/history.ts";

export type { InputHistory } from "./chat/history.ts";

export { createScreenManager } from "./terminal/screen.ts";
export type { ScreenManager } from "./terminal/screen.ts";

export {
  formatBanner,
  formatToolCallCompact,
  formatToolCompact,
  formatToolCallExpanded,
  formatToolResultExpanded,
  formatResponse,
  formatError,
  createScreenEventHandler,
} from "./chat/chat_ui.ts";
export type { ToolDisplayMode } from "./chat/chat_ui.ts";
