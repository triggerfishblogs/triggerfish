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
} from "./providers/mod.ts";

export type {
  AnthropicConfig,
  OpenAiConfig,
  GoogleConfig,
  LocalConfig,
  OpenRouterConfig,
} from "./providers/mod.ts";

export { loadProvidersFromConfig } from "./providers/config.ts";
export type { ProvidersConfig, ModelsConfig } from "./providers/config.ts";
