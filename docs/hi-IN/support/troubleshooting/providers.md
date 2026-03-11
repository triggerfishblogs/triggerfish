# समस्या निवारण: LLM Providers

## सामान्य Provider Errors

### 401 Unauthorized / 403 Forbidden

आपकी API key अमान्य, expired, या पर्याप्त permissions नहीं रखती।

**समाधान:**

```bash
# API key पुनः संग्रहीत करें
triggerfish config set-secret provider:<name>:apiKey <your-key>

# Daemon पुनः आरंभ करें
triggerfish stop && triggerfish start
```

Provider-विशिष्ट नोट्स:

| Provider | Key format | कहाँ से प्राप्त करें |
|----------|-----------|-----------------|
| Anthropic | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | `sk-...` | [platform.openai.com](https://platform.openai.com/) |
| Google | `AIza...` | [aistudio.google.com](https://aistudio.google.com/) |
| Fireworks | `fw_...` | [fireworks.ai](https://fireworks.ai/) |
| OpenRouter | `sk-or-...` | [openrouter.ai](https://openrouter.ai/) |

### 429 Rate Limited

आपने provider की rate limit पार कर ली है। Triggerfish अधिकांश providers के लिए 429 पर स्वचालित रूप से retry नहीं करता (Notion को छोड़कर, जिसमें built-in backoff है)।

**समाधान:** प्रतीक्षा करें और पुनः प्रयास करें। यदि आप लगातार rate limits hit करते हैं, तो विचार करें:
- उच्च limits के लिए अपने API plan को upgrade करना
- एक failover provider जोड़ना ताकि primary throttle होने पर requests आगे बढ़ सकें
- यदि scheduled tasks कारण हैं तो trigger frequency कम करना

### 500 / 502 / 503 Server Error

Provider के servers में समस्या आ रही है। ये आमतौर पर transient होती हैं।

यदि आपके पास failover chain कॉन्फ़िगर है, तो Triggerfish स्वचालित रूप से अगले provider को आज़माता है। Failover के बिना, error user तक पहुँचती है।

### "No response body for streaming"

Provider ने request स्वीकार किया लेकिन streaming call के लिए खाली response body लौटाया। ऐसा तब हो सकता है जब:

- Provider का infrastructure overloaded है
- कोई proxy या firewall response body strip कर रहा है
- Model अस्थायी रूप से अनुपलब्ध है

प्रभावित: OpenRouter, Local (Ollama/LM Studio), ZenMux, Z.AI, Fireworks।

---

## Provider-विशिष्ट समस्याएँ

### Anthropic

**Tool format conversion।** Triggerfish internal tool format और Anthropic के native tool format के बीच convert करता है। यदि आपको tool-संबंधित errors दिखते हैं, तो जाँचें कि आपकी tool definitions में valid JSON Schema है।

**System prompt handling।** Anthropic system prompt को एक अलग field के रूप में चाहता है, message के रूप में नहीं। यह conversion automatic है, लेकिन यदि आपको conversation में "system" messages दिखाई देते हैं, तो message formatting में कुछ गलत है।

### OpenAI

**Frequency penalty।** Triggerfish सभी OpenAI requests पर repetitive output को हतोत्साहित करने के लिए 0.3 frequency penalty लागू करता है। यह hardcoded है और config के माध्यम से नहीं बदला जा सकता।

**Image support।** OpenAI message content में base64-encoded images का समर्थन करता है। यदि vision काम नहीं कर रहा, तो सुनिश्चित करें कि आपके पास vision-capable model कॉन्फ़िगर है (जैसे `gpt-4o`, `gpt-4o-mini` नहीं)।

### Google Gemini

**Query string में Key।** अन्य providers के विपरीत, Google API key को query parameter के रूप में उपयोग करता है, header के रूप में नहीं। यह automatically handled होता है, लेकिन इसका अर्थ है कि key proxy/access logs में दिखाई दे सकती है यदि आप corporate proxy के माध्यम से route करते हैं।

### Ollama / LM Studio (Local)

**Server चल रहा होना चाहिए।** Local providers के लिए Triggerfish शुरू होने से पहले model server चल रहा होना आवश्यक है। यदि Ollama या LM Studio नहीं चल रहा:

```
Local LLM request failed (connection refused)
```

**Server शुरू करें:**

```bash
# Ollama
ollama serve

# LM Studio
# LM Studio खोलें और local server शुरू करें
```

**Model loaded नहीं।** Ollama के साथ, model पहले pull होना चाहिए:

```bash
ollama pull llama3.3:70b
```

**Endpoint override।** यदि आपका local server डिफ़ॉल्ट port पर नहीं है:

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # Ollama default
      # endpoint: "http://localhost:1234"  # LM Studio default
```

### Fireworks

**Native API।** Triggerfish Fireworks की native API का उपयोग करता है, उनके OpenAI-compatible endpoint का नहीं। Model IDs OpenAI-compatible documentation में दिखने वाले से भिन्न हो सकते हैं।

**Model ID formats।** Fireworks कई model ID patterns स्वीकार करता है। Wizard सामान्य formats को normalize करता है, लेकिन यदि verification विफल होता है, तो सटीक ID के लिए [Fireworks model library](https://fireworks.ai/models) जाँचें।

### OpenRouter

**Model routing।** OpenRouter विभिन्न providers को requests route करता है। Underlying provider से errors OpenRouter के error format में wrapped होती हैं। वास्तविक error message extract और प्रदर्शित किया जाता है।

**API error format।** OpenRouter errors को JSON objects के रूप में लौटाता है। यदि error message generic लगता है, तो raw error DEBUG level पर log होती है।

### ZenMux / Z.AI

**Streaming support।** दोनों providers streaming का समर्थन करते हैं। यदि streaming विफल होती है:

```
ZenMux stream failed (status): error text
```

जाँचें कि आपकी API key में streaming permissions हैं (कुछ API tiers streaming access प्रतिबंधित करते हैं)।

---

## Failover

### Failover कैसे काम करता है

जब primary provider विफल होता है, Triggerfish `failover` सूची में प्रत्येक model को क्रम में आज़माता है:

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

यदि कोई failover provider सफल होता है, तो response log किया जाता है कि कौन सा provider उपयोग हुआ। यदि सभी providers विफल होते हैं, तो अंतिम error user को लौटाई जाती है।

### "All providers exhausted"

Chain में हर provider विफल हो गया। जाँचें:

1. क्या सभी API keys वैध हैं? प्रत्येक provider को अलग-अलग test करें।
2. क्या सभी providers outage अनुभव कर रहे हैं? उनके status pages जाँचें।
3. क्या आपका network किसी provider endpoint पर outbound HTTPS block कर रहा है?

### Failover कॉन्फ़िगरेशन

```yaml
models:
  failover_config:
    max_retries: 3          # अगले पर जाने से पहले प्रति provider retries
    retry_delay_ms: 1000    # Retries के बीच base delay
    conditions:             # कौन सी errors failover trigger करती हैं
      - timeout
      - server_error
      - rate_limited
```

### "Primary provider not found in registry"

`models.primary.provider` में provider name किसी भी कॉन्फ़िगर किए गए provider से `models.providers` में मेल नहीं खाता। Typos जाँचें।

### "Classification model provider not configured"

आपने `classification_models` override सेट किया है जो `models.providers` में मौजूद नहीं provider को reference करता है:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local        # यह provider models.providers में मौजूद होना चाहिए
      model: llama3.3:70b
  providers:
    # "local" यहाँ परिभाषित होना चाहिए
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"
```

---

## Retry व्यवहार

Triggerfish transient errors (network timeouts, 5xx responses) पर provider requests retry करता है। Retry logic:

1. प्रयासों के बीच exponential backoff के साथ प्रतीक्षा करता है
2. प्रत्येक retry attempt को WARN level पर log करता है
3. एक provider के लिए retries समाप्त होने के बाद, failover chain में अगले पर जाता है
4. Streaming connections में connection establishment बनाम mid-stream विफलताओं के लिए अलग retry logic है

आप logs में retry attempts देख सकते हैं:

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
