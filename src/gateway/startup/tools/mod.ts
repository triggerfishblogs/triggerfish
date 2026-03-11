/**
 * Tool executor assembly for main and scheduler sessions.
 *
 * @module
 */

export type { MainSessionState } from "./tool_executor.ts";
export {
  assembleMainToolExecutor,
  buildAuxiliaryExecutors,
  buildExtraSystemPromptGetter,
  buildExtraToolsGetter,
} from "./tool_executor.ts";
export type { TidepoolToolsRef, ToolInfraResult } from "./tool_infra_types.ts";
export { detectServiceAvailability } from "./tool_infra_types.ts";
export {
  buildMediaExecutors,
  buildSessionChannelExecutors,
  buildSessionScopedExecutors,
  initializeMainSessionState,
} from "./tool_infra_session.ts";
export {
  assembleToolInfraResult,
  buildCompositeToolExecutor,
  buildLlmAndWorkspaceFoundation,
  initializeBaseToolDeps,
  initializeToolInfrastructure,
} from "./tool_infra.ts";
export type { FactoryInfra } from "./scheduler_tool_assembly.ts";
export {
  assembleSchedulerToolExecutor,
  buildSchedulerGitHubExecutor,
  buildSchedulerPathClassifier,
  buildSchedulerSkillLoader,
} from "./scheduler_tool_assembly.ts";
