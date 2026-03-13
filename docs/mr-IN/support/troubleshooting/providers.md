# Troubleshooting: LLM Providers

## Common Provider Errors

### 401 Unauthorized / 403 Forbidden

तुमचा API key invalid, expired, किंवा sufficient permissions नसलेला आहे.

**Fix:**

```bash
# API key re-store करा
triggerfish config set-secret provider:<name>:apiKey <your-key>

# Daemon restart करा
triggerfish stop && triggerfish start
```

Provider-specific notes:

| Provider | Key format | कोठे मिळवायचे |
|----------|-----------|--------------|
| Anthropic | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | `sk-...` | [platform.openai.com](https://platform.openai.com/) |
| Google | `AIza...` | [aistudio.google.com](https://aistudio.google.com/) |
| Fireworks | `fw_...` | [fireworks.ai](https://fireworks.ai/) |
| OpenRouter | `sk-or-...` | [openrouter.ai](https://openrouter.ai/) |

### 429 Rate Limited

तुम्ही provider चे rate limit exceed केले आहे. Triggerfish बहुतेक providers साठी 429 वर automatically retry करत नाही (Notion, ज्याला built-in backoff आहे, वगळता).

**Fix:** Wait करा आणि पुन्हा try करा. Consistently rate limits hit करत असल्यास, विचार करा:
- Higher limits साठी API plan upgrade करा
- Primary throttled झाल्यावर requests fall through व्हावेत म्हणून failover provider add करा
- Scheduled tasks cause असल्यास trigger frequency कमी करा

### 500 / 502 / 503 Server Error

Provider चे servers issues experience करत आहेत. हे सहसा transient असतात.

Failover chain configured असल्यास, Triggerfish automatically पुढील provider try करतो. Failover शिवाय, error user ला propagate होतो.

### "No response body for streaming"

Provider ने request accept केला पण streaming call साठी empty response body return केला. हे तेव्हा होऊ शकते जेव्हा:

- Provider चे infrastructure overloaded आहे
- Proxy किंवा firewall response body strip करत आहे
- Model temporarily unavailable आहे

याचा परिणाम होतो: OpenRouter, Local (Ollama/LM Studio), ZenMux, Z.AI, Fireworks.

---

## Provider-Specific Issues

### Anthropic

**Tool format conversion.** Triggerfish internal tool format आणि Anthropic चे native tool format दरम्यान convert करतो. Tool-related errors दिसल्यास, तुमच्या tool definitions ला valid JSON Schema असल्याची खात्री करा.

**System prompt handling.** Anthropic ला system prompt वेगळ्या field म्हणून आवश्यक आहे, message म्हणून नाही. हे conversion automatic आहे, पण conversation मध्ये "system" messages दिसल्यास, message formatting मध्ये काहीतरी चुकीचे आहे.

### OpenAI

**Frequency penalty.** Triggerfish repetitive output discourage करण्यासाठी सर्व OpenAI requests ला 0.3 frequency penalty apply करतो. हे hardcoded आहे आणि config द्वारे बदलता येत नाही.

**Image support.** OpenAI message content मध्ये base64-encoded images support करतो. Vision काम नसल्यास, vision-capable model configured असल्याची खात्री करा (उदा. `gpt-4o`, `gpt-4o-mini` नाही).

### Google Gemini

**Key in query string.** इतर providers प्रमाणे नाही, Google API key header म्हणून नाही तर query parameter म्हणून वापरतो. हे automatically handled आहे, पण याचा अर्थ corporate proxy द्वारे route केल्यास key proxy/access logs मध्ये दिसू शकतो.

### Ollama / LM Studio (Local)

**Server running असणे आवश्यक आहे.** Local providers ला Triggerfish start होण्यापूर्वी model server running असणे आवश्यक आहे. Ollama किंवा LM Studio running नसल्यास:

```
Local LLM request failed (connection refused)
```

**Server start करा:**

```bash
# Ollama
ollama serve

# LM Studio
# LM Studio उघडा आणि local server start करा
```

**Model loaded नाही.** Ollama सोबत, model आधी pulled असणे आवश्यक आहे:

```bash
ollama pull llama3.3:70b
```

**Endpoint override.** Local server default port वर नसल्यास:

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # Ollama default
      # endpoint: "http://localhost:1234"  # LM Studio default
```

### Fireworks

**Native API.** Triggerfish Fireworks चे native API वापरतो, त्यांचे OpenAI-compatible endpoint नाही. Model IDs OpenAI-compatible documentation मध्ये दिसणाऱ्यापेक्षा differ होऊ शकतात.

**Model ID formats.** Fireworks अनेक model ID patterns accept करतो. Wizard common formats normalize करतो, पण verification fail झाल्यास exact ID साठी [Fireworks model library](https://fireworks.ai/models) check करा.

### OpenRouter

**Model routing.** OpenRouter requests विविध providers कडे route करतो. Underlying provider चे errors OpenRouter च्या error format मध्ये wrapped आहेत. Actual error message extracted आणि displayed होतो.

**API error format.** OpenRouter errors JSON objects म्हणून return करतो. Error message generic वाटल्यास, raw error DEBUG level वर logged आहे.

### ZenMux / Z.AI

**Streaming support.** दोन्ही providers streaming support करतात. Streaming fail झाल्यास:

```
ZenMux stream failed (status): error text
```

तुमच्या API key ला streaming permissions आहेत का check करा (काही API tiers streaming access restrict करतात).

---

## Failover

### Failover कसे काम करते

Primary provider fail झाल्यावर, Triggerfish `failover` list मधील प्रत्येक model क्रमाने try करतो:

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Failover provider succeed झाल्यास, response कोणता provider वापरला ते log होऊन logged होतो. सर्व providers fail झाल्यास, last error user ला returned होतो.

### "All providers exhausted"

Chain मधील प्रत्येक provider fail झाला. Check करा:

1. सर्व API keys valid आहेत का? प्रत्येक provider individually test करा.
2. सर्व providers outages experience करत आहेत का? त्यांचे status pages check करा.
3. तुमचे network कोणत्याही provider endpoints ला outbound HTTPS block करत आहे का?

### Failover configuration

```yaml
models:
  failover_config:
    max_retries: 3          # Provider per retries पुढे जाण्यापूर्वी
    retry_delay_ms: 1000    # Retries दरम्यान base delay
    conditions:             # कोणते errors failover trigger करतात
      - timeout
      - server_error
      - rate_limited
```

### "Primary provider not found in registry"

`models.primary.provider` मधील provider name `models.providers` मध्ये configured कोणत्याही provider शी match होत नाही. Typos साठी check करा.

### "Classification model provider not configured"

तुम्ही `classification_models` override set केले जे `models.providers` मध्ये नसलेल्या provider reference करते:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local        # हा provider models.providers मध्ये असणे आवश्यक आहे
      model: llama3.3:70b
  providers:
    # "local" येथे defined असणे आवश्यक आहे
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"
```

---

## Retry Behavior

Triggerfish transient errors (network timeouts, 5xx responses) वर provider requests retry करतो. Retry logic:

1. Attempts दरम्यान exponential backoff सह wait करतो
2. प्रत्येक retry attempt WARN level वर log करतो
3. एका provider साठी retries exhausted झाल्यावर, failover chain मधील पुढ्याकडे moves
4. Streaming connections ला connection establishment vs. mid-stream failures साठी वेगळे retry logic आहे

Logs मध्ये retry attempts पाहता येतात:

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
