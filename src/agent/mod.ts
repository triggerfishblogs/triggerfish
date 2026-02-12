/**
 * Agent module — orchestrator and LLM provider abstraction.
 *
 * @module
 */

export type {
  LlmProvider,
  LlmProviderRegistry,
  LlmMessage,
  LlmUsage,
  LlmCompletionResult,
} from "./llm.ts";

export { createProviderRegistry } from "./llm.ts";

export type {
  Orchestrator,
  OrchestratorConfig,
  ProcessMessageOptions,
  ProcessMessageResult,
  HistoryEntry,
} from "./orchestrator.ts";

export { createOrchestrator } from "./orchestrator.ts";

// Provider implementations
export {
  createAnthropicProvider,
  createOpenAiProvider,
  createGoogleProvider,
  createLocalProvider,
  createOpenRouterProvider,
  createZaiProvider,
} from "./providers/mod.ts";

export type {
  AnthropicConfig,
  OpenAiConfig,
  GoogleConfig,
  LocalConfig,
  OpenRouterConfig,
  ZaiConfig,
} from "./providers/mod.ts";

export { loadProvidersFromConfig } from "./providers/config.ts";
export type { ProvidersConfig, ModelsConfig } from "./providers/config.ts";

// Plan mode
export type {
  PlanManager,
  PlanManagerOptions,
} from "./plan.ts";

export {
  createPlanManager,
  createPlanToolExecutor,
} from "./plan.ts";

export type {
  AgentMode,
  PlanModeState,
  ActivePlan,
  ImplementationPlan,
  PlanStep,
  PlanComplexity,
  PlanStatus,
  PlanRecord,
} from "./plan_types.ts";

export {
  DEFAULT_PLAN_STATE,
  PLAN_BLOCKED_TOOLS,
  PLAN_ALLOWED_TOOLS,
} from "./plan_types.ts";

export {
  buildPlanModePrompt,
  buildAwaitingApprovalPrompt,
  buildPlanExecutionPrompt,
  formatPlanAsMarkdown,
} from "./plan_prompt.ts";

export {
  getPlanToolDefinitions,
  PLAN_SYSTEM_PROMPT,
} from "./plan_tools.ts";
