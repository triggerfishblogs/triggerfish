# LLM Providers اور Failover

Triggerfish multiple LLM providers کو automatic failover، per-agent model
selection، اور session-level model switching کے ساتھ support کرتا ہے۔ کسی single
provider سے lock-in نہیں۔

## Support کردہ Providers

| Provider   | Auth    | Models                     | نوٹس                                  |
| ---------- | ------- | -------------------------- | --------------------------------------- |
| Anthropic  | API key | Claude Opus, Sonnet, Haiku | Standard Anthropic API                  |
| OpenAI     | API key | GPT-4o, o1, o3             | Standard OpenAI API                     |
| Google     | API key | Gemini Pro, Flash          | Google AI Studio API                    |
| Local      | None    | Llama, Mistral, وغیرہ      | Ollama-compatible، OpenAI format        |
| OpenRouter | API key | OpenRouter پر کوئی بھی model | Unified access to many providers      |
| Z.AI       | API key | GLM-4.7, GLM-4.5, GLM-5    | Z.AI Coding Plan، OpenAI-compatible    |

## LlmProvider Interface

تمام providers ایک ہی interface implement کرتے ہیں:

```typescript
interface LlmProvider {
  /** Message history سے completion generate کریں۔ */
  complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResult>;

  /** Token-by-token completion stream کریں۔ */
  stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncIterable<StreamChunk>;

  /** آیا یہ provider tool/function calling support کرتا ہے۔ */
  supportsTools: boolean;

  /** Model identifier (مثلاً، "claude-sonnet-4-5"، "gpt-4o")۔ */
  modelId: string;
}
```

اس کا مطلب ہے آپ بغیر کوئی application logic تبدیل کیے providers switch کر سکتے
ہیں۔ Agent loop اور تمام tool orchestration یکساں کام کرتی ہے چاہے کوئی بھی
provider active ہو۔

## Configuration

### Basic Setup

`triggerfish.yaml` میں اپنا primary model اور provider credentials configure کریں:

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

FailoverChain provider unavailable ہونے پر automatic fallback فراہم کرتا ہے۔
Fallback models کی ordered list configure کریں:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-opus-4-5
  failover:
    - claude-sonnet-4-5 # پہلا fallback
    - gpt-4o # دوسرا fallback
    - ollama/llama3 # Local fallback (internet ضروری نہیں)

  failover_config:
    max_retries: 3
    retry_delay_ms: 1000
    conditions:
      - rate_limited
      - server_error
      - timeout
```

جب primary model configured condition کی وجہ سے fail کرے (rate limiting، server
error، یا timeout)، Triggerfish automatically chain میں اگلے provider کو try کرتا
ہے۔ یہ transparently ہوتا ہے — conversation بغیر interruption جاری رہتی ہے۔

### Failover Conditions

| Condition      | تفصیل                                         |
| -------------- | ---------------------------------------------- |
| `rate_limited` | Provider 429 rate limit response واپس کرتا ہے |
| `server_error` | Provider 5xx server error واپس کرتا ہے        |
| `timeout`      | Request configured timeout سے تجاوز کرتا ہے  |

## Per-Agent Model Selection

[Multi-agent setup](/ur-PK/features/multi-agent) میں، ہر agent اپنے role کے لیے
optimized مختلف model استعمال کر سکتا ہے:

```yaml
agents:
  list:
    - id: research
      model: claude-opus-4-5 # Research کے لیے بہترین reasoning
    - id: quick-tasks
      model: claude-haiku-4-5 # Simple tasks کے لیے fast اور سستا
    - id: coding
      model: claude-sonnet-4-5 # Code کے لیے اچھا balance
```

## Session-Level Model Switching

ایجنٹ cost optimization کے لیے mid-session models switch کر سکتا ہے۔ Simple
queries کے لیے fast model استعمال کریں اور complex reasoning کے لیے زیادہ capable
model پر escalate کریں۔ یہ `session_status` tool کے ذریعے available ہے۔

## Rate Limiting

Triggerfish میں built-in sliding-window rate limiter ہے جو provider API limits سے
ٹکرانے سے روکتا ہے۔ Limiter کوئی بھی provider کو transparently wrap کرتا ہے — یہ
sliding window میں tokens-per-minute (TPM) اور requests-per-minute (RPM) track
کرتا ہے اور limits approach ہونے پر calls delay کرتا ہے۔

Rate limiting failover کے ساتھ کام کرتی ہے: اگر کوئی provider کی rate limit ختم
ہو اور limiter timeout کے اندر wait نہ کر سکے، تو failover chain activate ہو کر
اگلے provider کو try کرتا ہے۔

Full details کے لیے [Rate Limiting](/ur-PK/features/rate-limiting) دیکھیں جن
میں OpenAI tier limits شامل ہیں۔

::: info API keys کبھی configuration files میں store نہیں ہوتیں۔ `triggerfish
config set-secret` کے ذریعے اپنا OS keychain استعمال کریں۔ Secrets management کی
details کے لیے [Security Model](/ur-PK/security/) دیکھیں۔ :::
