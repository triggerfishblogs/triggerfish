/**
 * Orchestrator — factory, types, system prompt, and vision fallback.
 *
 * @module
 */

export type {
  ClassificationMapConfig,
  HistoryEntry,
  Orchestrator,
  OrchestratorConfig,
  OrchestratorEvent,
  OrchestratorEventCallback,
  ParsedToolCall,
  ProcessMessageOptions,
  ProcessMessageResult,
  ToolDefinition,
  ToolExecutor,
  CompactResult,
} from "./orchestrator_types.ts";

export {
  DEFAULT_SYSTEM_PROMPT,
  LEAKED_INTENT_PATTERN,
  mapToolPrefixClassifications,
  MAX_TOOL_ITERATIONS,
  SOFT_LIMIT_ITERATIONS,
} from "./orchestrator_types.ts";

export type {
  TokenAccumulator,
  OrchestratorState,
} from "./orchestrator.ts";

export { createOrchestrator } from "./orchestrator.ts";

export { readSpineFromDisk, buildFullSystemPrompt } from "./system_prompt.ts";

export { processVisionFallback } from "./vision_fallback.ts";
