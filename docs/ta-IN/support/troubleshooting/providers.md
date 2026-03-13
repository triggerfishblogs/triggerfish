# Troubleshooting: LLM Providers

## Common Provider Errors

### 401 Unauthorized / 403 Forbidden

உங்கள் API key invalid, expired, அல்லது sufficient permissions இல்லை.

**Fix:**

```bash
# API key மீண்டும் store செய்யவும்
triggerfish config set-secret provider:<name>:apiKey <your-key>

# Daemon restart செய்யவும்
triggerfish stop && triggerfish start
```

Provider-specific notes:

| Provider | Key format | எங்கே கிடைக்கும் |
|----------|-----------|-----------------|
| Anthropic | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | `sk-...` | [platform.openai.com](https://platform.openai.com/) |
| Google | `AIza...` | [aistudio.google.com](https://aistudio.google.com/) |
| Fireworks | `fw_...` | [fireworks.ai](https://fireworks.ai/) |
| OpenRouter | `sk-or-...` | [openrouter.ai](https://openrouter.ai/) |

### 429 Rate Limited

Provider இன் rate limit exceed செய்தீர்கள். Triggerfish பெரும்பாலான providers க்கு 429 இல் automatically retry செய்வதில்லை (Notion தவிர, அதில் built-in backoff உண்டு).

**Fix:** காத்திருந்து மீண்டும் try செய்யவும். Rate limits regularly hit ஆனால் consider செய்யவும்:
- Higher limits க்கு API plan upgrade செய்யவும்
- Primary throttled ஆகும்போது requests fall through ஆக failover provider சேர்க்கவும்
- Scheduled tasks cause ஆனால் trigger frequency குறைக்கவும்

### 500 / 502 / 503 Server Error

Provider இன் servers issues experience செய்கின்றன. இவை typically transient.

Failover chain configure செய்திருந்தால், Triggerfish automatically next provider try செய்கிறது. Failover இல்லாமல், error user க்கு propagate ஆகிறது.

### "No response body for streaming"

Provider request accept செய்தது, ஆனால் streaming call க்கு empty response body return செய்தது. இது நடக்கலாம்:

- Provider இன் infrastructure overloaded
- Proxy அல்லது firewall response body strip செய்கிறது
- Model temporarily unavailable

இது affects: OpenRouter, Local (Ollama/LM Studio), ZenMux, Z.AI, Fireworks.

---

## Provider-Specific Issues

### Anthropic

**Tool format conversion.** Triggerfish internal tool format மற்றும் Anthropic இன் native tool format இடையே convert செய்கிறது. Tool-related errors பார்த்தால், உங்கள் tool definitions valid JSON Schema வைத்திருக்கின்றனவா என்று சரிபார்க்கவும்.

**System prompt handling.** Anthropic system prompt ஐ message ஆக இல்லாமல் separate field ஆக தேவைப்படுகிறது. இந்த conversion automatic, ஆனால் conversation இல் "system" messages தோன்றினால், message formatting இல் ஏதோ தவறு.

### OpenAI

**Frequency penalty.** Repetitive output discourage செய்ய Triggerfish அனைத்து OpenAI requests க்கும் 0.3 frequency penalty apply செய்கிறது. இது hardcoded மற்றும் config மூலம் மாற்ற முடியாது.

**Image support.** OpenAI message content இல் base64-encoded images support செய்கிறது. Vision வேலை செய்யாவிட்டால், vision-capable model configure செய்தீர்கள் என்று உறுதிப்படுத்தவும் (உதா., `gpt-4o`, `gpt-4o-mini` இல்லை).

### Google Gemini

**Key in query string.** மற்ற providers போல் இல்லாமல், Google API key ஐ header ஆக இல்லாமல் query parameter ஆக பயன்படுத்துகிறது. இது automatically handle ஆகிறது, ஆனால் corporate proxy மூலம் route செய்தால் key proxy/access logs இல் தோன்றலாம்.

### Ollama / LM Studio (Local)

**Server இயங்க வேண்டும்.** Local providers க்கு Triggerfish start ஆவதற்கு முன்பு model server இயங்க வேண்டும். Ollama அல்லது LM Studio இயங்காவிட்டால்:

```
Local LLM request failed (connection refused)
```

**Server start செய்யவும்:**

```bash
# Ollama
ollama serve

# LM Studio
# LM Studio திறந்து local server start செய்யவும்
```

**Model load ஆகவில்லை.** Ollama இல், model முதலில் pull ஆக வேண்டும்:

```bash
ollama pull llama3.3:70b
```

**Endpoint override.** Local server default port இல் இல்லையென்றால்:

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # Ollama default
      # endpoint: "http://localhost:1234"  # LM Studio default
```

### Fireworks

**Native API.** Triggerfish Fireworks இன் OpenAI-compatible endpoint க்கு பதிலாக native API பயன்படுத்துகிறது. Model IDs OpenAI-compatible documentation இல் பார்ப்பதிலிருந்து differ ஆகலாம்.

**Model ID formats.** Fireworks பல model ID patterns accept செய்கிறது. Wizard common formats normalize செய்கிறது, ஆனால் verification fail ஆனால் exact ID க்கு [Fireworks model library](https://fireworks.ai/models) சரிபார்க்கவும்.

### OpenRouter

**Model routing.** OpenRouter requests ஐ various providers க்கு route செய்கிறது. Underlying provider இலிருந்து errors OpenRouter இன் error format இல் wrapped ஆகின்றன. Actual error message extracted மற்றும் displayed ஆகிறது.

**API error format.** OpenRouter errors ஐ JSON objects ஆக return செய்கிறது. Error message generic ஆகத் தெரிந்தால், raw error DEBUG level இல் logged ஆகிறது.

### ZenMux / Z.AI

**Streaming support.** இரண்டு providers உம் streaming support செய்கின்றன. Streaming fail ஆனால்:

```
ZenMux stream failed (status): error text
```

API key க்கு streaming permissions இருக்கிறதா என்று சரிபார்க்கவும் (சில API tiers streaming access restrict செய்கின்றன).

---

## Failover

### Failover எவ்வாறு வேலை செய்கிறது

Primary provider fail ஆகும்போது, Triggerfish `failover` list இல் ஒவ்வொரு model உம் order இல் try செய்கிறது:

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Failover provider succeed ஆனால், எந்த provider பயன்படுத்தப்பட்டது என்று response logged ஆகிறது. அனைத்து providers உம் fail ஆனால், last error user க்கு return ஆகிறது.

### "All providers exhausted"

Chain இல் ஒவ்வொரு provider உம் fail ஆனது. சரிபார்க்கவும்:

1. அனைத்து API keys உம் valid ஆ? ஒவ்வொரு provider உம் individually test செய்யவும்.
2. அனைத்து providers உம் outages experience செய்கின்றனவா? Their status pages சரிபார்க்கவும்.
3. உங்கள் network provider endpoints க்கு outbound HTTPS block செய்கிறதா?

### Failover configuration

```yaml
models:
  failover_config:
    max_retries: 3          # Next க்கு move செய்வதற்கு முன்பு per provider retries
    retry_delay_ms: 1000    # Retries இடையே base delay
    conditions:             # எந்த errors failover trigger செய்கின்றன
      - timeout
      - server_error
      - rate_limited
```

### "Primary provider not found in registry"

`models.primary.provider` இல் provider name `models.providers` இல் configured provider உடன் match ஆகவில்லை. Typos சரிபார்க்கவும்.

### "Classification model provider not configured"

`models.providers` இல் present இல்லாத provider reference செய்யும் `classification_models` override set செய்தீர்கள்:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local        # இந்த provider models.providers இல் exist ஆக வேண்டும்
      model: llama3.3:70b
  providers:
    # "local" இங்கே defined ஆக வேண்டும்
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"
```

---

## Retry Behavior

Triggerfish transient errors (network timeouts, 5xx responses) இல் provider requests retry செய்கிறது. Retry logic:

1. Attempts இடையே exponential backoff உடன் காத்திருக்கிறது
2. ஒவ்வொரு retry attempt உம் WARN level இல் log செய்கிறது
3. ஒரு provider க்கான retries exhausted ஆன பிறகு, failover chain இல் next க்கு move ஆகிறது
4. Streaming connections க்கு connection establishment vs mid-stream failures க்கு separate retry logic உண்டு

Logs இல் retry attempts பார்க்கலாம்:

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
