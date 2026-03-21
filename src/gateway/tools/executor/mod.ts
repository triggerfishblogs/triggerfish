/**
 * Tool executor dispatch and built-in handlers.
 *
 * @module
 */

export {
  buildCoreSubsystems,
  buildExtendedSubsystems,
  buildTodoExecutor,
  buildWebExecutor,
  createToolExecutor,
  dispatchAgentTool,
  dispatchFilesystemTool,
  dispatchSubagentTask,
  dispatchToSubsystems,
  listRegisteredAgents,
} from "./executor.ts";
export type {
  SubsystemExecutor,
  ToolExecutorOptions,
} from "./executor_types.ts";
export { dispatchCronTool } from "./executor_cron.ts";
export {
  enumerateDirectoryContents,
  executeEditFile,
  executeListDirectory,
  executeReadFile,
  executeRunCommand,
  executeSearchFiles,
  executeWriteFile,
  invokeShellCommand,
  loadFileContent,
  modifyFileContent,
  persistFileContent,
  queryFilesystem,
} from "./executor_filesystem.ts";
export {
  createCwdTracker,
  type CwdTracker,
  syncCwdAfterCommand,
  updateCwdAfterCommand,
} from "./executor_cwd.ts";
export {
  type ConfigManageContext,
  createConfigManageExecutor,
} from "./executor_config_manage.ts";
export {
  executeConfigGet,
  executeConfigSet,
  executeConfigShow,
} from "./executor_config_actions.ts";
export {
  executeConfigSetDomainClassification,
  executeConfigSetFilesystemPath,
  executeConfigSetIntegration,
  executeConfigSetLogging,
  executeConfigSetToolFloor,
} from "./executor_config_security.ts";
export {
  createMcpManageExecutor,
  type McpManageContext,
} from "./executor_mcp_manage.ts";
export {
  createDaemonManageExecutor,
  type DaemonManageContext,
} from "./executor_daemon_manage.ts";
export {
  createSpineManageExecutor,
  type SpineManageContext,
} from "./executor_spine_manage.ts";
