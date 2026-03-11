# Mga LLM Provider at Failover

Sinusuportahan ng Triggerfish ang maramihang LLM providers na may automatic failover, per-agent model selection, at session-level model switching. Walang single-provider lock-in.

## Mga Supported Provider

| Provider   | Auth    | Mga Model                  | Mga Tala                            |
| ---------- | ------- | -------------------------- | ----------------------------------- |
| Anthropic  | API key | Claude Opus, Sonnet, Haiku | Standard Anthropic API              |
| OpenAI     | API key | GPT-4o, o1, o3             | Standard OpenAI API                 |
| Google     | API key | Gemini Pro, Flash          | Google AI Studio API                |
| Local      | Wala    | Llama, Mistral, atbp.      | Ollama-compatible, OpenAI format    |
| OpenRouter | API key | Kahit anong model sa OpenRouter | Unified access sa maraming providers |
| Z.AI       | API key | GLM-4.7, GLM-4.5, GLM-5   | Z.AI Coding Plan, OpenAI-compatible |

## LlmProvider Interface

Lahat ng providers ay nag-implement ng parehong interface:

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

Ibig sabihin nito, maaari kang mag-switch ng providers nang hindi binabago ang anumang application logic. Ang agent loop at lahat ng tool orchestration ay gumagana nang magkapareho anuman ang active provider.

## Configuration

### Basic Setup

I-configure ang primary model mo at provider credentials sa `triggerfish.yaml`:

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

Nagbibigay ang FailoverChain ng automatic fallback kapag hindi available ang isang provider. Mag-configure ng ordered list ng fallback models:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-opus-4-5
  failover:
    - claude-sonnet-4-5 # Unang fallback
    - gpt-4o # Pangalawang fallback
    - ollama/llama3 # Local fallback (walang internet na kailangan)

  failover_config:
    max_retries: 3
    retry_delay_ms: 1000
    conditions:
      - rate_limited
      - server_error
      - timeout
```

Kapag nabigo ang primary model dahil sa isang configured condition (rate limiting, server error, o timeout), awtomatikong sinusubukan ng Triggerfish ang susunod na provider sa chain. Nangyayari ito nang transparent -- nagpapatuloy ang conversation nang walang interruption.

### Mga Failover Condition

| Condition      | Paglalarawan                                     |
| -------------- | ------------------------------------------------ |
| `rate_limited` | Nagbabalik ang provider ng 429 rate limit response |
| `server_error` | Nagbabalik ang provider ng 5xx server error       |
| `timeout`      | Lumagpas ang request sa configured timeout        |

## Per-Agent Model Selection

Sa [multi-agent setup](/fil-PH/features/multi-agent), bawat agent ay maaaring gumamit ng ibang model na optimized para sa role nito:

```yaml
agents:
  list:
    - id: research
      model: claude-opus-4-5 # Pinakamahusay na reasoning para sa research
    - id: quick-tasks
      model: claude-haiku-4-5 # Mabilis at mura para sa simpleng tasks
    - id: coding
      model: claude-sonnet-4-5 # Magandang balanse para sa code
```

## Session-Level Model Switching

Maaaring mag-switch ng models ang agent sa gitna ng session para sa cost optimization. Gumamit ng mabilis na model para sa simpleng queries at mag-escalate sa mas capable na model para sa complex reasoning. Available ito sa pamamagitan ng `session_status` tool.

## Rate Limiting

May built-in sliding-window rate limiter ang Triggerfish na pumipigil sa pag-hit ng provider API limits. Transparent na binabalot ng limiter ang anumang provider -- nagsu-track ito ng tokens-per-minute (TPM) at requests-per-minute (RPM) sa sliding window at dine-delay ang calls kapag papalapit na sa limits.

Gumagana ang rate limiting kasabay ng failover: kung naubusan ng rate limit ang isang provider at hindi makapaghintay ang limiter sa loob ng timeout, nag-a-activate ang failover chain at sinusubukan ang susunod na provider.

Tingnan ang [Rate Limiting](/fil-PH/features/rate-limiting) para sa buong detalye kasama ang OpenAI tier limits.

::: info Hindi kailanman sino-store ang API keys sa configuration files. Gamitin ang OS keychain mo sa pamamagitan ng `triggerfish config set-secret`. Tingnan ang [Security Model](/fil-PH/security/) para sa mga detalye tungkol sa secrets management. :::
