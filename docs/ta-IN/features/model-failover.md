# LLM Providers மற்றும் Failover

Triggerfish automatic failover, per-agent model selection, மற்றும் session-level model switching உடன் multiple LLM providers ஐ support செய்கிறது. Single-provider lock-in இல்லை.

## ஆதரிக்கப்படும் Providers

| Provider   | Auth    | Models                     | குறிப்புகள்                              |
| ---------- | ------- | -------------------------- | ----------------------------------------- |
| Anthropic  | API key | Claude Opus, Sonnet, Haiku | Standard Anthropic API                    |
| OpenAI     | API key | GPT-4o, o1, o3             | Standard OpenAI API                       |
| Google     | API key | Gemini Pro, Flash          | Google AI Studio API                      |
| Local      | இல்லை  | Llama, Mistral, போன்றவை   | Ollama-compatible, OpenAI format          |
| OpenRouter | API key | OpenRouter இல் எந்த model உம் | பல providers க்கு Unified access     |
| Z.AI       | API key | GLM-4.7, GLM-4.5, GLM-5    | Z.AI Coding Plan, OpenAI-compatible      |

## LlmProvider Interface

அனைத்து providers உம் அதே interface implement செய்கின்றன:

```typescript
interface LlmProvider {
  /** ஒரு message history இலிருந்து completion generate செய்யவும். */
  complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResult>;

  /** Token-by-token completion stream செய்யவும். */
  stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncIterable<StreamChunk>;

  /** இந்த provider tool/function calling support செய்கிறதா. */
  supportsTools: boolean;

  /** Model identifier (உதா., "claude-sonnet-4-5", "gpt-4o"). */
  modelId: string;
}
```

இதன் பொருள் எந்த application logic உம் மாற்றாமல் providers மாற்றலாம். Agent loop மற்றும் அனைத்து tool orchestration உம் எந்த provider active ஆக இருந்தாலும் identically வேலை செய்கின்றன.

## கட்டமைப்பு

### Basic Setup

`triggerfish.yaml` இல் உங்கள் primary model மற்றும் provider credentials கட்டமைக்கவும்:

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

FailoverChain ஒரு provider கிடைக்காதபோது automatic fallback வழங்குகிறது. Fallback models இன் ordered பட்டியல் கட்டமைக்கவும்:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-opus-4-5
  failover:
    - claude-sonnet-4-5 # முதல் fallback
    - gpt-4o # இரண்டாவது fallback
    - ollama/llama3 # Local fallback (internet தேவையில்லை)

  failover_config:
    max_retries: 3
    retry_delay_ms: 1000
    conditions:
      - rate_limited
      - server_error
      - timeout
```

Primary model கட்டமைக்கப்பட்ட condition காரணமாக (rate limiting, server error, அல்லது timeout) தோல்வியடையும்போது, Triggerfish தானாக chain இல் அடுத்த provider முயற்சிக்கிறது. இது transparently நடக்கிறது -- conversation interruption இல்லாமல் தொடர்கிறது.

### Failover Conditions

| Condition      | விளக்கம்                                       |
| -------------- | ------------------------------------------------ |
| `rate_limited` | Provider 429 rate limit response return செய்கிறது |
| `server_error` | Provider 5xx server error return செய்கிறது      |
| `timeout`      | Request கட்டமைக்கப்பட்ட timeout மீறுகிறது       |

## Per-Agent Model Selection

ஒரு [multi-agent setup](./multi-agent) இல், ஒவ்வொரு agent உம் அதன் role க்கு optimized வேறு model பயன்படுத்தலாம்:

```yaml
agents:
  list:
    - id: research
      model: claude-opus-4-5 # Research க்கு சிறந்த reasoning
    - id: quick-tasks
      model: claude-haiku-4-5 # Simple tasks க்கு வேகமானது மற்றும் மலிவானது
    - id: coding
      model: claude-sonnet-4-5 # Code க்கு நல்ல சமன்பாடு
```

## Session-Level Model Switching

Agent cost optimization க்காக mid-session models மாற்றலாம். Simple queries க்கு fast model பயன்படுத்தி complex reasoning க்கு அதிக capable model க்கு escalate செய்யவும். இது `session_status` tool மூலம் கிடைக்கிறது.

## Rate Limiting

Triggerfish ஒரு built-in sliding-window rate limiter சேர்க்கிறது, இது provider API limits தாக்காமல் தடுக்கிறது. Limiter எந்த provider ஐயும் transparently wrap செய்கிறது -- tokens-per-minute (TPM) மற்றும் requests-per-minute (RPM) ஐ sliding window இல் track செய்கிறது மற்றும் limits நெருங்கும்போது calls delay செய்கிறது.

Rate limiting failover உடன் சேர்ந்து வேலை செய்கிறது: ஒரு provider இன் rate limit exhausted ஆகி timeout க்குள் limiter காத்திருக்க முடியாவிட்டால், failover chain activate ஆகி அடுத்த provider முயற்சிக்கிறது.

விரிவான details க்கு OpenAI tier limits உட்பட [Rate Limiting](/ta-IN/features/rate-limiting) பாருங்கள்.

::: info API keys configuration files இல் சேமிக்கப்படுவதில்லை. `triggerfish config set-secret` மூலம் உங்கள் OS keychain பயன்படுத்தவும். Secrets management பற்றிய details க்கு [Security Model](/ta-IN/security/) பாருங்கள். :::
