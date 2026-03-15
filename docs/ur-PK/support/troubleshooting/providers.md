# Troubleshooting: LLM Providers

## عام Provider Errors

### 401 Unauthorized / 403 Forbidden

آپ کی API key invalid، expire ہو گئی، یا کافی permissions نہیں رکھتی۔

**Fix:**

```bash
# API key دوبارہ store کریں
triggerfish config set-secret provider:<name>:apiKey <your-key>

# Daemon restart کریں
triggerfish stop && triggerfish start
```

Provider-specific notes:

| Provider | Key format | کہاں ملے گا |
|----------|-----------|-----------------|
| Anthropic | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | `sk-...` | [platform.openai.com](https://platform.openai.com/) |
| Google | `AIza...` | [aistudio.google.com](https://aistudio.google.com/) |
| Fireworks | `fw_...` | [fireworks.ai](https://fireworks.ai/) |
| OpenRouter | `sk-or-...` | [openrouter.ai](https://openrouter.ai/) |

### 429 Rate Limited

آپ نے provider کی rate limit exceed کر دی۔ Triggerfish زیادہ تر providers کے لیے 429 پر خود بخود retry نہیں کرتا (سوائے Notion کے جس میں built-in backoff ہے)۔

**Fix:** انتظار کریں اور دوبارہ کوشش کریں۔ اگر آپ regularly rate limits hit کرتے ہیں تو سوچیں:
- Higher limits کے لیے اپنا API plan upgrade کریں
- Failover provider add کریں تاکہ primary throttled ہونے پر requests fall through ہوں
- اگر scheduled tasks وجہ ہوں تو trigger frequency کم کریں

### 500 / 502 / 503 Server Error

Provider کے servers issues experience کر رہے ہیں۔ یہ عموماً transient ہوتے ہیں۔

اگر آپ کے پاس failover chain configure ہو تو Triggerfish خود بخود اگلا provider try کرتا ہے۔ Failover کے بغیر، error user تک propagate ہوتا ہے۔

### "No response body for streaming"

Provider نے request accept کی لیکن streaming call کے لیے empty response body return کیا۔ یہ تب ہو سکتا ہے جب:

- Provider کا infrastructure overloaded ہو
- کوئی proxy یا firewall response body strip کر رہی ہو
- Model temporarily unavailable ہو

یہ affect کرتا ہے: OpenRouter، Local (Ollama/LM Studio)، ZenMux، Z.AI، Fireworks۔

---

## Provider-Specific Issues

### Anthropic

**Tool format conversion۔** Triggerfish internal tool format اور Anthropic کے native tool format کے درمیان convert کرتا ہے۔ اگر tool-related errors آئیں تو check کریں کہ آپ کی tool definitions valid JSON Schema ہیں۔

**System prompt handling۔** Anthropic کو system prompt الگ field کے طور پر چاہیے، message کے طور پر نہیں۔ یہ conversion automatic ہے، لیکن اگر "system" messages conversation میں نظر آئیں تو message formatting میں کچھ غلط ہے۔

### OpenAI

**Frequency penalty۔** Triggerfish تمام OpenAI requests پر 0.3 frequency penalty apply کرتا ہے repetitive output کی حوصلہ شکنی کے لیے۔ یہ hardcoded ہے اور config کے ذریعے نہیں بدلا جا سکتا۔

**Image support۔** OpenAI message content میں base64-encoded images support کرتا ہے۔ اگر vision کام نہ کرے تو یقینی بنائیں کہ vision-capable model configure ہو (مثلاً `gpt-4o`، `gpt-4o-mini` نہیں)۔

### Google Gemini

**Key in query string۔** دوسرے providers کے برخلاف، Google API key header کی بجائے query parameter کے طور پر استعمال کرتا ہے۔ یہ automatically handle ہوتا ہے، لیکن اس کا مطلب ہے corporate proxy کے ذریعے route کرنے پر key proxy/access logs میں نظر آ سکتی ہے۔

### Ollama / LM Studio (Local)

**Server چل رہا ہونا چاہیے۔** Local providers کو Triggerfish start ہونے سے پہلے model server چلنے کی ضرورت ہے۔ اگر Ollama یا LM Studio نہیں چل رہا:

```
Local LLM request failed (connection refused)
```

**Server start کریں:**

```bash
# Ollama
ollama serve

# LM Studio
# LM Studio کھولیں اور local server start کریں
```

**Model load نہیں۔** Ollama کے ساتھ، model پہلے pull ہونا ضروری ہے:

```bash
ollama pull llama3.3:70b
```

**Endpoint override۔** اگر آپ کا local server ڈیفالٹ port پر نہ ہو:

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # Ollama ڈیفالٹ
      # endpoint: "http://localhost:1234"  # LM Studio ڈیفالٹ
```

### Fireworks

**Native API۔** Triggerfish Fireworks کا native API استعمال کرتا ہے، ان کا OpenAI-compatible endpoint نہیں۔ Model IDs OpenAI-compatible documentation میں دکھائے گئے سے مختلف ہو سکتے ہیں۔

**Model ID formats۔** Fireworks کئی model ID patterns accept کرتا ہے۔ Wizard عام formats normalize کرتا ہے، لیکن اگر verification fail ہو تو exact ID کے لیے [Fireworks model library](https://fireworks.ai/models) check کریں۔

### OpenRouter

**Model routing۔** OpenRouter مختلف providers کو requests route کرتا ہے۔ Underlying provider کی errors OpenRouter کے error format میں wrapped ہوتی ہیں۔ Actual error message extract کر کے display ہوتا ہے۔

**API error format۔** OpenRouter errors JSON objects کے طور پر return کرتا ہے۔ اگر error message generic لگے تو raw error DEBUG level پر log ہوتی ہے۔

### ZenMux / Z.AI

**Streaming support۔** دونوں providers streaming support کرتے ہیں۔ اگر streaming fail ہو:

```
ZenMux stream failed (status): error text
```

Check کریں کہ آپ کی API key میں streaming permissions ہیں (کچھ API tiers streaming access restrict کرتے ہیں)۔

---

## Failover

### Failover کیسے کام کرتا ہے

Primary provider fail ہونے پر Triggerfish `failover` list میں ہر model کو order میں try کرتا ہے:

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

اگر failover provider succeed ہو تو response اس کے ساتھ log ہوتا ہے کہ کون سا provider استعمال ہوا۔ اگر تمام providers fail ہوں تو آخری error user کو return ہوتی ہے۔

### "All providers exhausted"

Chain میں ہر provider fail ہو گیا۔ Check کریں:

1. کیا تمام API keys valid ہیں؟ ہر provider کو individually test کریں۔
2. کیا تمام providers outages experience کر رہے ہیں؟ ان کے status pages check کریں۔
3. کیا آپ کا network کسی بھی provider endpoints پر outbound HTTPS block کر رہا ہے؟

### Failover configuration

```yaml
models:
  failover_config:
    max_retries: 3          # اگلے پر جانے سے پہلے per provider retries
    retry_delay_ms: 1000    # Retries کے درمیان base delay
    conditions:             # کون سی errors failover trigger کرتی ہیں
      - timeout
      - server_error
      - rate_limited
```

### "Primary provider not found in registry"

`models.primary.provider` میں provider name `models.providers` میں configure کسی بھی provider سے match نہیں کرتا۔ Typos check کریں۔

### "Classification model provider not configured"

آپ نے `classification_models` override set کیا ہے جو `models.providers` میں موجود نہ provider reference کرتا ہے:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local        # یہ provider models.providers میں موجود ہونا چاہیے
      model: llama3.3:70b
  providers:
    # "local" یہاں define ہونا ضروری ہے
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"
```

---

## Retry Behavior

Triggerfish transient errors (network timeouts، 5xx responses) پر provider requests retry کرتا ہے۔ Retry logic:

1. Attempts کے درمیان exponential backoff سے انتظار کرتا ہے
2. ہر retry attempt WARN level پر log کرتا ہے
3. ایک provider کے لیے retries exhaust ہونے کے بعد، failover chain میں اگلے پر move کرتا ہے
4. Streaming connections کی connection establishment بمقابلہ mid-stream failures کے لیے الگ retry logic ہے

آپ logs میں retry attempts دیکھ سکتے ہیں:

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
