# LLM Providers ಮತ್ತು Failover

Triggerfish ಸ್ವಯಂಚಾಲಿತ failover, per-agent model ಆಯ್ಕೆ, ಮತ್ತು session-level
model switching ಜೊತೆ ಬಹು LLM providers ಬೆಂಬಲಿಸುತ್ತದೆ. ಒಂದೇ-provider lock-in ಇಲ್ಲ.

## ಬೆಂಬಲಿಸಿದ Providers

| Provider   | Auth    | Models                     | Notes                               |
| ---------- | ------- | -------------------------- | ----------------------------------- |
| Anthropic  | API key | Claude Opus, Sonnet, Haiku | ಸ್ಟ್ಯಾಂಡರ್ಡ್ Anthropic API          |
| OpenAI     | API key | GPT-4o, o1, o3             | ಸ್ಟ್ಯಾಂಡರ್ಡ್ OpenAI API             |
| Google     | API key | Gemini Pro, Flash          | Google AI Studio API                |
| Local      | None    | Llama, Mistral, ಇತ್ಯಾದಿ   | Ollama-compatible, OpenAI format    |
| OpenRouter | API key | OpenRouter ನ ಯಾವ model    | ಬಹು providers ಗೆ unified ಪ್ರವೇಶ    |
| Z.AI       | API key | GLM-4.7, GLM-4.5, GLM-5    | Z.AI Coding Plan, OpenAI-compatible |

## LlmProvider Interface

ಎಲ್ಲ providers ಅದೇ interface implement ಮಾಡುತ್ತವೆ:

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

ಇದರರ್ಥ ಯಾವ application logic ಬದಲಾಯಿಸದೆ providers switch ಮಾಡಬಹುದು. Agent loop
ಮತ್ತು ಎಲ್ಲ tool orchestration ಯಾವ provider active ಎಂಬುದನ್ನು ಲೆಕ್ಕಿಸದೆ
ಒಂದೇ ರೀತಿ ಕೆಲಸ ಮಾಡುತ್ತವೆ.

## ಸಂರಚನೆ

### ಮೂಲ ಸೆಟಪ್

`triggerfish.yaml` ನಲ್ಲಿ primary model ಮತ್ತು provider credentials configure ಮಾಡಿ:

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

FailoverChain provider ಲಭ್ಯವಿಲ್ಲದಿದ್ದರೆ ಸ್ವಯಂಚಾಲಿತ fallback ಒದಗಿಸುತ್ತದೆ.
Ordered fallback models ಪಟ್ಟಿ configure ಮಾಡಿ:

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

Primary model configure ಮಾಡಿದ condition (rate limiting, server error, ಅಥವಾ timeout)
ಕಾರಣ ವಿಫಲವಾದಾಗ, Triggerfish chain ನಲ್ಲಿ ಮುಂದಿನ provider ಸ್ವಯಂಚಾಲಿತವಾಗಿ try
ಮಾಡುತ್ತದೆ. ಇದು ಪಾರದರ್ಶಕವಾಗಿ ಆಗುತ್ತದೆ -- conversation ತಡೆ ಇಲ್ಲದೆ ಮುಂದುವರೆಯುತ್ತದೆ.

### Failover Conditions

| Condition      | Description                                |
| -------------- | ------------------------------------------ |
| `rate_limited` | Provider 429 rate limit response ಹಿಂದಿರುಗಿಸುತ್ತದೆ |
| `server_error` | Provider 5xx server error ಹಿಂದಿರುಗಿಸುತ್ತದೆ |
| `timeout`      | Request configure ಮಾಡಿದ timeout ಮೀರುತ್ತದೆ |

## Per-Agent Model ಆಯ್ಕೆ

[ಮಲ್ಟಿ-agent ಸೆಟಪ್](./multi-agent) ನಲ್ಲಿ, ಪ್ರತಿ agent ತನ್ನ ಪಾತ್ರಕ್ಕಾಗಿ
optimize ಮಾಡಿದ ಭಿನ್ನ model ಬಳಸಬಹುದು:

```yaml
agents:
  list:
    - id: research
      model: claude-opus-4-5 # ಸಂಶೋಧನೆಗೆ ಉತ್ತಮ reasoning
    - id: quick-tasks
      model: claude-haiku-4-5 # ಸರಳ ಕಾರ್ಯಗಳಿಗೆ ತ್ವರಿತ ಮತ್ತು ಅಗ್ಗ
    - id: coding
      model: claude-sonnet-4-5 # Code ಗೆ ಉತ್ತಮ balance
```

## Session-Level Model Switching

Agent cost optimization ಗಾಗಿ session ನಡು-ಮಧ್ಯದಲ್ಲಿ models switch ಮಾಡಬಹುದು. ಸರಳ
queries ಗಾಗಿ ತ್ವರಿತ model ಬಳಸಿ ಮತ್ತು ಸಂಕೀರ್ಣ reasoning ಗಾಗಿ ಹೆಚ್ಚು capable model
ಗೆ escalate ಮಾಡಿ. ಇದು `session_status` tool ಮೂಲಕ ಲಭ್ಯ.

## Rate Limiting

Triggerfish ಅಂತರ್ನಿರ್ಮಿತ sliding-window rate limiter ಹೊಂದಿದೆ, provider API limits
ತಲುಪುವುದನ್ನು ತಡೆಯುತ್ತದೆ. Limiter ಯಾವ provider ಅನ್ನೂ ಪಾರದರ್ಶಕವಾಗಿ wrap ಮಾಡುತ್ತದೆ
-- tokens-per-minute (TPM) ಮತ್ತು requests-per-minute (RPM) sliding window ನಲ್ಲಿ
track ಮಾಡಿ limits ಸಮೀಪಿಸಿದಾಗ calls ವಿಳಂಬ ಮಾಡುತ್ತದೆ.

Rate limiting failover ಜೊತೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ: provider ನ rate limit ಖಾಲಿಯಾದ್ದರಿಂದ
limiter timeout ಒಳಗೆ ಕಾಯಲಾಗದಿದ್ದರೆ, failover chain activate ಮಾಡಿ ಮುಂದಿನ provider
try ಮಾಡುತ್ತದೆ.

ಪೂರ್ಣ ವಿವರಗಳಿಗಾಗಿ OpenAI tier limits ಒಳಗೊಂಡ [Rate Limiting](/kn-IN/features/rate-limiting)
ನೋಡಿ.

::: info API keys ಎಂದಿಗೂ configuration files ನಲ್ಲಿ ಉಳಿಸಲ್ಪಡುವುದಿಲ್ಲ. `triggerfish config set-secret`
ಮೂಲಕ OS keychain ಬಳಸಿ. Secrets ನಿರ್ವಹಣೆ ವಿವರಗಳಿಗಾಗಿ [Security Model](/kn-IN/security/)
ನೋಡಿ. :::
