# Troubleshooting: LLM Providers

## Common Provider Errors

### 401 Unauthorized / 403 Forbidden

ನಿಮ್ಮ API key invalid, expired, ಅಥವಾ sufficient permissions ಇಲ್ಲ.

**Fix:**

```bash
# API key ಮತ್ತೆ store ಮಾಡಿ
triggerfish config set-secret provider:<name>:apiKey <your-key>

# Daemon restart ಮಾಡಿ
triggerfish stop && triggerfish start
```

Provider-specific notes:

| Provider | Key format | ಎಲ್ಲಿ ಪಡೆಯಬೇಕು |
|----------|-----------|-----------------|
| Anthropic | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | `sk-...` | [platform.openai.com](https://platform.openai.com/) |
| Google | `AIza...` | [aistudio.google.com](https://aistudio.google.com/) |
| Fireworks | `fw_...` | [fireworks.ai](https://fireworks.ai/) |
| OpenRouter | `sk-or-...` | [openrouter.ai](https://openrouter.ai/) |

### 429 Rate Limited

Provider ನ rate limit exceed ಮಾಡಿದ್ದೀರಿ. Triggerfish ಹೆಚ್ಚಿನ providers ಗಾಗಿ 429 ಮೇಲೆ automatically retry ಮಾಡುವುದಿಲ್ಲ (Notion ಹೊರತುಪಡಿಸಿ, ಅದು built-in backoff ಹೊಂದಿದೆ).

**Fix:** ಸ್ವಲ್ಪ ಕಾದು ಮತ್ತೆ try ಮಾಡಿ. ಯಾವಾಗಲೂ rate limits hit ಆದರೆ:
- ಹೆಚ್ಚಿನ limits ಗಾಗಿ API plan upgrade ಮಾಡಿ
- Primary throttle ಆದಾಗ requests fall through ಮಾಡಲು failover provider add ಮಾಡಿ
- Scheduled tasks ಕಾರಣ ಆಗಿದ್ದರೆ trigger frequency ಕಡಿಮೆ ಮಾಡಿ

### 500 / 502 / 503 Server Error

Provider ನ servers issues experience ಮಾಡುತ್ತಿವೆ. ಇವು typically transient.

Failover chain configure ಮಾಡಿದ್ದರೆ, Triggerfish ಮುಂದಿನ provider automatically try ಮಾಡುತ್ತದೆ. Failover ಇಲ್ಲದಿದ್ದರೆ, error user ಗೆ propagate ಆಗುತ್ತದೆ.

### "No response body for streaming"

Provider request accept ಮಾಡಿ streaming call ಗಾಗಿ empty response body return ಮಾಡಿದೆ. ಇದು ಆಗಬಹುದು:

- Provider ನ infrastructure overloaded ಆಗಿದೆ
- Proxy ಅಥವಾ firewall response body strip ಮಾಡುತ್ತಿದೆ
- Model temporarily unavailable

ಇದು ಪರಿಣಾಮ ಬೀರುತ್ತದೆ: OpenRouter, Local (Ollama/LM Studio), ZenMux, Z.AI, Fireworks.

---

## Provider-Specific Issues

### Anthropic

**Tool format conversion.** Triggerfish internal tool format ಮತ್ತು Anthropic ನ native tool format ನಡುವೆ convert ಮಾಡುತ್ತದೆ. Tool-related errors ಕಂಡರೆ, ನಿಮ್ಮ tool definitions valid JSON Schema ಹೊಂದಿವೆ ಎಂದು check ಮಾಡಿ.

**System prompt handling.** Anthropic ಗೆ system prompt ಅನ್ನು message ಆಗಿ ಅಲ್ಲ, separate field ಆಗಿ ಅಗತ್ಯ. ಈ conversion automatic, ಆದರೆ conversation ನಲ್ಲಿ "system" messages ಕಾಣಿಸಿದರೆ message formatting ನಲ್ಲಿ ಏನೋ ತಪ್ಪಾಗಿದೆ.

### OpenAI

**Frequency penalty.** Triggerfish repetitive output ತಡೆಯಲು ಎಲ್ಲ OpenAI requests ಗೆ 0.3 frequency penalty apply ಮಾಡುತ್ತದೆ. ಇದು hardcoded ಆಗಿದ್ದು config ಮೂಲಕ ಬದಲಾಯಿಸಲಾಗುವುದಿಲ್ಲ.

**Image support.** OpenAI message content ನಲ್ಲಿ base64-encoded images support ಮಾಡುತ್ತದೆ. Vision ಕೆಲಸ ಮಾಡದಿದ್ದರೆ, vision-capable model configure ಮಾಡಿದ್ದೀರಾ ಎಂದು ಖಾತ್ರಿಪಡಿಸಿ (ಉದಾ., `gpt-4o`, `gpt-4o-mini` ಅಲ್ಲ).

### Google Gemini

**Key in query string.** ಇತರ providers ನಂತಲ್ಲ, Google API key ಅನ್ನು header ಅಲ್ಲ, query parameter ಆಗಿ ಬಳಸುತ್ತದೆ. ಇದು automatically handle ಮಾಡಲಾಗುತ್ತದೆ, ಆದರೆ corporate proxy ಮೂಲಕ route ಮಾಡಿದ್ದರೆ key proxy/access logs ನಲ್ಲಿ ಕಾಣಿಸಬಹುದು.

### Ollama / LM Studio (Local)

**Server ಚಲಿಸುತ್ತಿರಬೇಕು.** Local providers ಗೆ Triggerfish start ಮಾಡುವ ಮೊದಲು model server ಚಲಿಸುತ್ತಿರಬೇಕು. Ollama ಅಥವಾ LM Studio ಚಲಿಸದಿದ್ದರೆ:

```
Local LLM request failed (connection refused)
```

**Server start ಮಾಡಿ:**

```bash
# Ollama
ollama serve

# LM Studio
# LM Studio open ಮಾಡಿ local server start ಮಾಡಿ
```

**Model load ಆಗಿಲ್ಲ.** Ollama ಜೊತೆ, model ಮೊದಲು pull ಮಾಡಬೇಕು:

```bash
ollama pull llama3.3:70b
```

**Endpoint override.** Local server default port ನಲ್ಲಿ ಇಲ್ಲದಿದ್ದರೆ:

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # Ollama default
      # endpoint: "http://localhost:1234"  # LM Studio default
```

### Fireworks

**Native API.** Triggerfish Fireworks ನ native API ಬಳಸುತ್ತದೆ, OpenAI-compatible endpoint ಅಲ್ಲ. OpenAI-compatible documentation ನಲ್ಲಿ ಕಾಣುವ ಹೆಸರಿನಿಂದ Model IDs differ ಆಗಬಹುದು.

**Model ID formats.** Fireworks ಹಲವು model ID patterns accept ಮಾಡುತ್ತದೆ. Wizard common formats normalize ಮಾಡುತ್ತದೆ, ಆದರೆ verification fail ಆದರೆ exact ID ಗಾಗಿ [Fireworks model library](https://fireworks.ai/models) check ಮಾಡಿ.

### OpenRouter

**Model routing.** OpenRouter requests ಅನ್ನು various providers ಗೆ route ಮಾಡುತ್ತದೆ. Underlying provider ನ errors OpenRouter ನ error format ನಲ್ಲಿ wrap ಆಗುತ್ತವೆ. Actual error message extract ಮಾಡಿ display ಮಾಡಲಾಗುತ್ತದೆ.

**API error format.** OpenRouter errors ಅನ್ನು JSON objects ಆಗಿ return ಮಾಡುತ್ತದೆ. Error message generic ಕಂಡರೆ, raw error DEBUG level ನಲ್ಲಿ log ಮಾಡಲಾಗಿದೆ.

### ZenMux / Z.AI

**Streaming support.** ಎರಡೂ providers streaming support ಮಾಡುತ್ತವೆ. Streaming fail ಆದರೆ:

```
ZenMux stream failed (status): error text
```

ನಿಮ್ಮ API key ಗೆ streaming permissions ಇವೆ ಎಂದು check ಮಾಡಿ (ಕೆಲವು API tiers streaming access restrict ಮಾಡುತ್ತವೆ).

---

## Failover

### Failover ಹೇಗೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತದೆ

Primary provider fail ಆದಾಗ, Triggerfish `failover` list ನ ಪ್ರತಿ model ಕ್ರಮದಲ್ಲಿ try ಮಾಡುತ್ತದೆ:

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Failover provider succeed ಆದರೆ, response ಯಾವ provider ಬಳಸಲಾಯಿತು ಎಂದು log ಮಾಡಲಾಗುತ್ತದೆ. ಎಲ್ಲ providers fail ಆದರೆ, ಕೊನೆಯ error user ಗೆ return ಮಾಡಲಾಗುತ್ತದೆ.

### "All providers exhausted"

Chain ನ ಪ್ರತಿ provider fail ಆಯಿತು. Check ಮಾಡಿ:

1. ಎಲ್ಲ API keys valid ಆಗಿವೆಯೇ? ಪ್ರತಿ provider individually test ಮಾಡಿ.
2. ಎಲ್ಲ providers outages experience ಮಾಡುತ್ತಿವೆಯೇ? ಅವರ status pages check ಮಾಡಿ.
3. ನಿಮ್ಮ network provider endpoints ಗೆ outbound HTTPS block ಮಾಡುತ್ತಿದೆಯೇ?

### Failover configuration

```yaml
models:
  failover_config:
    max_retries: 3          # ಮುಂದಿನದಕ್ಕೆ move ಮಾಡುವ ಮೊದಲು provider ಗಾಗಿ retries
    retry_delay_ms: 1000    # Retries ನಡುವೆ base delay
    conditions:             # ಯಾವ errors failover trigger ಮಾಡುತ್ತವೆ
      - timeout
      - server_error
      - rate_limited
```

### "Primary provider not found in registry"

`models.primary.provider` ನ provider name `models.providers` ನ configured provider ಯಾವದಕ್ಕೂ match ಮಾಡುತ್ತಿಲ್ಲ. Typos ಗಾಗಿ check ಮಾಡಿ.

### "Classification model provider not configured"

`models.providers` ನಲ್ಲಿ present ಅಲ್ಲದ provider reference ಮಾಡುವ `classification_models` override set ಮಾಡಿದ್ದೀರಿ:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local        # ಈ provider models.providers ನಲ್ಲಿ exist ಮಾಡಬೇಕು
      model: llama3.3:70b
  providers:
    # "local" ಇಲ್ಲಿ define ಮಾಡಬೇಕು
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"
```

---

## Retry Behavior

Triggerfish transient errors (network timeouts, 5xx responses) ಮೇಲೆ provider requests retry ಮಾಡುತ್ತದೆ. Retry logic:

1. Attempts ನಡುವೆ exponential backoff ಜೊತೆ ಕಾಯುತ್ತದೆ
2. ಪ್ರತಿ retry attempt WARN level ನಲ್ಲಿ log ಮಾಡುತ್ತದೆ
3. ಒಂದು provider ಗಾಗಿ retries exhaust ಆದ ನಂತರ, failover chain ನ ಮುಂದಿನದಕ್ಕೆ move ಮಾಡುತ್ತದೆ
4. Streaming connections ಗೆ connection establishment ಮತ್ತು mid-stream failures ಗಾಗಿ separate retry logic ಇದೆ

Logs ನಲ್ಲಿ retry attempts ನೋಡಬಹುದು:

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
