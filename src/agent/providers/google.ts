/**
 * Google (Gemini) LLM provider implementation.
 *
 * Supports Gemini models via the Google Generative AI SDK.
 *
 * @module
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  LlmCompletionResult,
  LlmMessage,
  LlmProvider,
  LlmStreamChunk,
} from "../llm.ts";
import { getModelInfo } from "../models.ts";
import type { ContentBlock } from "../../core/image/content.ts";

/** Configuration for the Google provider. */
export interface GoogleConfig {
  /** Google AI API key. Falls back to GOOGLE_API_KEY env var. */
  readonly apiKey?: string;
  /** Model to use. Default: gemini-2.0-flash */
  readonly model?: string;
  /** Maximum tokens for completion. Default: 4096 */
  readonly maxTokens?: number;
}

/** Gemini parts union type. */
type GeminiPart = { text: string } | {
  inlineData: { mimeType: string; data: string };
};

/** Convert message content to Gemini parts format. */
function convertContentToGeminiParts(
  content: string | unknown,
): GeminiPart[] {
  if (typeof content === "string") return [{ text: content }];
  if (!Array.isArray(content)) return [{ text: JSON.stringify(content) }];
  const parts: GeminiPart[] = [];
  for (const block of content as ContentBlock[]) {
    if (block.type === "text") {
      parts.push({ text: block.text });
    } else if (block.type === "image") {
      parts.push({
        inlineData: {
          mimeType: block.source.media_type,
          data: block.source.data,
        },
      });
    }
  }
  return parts.length > 0 ? parts : [{ text: "" }];
}

/** Extract system instruction string from messages. */
function extractGeminiSystemInstruction(
  messages: readonly LlmMessage[],
): string | undefined {
  const systemMessage = messages.find((m) => m.role === "system");
  if (!systemMessage) return undefined;
  return typeof systemMessage.content === "string"
    ? systemMessage.content
    : JSON.stringify(systemMessage.content);
}

/** Build Gemini model config with optional system instruction and tools. */
function buildGeminiModelConfig(
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

/** Build Gemini chat history and user parts from messages. */
function buildGeminiChatParts(
  messages: readonly LlmMessage[],
): {
  history: { role: string; parts: GeminiPart[] }[];
  userParts: GeminiPart[];
} {
  const nonSystem = messages.filter((m) => m.role !== "system");
  const history = nonSystem
    .slice(0, -1)
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: convertContentToGeminiParts(m.content),
    }));
  const lastMessage = nonSystem.at(-1);
  const userParts = lastMessage
    ? convertContentToGeminiParts(lastMessage.content)
    : [{ text: "" }];
  return { history, userParts };
}

/** Race a promise against an AbortSignal. */
function raceWithAbortSignal<T>(
  promise: Promise<T>,
  signal: AbortSignal | undefined,
): Promise<T> {
  if (!signal) return promise;
  const abortPromise = new Promise<never>((_resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Operation cancelled", "AbortError"));
      return;
    }
    signal.addEventListener("abort", () => {
      reject(new DOMException("Operation cancelled", "AbortError"));
    }, { once: true });
  });
  return Promise.race([promise, abortPromise]);
}

/** Extract text safely from Gemini response (throws on function-call-only). */
function extractGeminiResponseText(
  // deno-lint-ignore no-explicit-any
  response: any,
): string {
  try {
    return response.text();
  } catch {
    return "";
  }
}

// ─── Provider context and chat preparation ──────────────────────────────────

/** Shared context for Google provider operations. */
interface GoogleProviderContext {
  readonly genAI: GoogleGenerativeAI;
  readonly modelName: string;
  readonly maxTokens: number;
}

// deno-lint-ignore no-explicit-any
type GeminiChat = any;

/** Prepare a Gemini chat session from messages and tools. */
function prepareGeminiChat(
  ctx: GoogleProviderContext,
  messages: readonly LlmMessage[],
  tools: readonly unknown[],
): { chat: GeminiChat; userParts: GeminiPart[] } {
  const systemInstruction = extractGeminiSystemInstruction(messages);
  const modelConfig = buildGeminiModelConfig(systemInstruction, tools);
  const model = ctx.genAI.getGenerativeModel({
    model: ctx.modelName,
    generationConfig: { maxOutputTokens: ctx.maxTokens },
    ...modelConfig,
  });
  const { history, userParts } = buildGeminiChatParts(messages);
  const chat = model.startChat({ history });
  return { chat, userParts };
}

// deno-lint-ignore no-explicit-any
type GeminiUsageMetadata = any;

/** Build an LlmCompletionResult's usage field from Gemini metadata. */
function buildGeminiUsage(
  meta: GeminiUsageMetadata,
): { inputTokens: number; outputTokens: number } {
  return {
    inputTokens: meta?.promptTokenCount ?? 0,
    outputTokens: meta?.candidatesTokenCount ?? 0,
  };
}

/** Execute a non-streaming Gemini completion. */
async function executeGeminiCompletion(
  ctx: GoogleProviderContext,
  messages: readonly LlmMessage[],
  tools: readonly unknown[],
  signal: AbortSignal | undefined,
): Promise<LlmCompletionResult> {
  const { chat, userParts } = prepareGeminiChat(ctx, messages, tools);

  // deno-lint-ignore no-explicit-any
  let result: any;
  try {
    result = await raceWithAbortSignal(
      chat.sendMessage(userParts),
      signal,
    );
  } catch (err) {
    throw wrapGoogleError(err, ctx.modelName);
  }
  const response = result.response;
  return {
    content: extractGeminiResponseText(response),
    toolCalls: extractGeminiFunctionCalls(response),
    usage: buildGeminiUsage(response.usageMetadata),
  };
}

/** Throw an AbortError if the signal is already aborted. */
function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw new DOMException("Operation cancelled", "AbortError");
  }
}

/** Build the final stream chunk with usage and optional tool calls. */
function buildFinalStreamChunk(
  // deno-lint-ignore no-explicit-any
  finalResponse: any,
): LlmStreamChunk {
  const geminiFunctionCalls = extractGeminiFunctionCalls(finalResponse);
  return {
    text: "",
    done: true,
    usage: buildGeminiUsage(finalResponse.usageMetadata),
    ...(geminiFunctionCalls.length > 0
      ? { toolCalls: geminiFunctionCalls }
      : {}),
  };
}

/** Execute a streaming Gemini completion, yielding chunks. */
async function* streamGeminiCompletion(
  ctx: GoogleProviderContext,
  messages: readonly LlmMessage[],
  tools: readonly unknown[],
  signal: AbortSignal | undefined,
): AsyncIterable<LlmStreamChunk> {
  const { chat, userParts } = prepareGeminiChat(ctx, messages, tools);

  let streamResult;
  try {
    streamResult = await chat.sendMessageStream(userParts);
  } catch (err) {
    throw wrapGoogleError(err, ctx.modelName);
  }

  throwIfAborted(signal);

  try {
    for await (const chunk of streamResult.stream) {
      throwIfAborted(signal);
      const text = chunk.text();
      if (text) yield { text, done: false };
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw wrapGoogleError(err, ctx.modelName);
  }

  yield buildFinalStreamChunk(await streamResult.response);
}

// ─── Factory ────────────────────────────────────────────────────────────────

/**
 * Create a Google (Gemini) LLM provider.
 *
 * @param config - Provider configuration
 * @returns An LlmProvider backed by the Google Generative AI API
 */
export function createGoogleProvider(config: GoogleConfig = {}): LlmProvider {
  const apiKey = config.apiKey ?? Deno.env.get("GOOGLE_API_KEY") ?? "";
  const modelName = config.model ?? "gemini-2.0-flash";
  const ctx: GoogleProviderContext = {
    genAI: new GoogleGenerativeAI(apiKey),
    modelName,
    maxTokens: config.maxTokens ?? 4096,
  };

  return {
    name: "google",
    supportsStreaming: true,
    contextWindow: getModelInfo(modelName).contextWindow,
    complete: (messages, tools, options) =>
      executeGeminiCompletion(
        ctx,
        messages,
        tools,
        options.signal as AbortSignal | undefined,
      ),
    stream: (messages, tools, options) =>
      streamGeminiCompletion(
        ctx,
        messages,
        tools,
        options.signal as AbortSignal | undefined,
      ),
  };
}

/** OpenAI-format tool definition shape. */
interface OpenAiToolDef {
  readonly type: string;
  readonly function: {
    readonly name: string;
    readonly description: string;
    readonly parameters: Record<string, unknown>;
  };
}

/** Convert OpenAI-format tool definitions to Gemini functionDeclarations format. */
function convertToolsToGeminiFormat(
  tools: readonly unknown[],
): Record<string, unknown>[] {
  if (!Array.isArray(tools) || tools.length === 0) return [];
  return tools
    .filter((t): t is OpenAiToolDef => {
      const td = t as Record<string, unknown>;
      return td !== null && typeof td === "object" &&
        typeof td.function === "object";
    })
    .map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    }));
}

/** Match a quota/rate-limit error and return a descriptive Error, or null. */
function matchGoogleQuotaError(
  msg: string,
  modelName: string,
): Error | null {
  const isQuota = msg.includes("429") || msg.includes("quota") ||
    msg.includes("RESOURCE_EXHAUSTED");
  if (!isQuota) return null;
  if (msg.includes("limit: 0") || msg.includes("limit:0")) {
    return new Error(
      `Google API key has zero quota for ${modelName}. ` +
        `Your key may be on the free tier without access to this model, or billing is not enabled. ` +
        `Enable billing at https://console.cloud.google.com/billing or use a different model.\n\n${msg}`,
    );
  }
  return new Error(
    `Google API rate limit exceeded for ${modelName}. ` +
      `Wait a moment and try again, or check your quota at https://console.cloud.google.com/apis/dashboard\n\n${msg}`,
  );
}

/** Match an authentication/permission error and return a descriptive Error, or null. */
function matchGoogleAuthError(msg: string, modelName: string): Error | null {
  const isAuth = msg.includes("401") || msg.includes("403") ||
    msg.includes("API_KEY_INVALID") || msg.includes("PERMISSION_DENIED");
  if (!isAuth) return null;
  return new Error(
    `Google API key is invalid or lacks permission for ${modelName}. ` +
      `Check your key at https://aistudio.google.com/apikey\n\n${msg}`,
  );
}

/** Match a model-not-found error and return a descriptive Error, or null. */
function matchGoogleNotFoundError(
  msg: string,
  modelName: string,
): Error | null {
  if (!msg.includes("404") && !msg.includes("not found")) return null;
  return new Error(
    `Model '${modelName}' not found. Check available models at https://ai.google.dev/gemini-api/docs/models\n\n${msg}`,
  );
}

/**
 * Wrap Google API errors with user-friendly messages.
 *
 * Detects common error patterns (quota exceeded, invalid key, etc.)
 * and prepends a clear explanation before the raw error.
 */
function wrapGoogleError(err: unknown, modelName: string): Error {
  const msg = err instanceof Error ? err.message : String(err);
  return matchGoogleQuotaError(msg, modelName) ??
    matchGoogleAuthError(msg, modelName) ??
    matchGoogleNotFoundError(msg, modelName) ??
    (err instanceof Error ? err : new Error(msg));
}

/**
 * Extract function calls from a Gemini response.
 *
 * Returns them in Anthropic tool_use format: `{ type: "tool_use", id, name, input }`
 * so the orchestrator's native tool call parser can handle them uniformly.
 */
// deno-lint-ignore no-explicit-any
function extractGeminiFunctionCalls(response: any): unknown[] {
  const calls: unknown[] = [];
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      const fc = part.functionCall as {
        name: string;
        args: Record<string, unknown>;
      } | undefined;
      if (fc) {
        calls.push({
          type: "tool_use",
          id: `gemini_${crypto.randomUUID().slice(0, 8)}`,
          name: fc.name,
          input: fc.args ?? {},
        });
      }
    }
  }
  return calls;
}
