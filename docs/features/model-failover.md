# LLM Providers and Failover

Triggerfish supports multiple LLM providers with automatic failover, per-agent
model selection, and session-level model switching. You are never locked into a
single provider.

## Supported Providers

| Provider   | Auth    | Models                     | Notes                               |
| ---------- | ------- | -------------------------- | ----------------------------------- |
| Anthropic  | API key | Claude Opus, Sonnet, Haiku | Standard Anthropic API              |
| OpenAI     | API key | GPT-4o, o1, o3             | Standard OpenAI API                 |
| Google     | API key | Gemini Pro, Flash          | Google AI Studio API                |
| Local      | None    | Llama, Mistral, etc.       | Ollama-compatible, OpenAI format    |
| OpenRouter | API key | Any model on OpenRouter    | Unified access to many providers    |
| Z.AI       | API key | GLM-4.7, GLM-4.5, GLM-5    | Z.AI Coding Plan, OpenAI-compatible |

## LlmProvider Interface

All providers implement the same interface:

```typescript
interface LlmProvider {
  /** Generate a completion from a message history. */
  complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResult>;

  /** Stream a completion token-by-token. */
  stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncIterable<StreamChunk>;

  /** Whether this provider supports tool/function calling. */
  supportsTools: boolean;

  /** The model identifier (e.g., "claude-sonnet-4-5", "gpt-4o"). */
  modelId: string;
}
```

This means you can switch providers without changing any application logic. The
agent loop and all tool orchestration work identically regardless of which
provider is active.

## Configuration

### Basic Setup

Configure your primary model and provider credentials in `triggerfish.yaml`:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-5
  providers:
    anthropic:
      model: claude-sonnet-4-5
    openai:
      model: gpt-4o
    google:
      model: gemini-pro
    ollama:
      model: llama3
      baseUrl: "http://localhost:11434/v1" # Ollama default
    openrouter:
      model: anthropic/claude-sonnet-4-5
    zai:
      model: glm-4.7
```

### Failover Chain

The FailoverChain provides automatic fallback when a provider is unavailable.
Configure an ordered list of fallback models:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-opus-4-5
  failover:
    - claude-sonnet-4-5 # First fallback
    - gpt-4o # Second fallback
    - ollama/llama3 # Local fallback (no internet required)

  failover_config:
    max_retries: 3
    retry_delay_ms: 1000
    conditions:
      - rate_limited
      - server_error
      - timeout
```

When the primary model fails due to a configured condition (rate limiting,
server error, or timeout), Triggerfish automatically tries the next provider in
the chain. This happens transparently -- the conversation continues without
interruption.

### Failover Conditions

| Condition      | Description                                |
| -------------- | ------------------------------------------ |
| `rate_limited` | Provider returns a 429 rate limit response |
| `server_error` | Provider returns a 5xx server error        |
| `timeout`      | Request exceeds the configured timeout     |

## Per-Agent Model Selection

In a [multi-agent setup](./multi-agent), each agent can use a different model
optimized for its role:

```yaml
agents:
  list:
    - id: research
      model: claude-opus-4-5 # Best reasoning for research
    - id: quick-tasks
      model: claude-haiku-4-5 # Fast and cheap for simple tasks
    - id: coding
      model: claude-sonnet-4-5 # Good balance for code
```

## Session-Level Model Switching

The agent can switch models mid-session for cost optimization. Use a fast model
for simple queries and escalate to a more capable model for complex reasoning.
This is available through the `session_status` tool.

## Rate Limiting

Triggerfish includes a built-in sliding-window rate limiter that prevents
hitting provider API limits. The limiter wraps any provider transparently — it
tracks tokens-per-minute (TPM) and requests-per-minute (RPM) in a sliding window
and delays calls when limits are approached.

Rate limiting works alongside failover: if a provider's rate limit is exhausted
and the limiter cannot wait within the timeout, the failover chain activates and
tries the next provider.

See [Rate Limiting](/features/rate-limiting) for full details including OpenAI
tier limits.

::: info API keys are never stored in configuration files. Set credentials as
environment variables or use your OS keychain. See the
[Security Model](/security/) for details on secrets management. :::
