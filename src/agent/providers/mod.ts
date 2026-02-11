/**
 * LLM provider implementations.
 *
 * Exports factory functions and config types for all supported providers:
 * Anthropic, OpenAI, Google (Gemini), Local (Ollama/LM Studio), OpenRouter.
 *
 * @module
 */

export { createAnthropicProvider } from "./anthropic.ts";
export type { AnthropicConfig } from "./anthropic.ts";

export { createOpenAiProvider } from "./openai.ts";
export type { OpenAiConfig } from "./openai.ts";

export { createGoogleProvider } from "./google.ts";
export type { GoogleConfig } from "./google.ts";

export { createLocalProvider } from "./local.ts";
export type { LocalConfig } from "./local.ts";

export { createOpenRouterProvider } from "./openrouter.ts";
export type { OpenRouterConfig } from "./openrouter.ts";

export { createZenMuxProvider } from "./zenmux.ts";
export type { ZenMuxConfig } from "./zenmux.ts";
