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

export type { ModelInfo } from "./models.ts";
export { getModelInfo } from "./models.ts";

export type {
  Orchestrator,
  OrchestratorConfig,
  ProcessMessageOptions,
  ProcessMessageResult,
  HistoryEntry,
} from "./orchestrator.ts";

export type { CompactorConfig, CompactResult } from "./compactor.ts";

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
export type { ProvidersConfig, ModelsConfig, PrimaryModelRef } from "./providers/config.ts";

// Rate limiting
export { createRateLimiter, createRateLimitedProvider } from "./rate_limiter.ts";
export type {
  RateLimiterConfig,
  RateLimiter,
  RateLimiterSnapshot,
} from "./rate_limiter.ts";

// OpenAI rate limit constants
export { getOpenAiLimits } from "./providers/openai_limits.ts";
export type { OpenAiModelLimits, OpenAiTier } from "./providers/openai_limits.ts";
export {
  GPT4O_FREE,
  GPT4O_TIER1,
  GPT4O_TIER2,
  GPT4O_TIER3,
  GPT4O_TIER4,
  GPT4O_TIER5,
  GPT4O_MINI_FREE,
  GPT4O_MINI_TIER1,
  GPT4O_MINI_TIER2,
  GPT4O_MINI_TIER3,
  GPT4O_MINI_TIER4,
  GPT4O_MINI_TIER5,
  O1_TIER1,
  O1_TIER2,
  O1_TIER3,
  O1_TIER4,
  O1_TIER5,
  O3_MINI_TIER1,
  O3_MINI_TIER2,
  O3_MINI_TIER3,
  O3_MINI_TIER4,
  O3_MINI_TIER5,
} from "./providers/openai_limits.ts";

// Plan mode
export type {
  PlanManager,
  PlanManagerOptions,
} from "./plan/mod.ts";

export {
  createPlanManager,
  createPlanToolExecutor,
} from "./plan/mod.ts";

export type {
  AgentMode,
  PlanModeState,
  ActivePlan,
  ImplementationPlan,
  PlanStep,
  PlanComplexity,
  PlanStatus,
  PlanRecord,
} from "./plan/mod.ts";

export {
  DEFAULT_PLAN_STATE,
  PLAN_BLOCKED_TOOLS,
  PLAN_ALLOWED_TOOLS,
} from "./plan/mod.ts";

export {
  buildPlanModePrompt,
  buildAwaitingApprovalPrompt,
  buildPlanExecutionPrompt,
  formatPlanAsMarkdown,
} from "./plan/mod.ts";

export {
  getPlanToolDefinitions,
  PLAN_SYSTEM_PROMPT,
} from "./plan/mod.ts";
