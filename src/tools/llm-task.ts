/**
 * llm_task tool — isolated one-shot LLM completions for subtasks.
 *
 * Enables the agent to run focused LLM calls (summarization, extraction,
 * classification, plan generation) without polluting the main conversation
 * history. Used heavily by the deep research skill.
 *
 * @module
 */

import type { ToolDefinition } from "../core/types/tool.ts";
import type { LlmProviderRegistry } from "../core/types/llm.ts";

/** Input shape for the llm_task tool. */
interface LlmTaskInput {
  readonly prompt: string;
  readonly system?: string;
  readonly model?: string;
}

/** Tool definitions for the llm_task tool. */
export function getLlmTaskToolDefinitions(): readonly ToolDefinition[] {
  return [
    {
      name: "llm_task",
      description:
        "Run a one-shot LLM prompt for isolated reasoning (summarization, classification, data extraction). Does not pollute main conversation context.",
      parameters: {
        prompt: { type: "string", description: "The prompt to send", required: true },
        system: { type: "string", description: "Optional system prompt", required: false },
        model: { type: "string", description: "Optional model/provider name override", required: false },
      },
    },
  ];
}

/** Platform-level system prompt section for the llm_task tool. */
export const LLM_TASK_SYSTEM_PROMPT = `## LLM Task Tool

llm_task runs an isolated LLM completion — the subtask sees only what you pass it,
not the full conversation. Use it for:
- Summarizing fetched content
- Extracting structured data from text
- Classifying or categorizing content
- Generating search queries or plans
- Any subtask that benefits from focused context

The result is returned as text. If you need structured data, ask for JSON in the prompt.`;

/**
 * Create a tool executor for the llm_task tool.
 *
 * Returns null for unrecognized tool names (chain pattern).
 */
export function createLlmTaskToolExecutor(
  registry: LlmProviderRegistry,
): (name: string, input: Record<string, unknown>) => Promise<string | null> {
  return async (name: string, input: Record<string, unknown>): Promise<string | null> => {
    if (name !== "llm_task") return null;

    const taskInput = input as unknown as LlmTaskInput;

    if (typeof taskInput.prompt !== "string" || taskInput.prompt.length === 0) {
      return "Error: llm_task requires a non-empty 'prompt' argument (string).";
    }

    const modelName = typeof taskInput.model === "string" ? taskInput.model : undefined;
    const provider = modelName
      ? registry.get(modelName) ?? registry.getDefault()
      : registry.getDefault();

    if (!provider) {
      return "Error: No LLM provider available.";
    }

    const messages: { role: string; content: string }[] = [];
    if (typeof taskInput.system === "string" && taskInput.system.length > 0) {
      messages.push({ role: "system", content: taskInput.system });
    }
    messages.push({ role: "user", content: taskInput.prompt });

    try {
      const result = await provider.complete(messages, [], {});
      return result.content;
    } catch (err) {
      return `Error in llm_task: ${err instanceof Error ? err.message : String(err)}`;
    }
  };
}
