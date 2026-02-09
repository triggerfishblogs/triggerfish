/**
 * Anthropic LLM provider implementation.
 *
 * Supports both OAuth token auth (Claude Pro/Max subscription) and
 * API key auth. OAuth is preferred when available.
 *
 * @module
 */

import Anthropic from "@anthropic-ai/sdk";
import type { LlmProvider, LlmMessage, LlmCompletionResult } from "../llm.ts";

/** Configuration for the Anthropic provider. */
export interface AnthropicConfig {
  /** OAuth token from Claude Code (Pro/Max subscription). */
  readonly authToken?: string;
  /** API key auth (fallback when no OAuth token). */
  readonly apiKey?: string;
  /** Model to use. Default: claude-sonnet-4-5-20250929 */
  readonly model?: string;
  /** Maximum tokens for completion. Default: 4096 */
  readonly maxTokens?: number;
}

/** Detect whether a credential is an OAuth token by prefix. */
function isOAuthToken(key: string): boolean {
  return key.includes("sk-ant-oat");
}

/**
 * Create an Anthropic LLM provider.
 *
 * Auth priority: config.authToken > env CLAUDE_CODE_OAUTH_TOKEN > config.apiKey > env ANTHROPIC_API_KEY
 *
 * For OAuth tokens (sk-ant-oat*), the provider mimics Claude Code's
 * request format: required beta headers, user-agent, and system prompt
 * prefix. This allows Pro/Max subscription tokens to work.
 *
 * @param config - Provider configuration
 * @returns An LlmProvider backed by the Anthropic API
 */
export function createAnthropicProvider(config: AnthropicConfig = {}): LlmProvider {
  const model = config.model ?? "claude-sonnet-4-5-20250929";
  const maxTokens = config.maxTokens ?? 4096;

  // Defer client creation to first use — avoids throwing during
  // provider registration when credentials aren't yet available.
  let client: Anthropic | undefined;
  let usingOAuth = false;

  function getClient(): Anthropic {
    if (!client) {
      // OAuth is primary — CLAUDE_CODE_OAUTH_TOKEN from ~/.bashrc
      const authToken = config.authToken
        ?? Deno.env.get("CLAUDE_CODE_OAUTH_TOKEN")
        ?? Deno.env.get("ANTHROPIC_AUTH_TOKEN");
      const apiKey = config.apiKey ?? Deno.env.get("ANTHROPIC_API_KEY");

      if (authToken && isOAuthToken(authToken)) {
        usingOAuth = true;
        client = new Anthropic({
          apiKey: null,
          authToken,
          defaultHeaders: {
            "accept": "application/json",
            "anthropic-dangerous-direct-browser-access": "true",
            "anthropic-beta":
              "claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14",
            "user-agent": "claude-cli/2.1.2 (external, cli)",
            "x-app": "cli",
          },
          dangerouslyAllowBrowser: true,
        } as ConstructorParameters<typeof Anthropic>[0]);
      } else if (apiKey) {
        usingOAuth = false;
        client = new Anthropic({ apiKey });
      } else {
        throw new Error(
          "No Anthropic credentials found. Set CLAUDE_CODE_OAUTH_TOKEN (OAuth) or ANTHROPIC_API_KEY.",
        );
      }
    }
    return client;
  }

  return {
    name: "anthropic",
    supportsStreaming: true,

    async complete(
      messages: readonly LlmMessage[],
      _tools: readonly unknown[],
      _options: Record<string, unknown>,
    ): Promise<LlmCompletionResult> {
      const anthropicClient = getClient();

      // Extract system prompt from messages
      const systemMessage = messages.find((m) => m.role === "system");
      const userSystemPrompt = systemMessage
        ? (typeof systemMessage.content === "string"
          ? systemMessage.content
          : JSON.stringify(systemMessage.content))
        : undefined;

      // Convert remaining messages to Anthropic format
      const anthropicMessages = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: typeof m.content === "string"
            ? m.content
            : JSON.stringify(m.content),
        }));

      // Build system prompt — OAuth requires Claude Code identity prefix
      let systemParam: unknown;
      if (usingOAuth) {
        const systemBlocks: { type: string; text: string; cache_control: { type: string } }[] = [
          {
            type: "text",
            text: "You are Claude Code, Anthropic's official CLI for Claude.",
            cache_control: { type: "ephemeral" },
          },
        ];
        if (userSystemPrompt) {
          systemBlocks.push({
            type: "text",
            text: userSystemPrompt,
            cache_control: { type: "ephemeral" },
          });
        }
        systemParam = systemBlocks;
      } else {
        systemParam = userSystemPrompt;
      }

      const requestParams: Record<string, unknown> = {
        model,
        max_tokens: maxTokens,
        messages: anthropicMessages,
      };

      if (systemParam) {
        requestParams.system = systemParam;
      }

      const response = await anthropicClient.messages.create(
        requestParams as Parameters<typeof anthropicClient.messages.create>[0],
      );

      // Extract text from response content blocks
      const textContent = response.content
        .filter((block: { type: string }) => block.type === "text")
        .map((block: { type: string; text: string }) => block.text)
        .join("");

      return {
        content: textContent,
        toolCalls: response.content
          .filter((block: { type: string }) => block.type === "tool_use"),
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    },
  };
}
