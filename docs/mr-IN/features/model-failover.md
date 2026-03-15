# LLM Providers आणि Failover

Triggerfish automatic failover, per-agent model selection, आणि session-level
model switching सह multiple LLM providers support करतो. Single-provider lock-in
नाही.

## Supported Providers

| Provider   | Auth    | Models                     | Notes                               |
| ---------- | ------- | -------------------------- | ----------------------------------- |
| Anthropic  | API key | Claude Opus, Sonnet, Haiku | Standard Anthropic API              |
| OpenAI     | API key | GPT-4o, o1, o3             | Standard OpenAI API                 |
| Google     | API key | Gemini Pro, Flash          | Google AI Studio API                |
| Local      | None    | Llama, Mistral, इ.         | Ollama-compatible, OpenAI format    |
| OpenRouter | API key | OpenRouter वरील कोणताही model | Many providers ला unified access |
| Z.AI       | API key | GLM-4.7, GLM-4.5, GLM-5    | Z.AI Coding Plan, OpenAI-compatible |

## LlmProvider Interface

सर्व providers समान interface implement करतात:

```typescript
interface LlmProvider {
  /** Message history मधून completion generate करा. */
  complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResult>;

  /** Token-by-token completion stream करा. */
  stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncIterable<StreamChunk>;

  /** हा provider tool/function calling support करतो का. */
  supportsTools: boolean;

  /** Model identifier (उदा., "claude-sonnet-4-5", "gpt-4o"). */
  modelId: string;
}
```

याचा अर्थ तुम्ही कोणताही application logic न बदलता providers switch करू शकता.
एजंट loop आणि सर्व tool orchestration कोणता provider active आहे याची पर्वा न
करता identically काम करतात.

## Configuration

### Basic Setup

`triggerfish.yaml` मध्ये तुमचा primary model आणि provider credentials configure
करा:

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

FailoverChain provider unavailable असताना automatic fallback प्रदान करतो.
Ordered list मध्ये fallback models configure करा:

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

Configured condition मुळे (rate limiting, server error, किंवा timeout) primary
model fail होतो तेव्हा, Triggerfish chain मधील पुढचा provider आपोआप try करतो.
हे transparently होते -- conversation interruption शिवाय continue होते.

### Failover Conditions

| Condition      | वर्णन                                          |
| -------------- | ---------------------------------------------- |
| `rate_limited` | Provider 429 rate limit response return करतो   |
| `server_error` | Provider 5xx server error return करतो          |
| `timeout`      | Request configured timeout exceed करतो         |

## Per-Agent Model Selection

[Multi-agent setup](./multi-agent) मध्ये, प्रत्येक agent त्याच्या role साठी
optimized वेगळा model वापरू शकतो:

```yaml
agents:
  list:
    - id: research
      model: claude-opus-4-5 # Research साठी best reasoning
    - id: quick-tasks
      model: claude-haiku-4-5 # Simple tasks साठी fast आणि cheap
    - id: coding
      model: claude-sonnet-4-5 # Code साठी good balance
```

## Session-Level Model Switching

एजंट cost optimization साठी session mid-way मध्ये models switch करू शकतो.
Simple queries साठी fast model वापरा आणि complex reasoning साठी more capable
model ला escalate करा. हे `session_status` tool द्वारे available आहे.

## Rate Limiting

Triggerfish मध्ये built-in sliding-window rate limiter आहे जो provider API limits
hit होण्यापासून रोखतो. Limiter कोणत्याही provider ला transparently wrap करतो --
tokens-per-minute (TPM) आणि requests-per-minute (RPM) sliding window मध्ये track
करतो आणि limits approached होतात तेव्हा calls delay करतो.

Rate limiting failover सोबत काम करतो: provider चा rate limit exhausted असल्यास
आणि limiter timeout मध्ये wait करू शकत नसल्यास, failover chain activate होतो
आणि पुढचा provider try करतो.

Full details साठी OpenAI tier limits सह [Rate Limiting](/mr-IN/features/rate-limiting)
पहा.

::: info API keys कधीही configuration files मध्ये stored नाहीत. `triggerfish config set-secret`
द्वारे तुमचा OS keychain वापरा. Secrets management साठी [Security Model](/mr-IN/security/)
पहा. :::
