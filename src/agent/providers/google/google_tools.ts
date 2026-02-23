/**
 * Gemini tool conversion and function call extraction.
 *
 * Converts OpenAI-format tool definitions to Gemini functionDeclarations
 * format, and extracts function calls from Gemini responses into the
 * unified tool_use format used by the orchestrator.
 *
 * @module
 */

import type { GeminiPart } from "./google_content.ts";

/** OpenAI-format tool definition shape. */
interface OpenAiToolDef {
  readonly type: string;
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
  };
}

/** Type guard for OpenAI tool definition format. */
function isOpenAiToolDef(t: unknown): t is OpenAiToolDef {
  const td = t as Record<string, unknown>;
  return td !== null && typeof td === "object" &&
    typeof td.function === "object";
}

/** Convert OpenAI-format tool definitions to Gemini functionDeclarations format. */
export function convertToolsToGeminiFormat(
  tools: readonly unknown[],
): Record<string, unknown>[] {
  if (!Array.isArray(tools) || tools.length === 0) return [];
  return tools
    .filter(isOpenAiToolDef)
    .map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    }));
}

/** Build Gemini model config with optional system instruction and tools. */
export function buildGeminiModelConfig(
  systemInstruction: string | undefined,
  tools: readonly unknown[],
): Record<string, unknown> {
  const modelConfig: Record<string, unknown> = {};
  if (systemInstruction) {
    modelConfig.systemInstruction = systemInstruction;
  }
  const geminiTools = convertToolsToGeminiFormat(tools);
  if (geminiTools.length > 0) {
    modelConfig.tools = [{ functionDeclarations: geminiTools }];
  }
  return modelConfig;
}

/** Gemini function call shape from a response part. */
interface GeminiFunctionCall {
  readonly name: string;
  readonly args: Record<string, unknown>;
}

/** Convert a single Gemini function call to unified tool_use format. */
function convertFunctionCallToToolUse(fc: GeminiFunctionCall): unknown {
  return {
    type: "tool_use",
    id: `gemini_${crypto.randomUUID().slice(0, 8)}`,
    name: fc.name,
    input: fc.args ?? {},
  };
}

/**
 * Extract function calls from a Gemini response.
 *
 * Returns them in Anthropic tool_use format: `{ type: "tool_use", id, name, input }`
 * so the orchestrator's native tool call parser can handle them uniformly.
 */
// deno-lint-ignore no-explicit-any
export function extractGeminiFunctionCalls(response: any): unknown[] {
  const calls: unknown[] = [];
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      const fc = part.functionCall as GeminiFunctionCall | undefined;
      if (fc) {
        calls.push(convertFunctionCallToToolUse(fc));
      }
    }
  }
  return calls;
}

/** Extract text safely from Gemini response (returns empty string on failure). */
// deno-lint-ignore no-explicit-any
export function extractGeminiResponseText(response: any): string {
  try {
    return response.text();
  } catch {
    return "";
  }
}

// Re-export GeminiPart for convenience
export type { GeminiPart };
