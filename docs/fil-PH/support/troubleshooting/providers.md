# Troubleshooting: LLM Providers

## Mga Karaniwang Provider Errors

### 401 Unauthorized / 403 Forbidden

Invalid, expired, o walang sapat na permissions ang iyong API key.

**Ayusin:**

```bash
# I-store ulit ang API key
triggerfish config set-secret provider:<name>:apiKey <your-key>

# I-restart ang daemon
triggerfish stop && triggerfish start
```

Mga provider-specific na notes:

| Provider | Key format | Saan makukuha |
|----------|-----------|-----------------|
| Anthropic | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | `sk-...` | [platform.openai.com](https://platform.openai.com/) |
| Google | `AIza...` | [aistudio.google.com](https://aistudio.google.com/) |
| Fireworks | `fw_...` | [fireworks.ai](https://fireworks.ai/) |
| OpenRouter | `sk-or-...` | [openrouter.ai](https://openrouter.ai/) |

### 429 Rate Limited

Nalampasan mo na ang rate limit ng provider. Hindi awtomatikong nagre-retry ang Triggerfish sa 429 para sa karamihan ng providers (maliban sa Notion, na may built-in backoff).

**Ayusin:** Maghintay at subukan ulit. Kung palaging tinatamaan mo ang rate limits, isaalang-alang na:
- I-upgrade ang iyong API plan para sa mas mataas na limits
- Magdagdag ng failover provider para dumaan ang mga requests kapag naka-throttle ang primary
- Bawasan ang trigger frequency kung ang mga scheduled tasks ang dahilan

### 500 / 502 / 503 Server Error

May mga isyu ang servers ng provider. Karaniwang transient ang mga ito.

Kung may naka-configure kang failover chain, awtomatikong susubukan ng Triggerfish ang susunod na provider. Kung walang failover, ipo-propagate ang error sa user.

### "No response body for streaming"

Tinanggap ng provider ang request pero nagbalik ng walang laman na response body para sa streaming call. Puwedeng mangyari ito kapag:

- Overloaded ang infrastructure ng provider
- May proxy o firewall na nag-strip ng response body
- Pansamantalang hindi available ang model

Naaapektuhan nito ang: OpenRouter, Local (Ollama/LM Studio), ZenMux, Z.AI, Fireworks.

---

## Mga Provider-Specific na Isyu

### Anthropic

**Tool format conversion.** Kino-convert ng Triggerfish sa pagitan ng internal tool format at native tool format ng Anthropic. Kung makakita ka ng tool-related errors, i-check na may valid JSON Schema ang iyong tool definitions.

**System prompt handling.** Nangangailangan ang Anthropic ng system prompt bilang hiwalay na field, hindi bilang mensahe. Awtomatiko ang conversion na ito, pero kung makakita ka ng "system" messages na lumalabas sa conversation, may mali sa message formatting.

### OpenAI

**Frequency penalty.** Nag-a-apply ang Triggerfish ng 0.3 frequency penalty sa lahat ng OpenAI requests para pigilan ang repetitive na output. Hardcoded ito at hindi mababago sa pamamagitan ng config.

**Image support.** Sumusuporta ang OpenAI ng base64-encoded images sa message content. Kung hindi gumagana ang vision, siguraduhing may vision-capable model ka na naka-configure (hal., `gpt-4o`, hindi `gpt-4o-mini`).

### Google Gemini

**Key sa query string.** Hindi katulad ng ibang providers, ginagamit ng Google ang API key bilang query parameter, hindi header. Awtomatikong hinahawakan ito, pero ibig sabihin nito ay puwedeng lumabas ang key sa proxy/access logs kung mag-route ka sa corporate proxy.

### Ollama / LM Studio (Local)

**Kailangang tumatakbo ang server.** Nangangailangan ang local providers na tumatakbo ang model server bago mag-start ang Triggerfish. Kung hindi tumatakbo ang Ollama o LM Studio:

```
Local LLM request failed (connection refused)
```

**I-start ang server:**

```bash
# Ollama
ollama serve

# LM Studio
# Buksan ang LM Studio at i-start ang local server
```

**Hindi naka-load ang model.** Sa Ollama, kailangan munang i-pull ang model:

```bash
ollama pull llama3.3:70b
```

**Endpoint override.** Kung hindi nasa default port ang local server mo:

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # Ollama default
      # endpoint: "http://localhost:1234"  # LM Studio default
```

### Fireworks

**Native API.** Gumagamit ang Triggerfish ng native API ng Fireworks, hindi ang kanilang OpenAI-compatible endpoint. Puwedeng mag-iba ang model IDs sa nakikita mo sa OpenAI-compatible documentation.

**Model ID formats.** Tumatanggap ang Fireworks ng ilang model ID patterns. Nino-normalize ng wizard ang mga karaniwang formats, pero kung mabigo ang verification, tingnan ang [Fireworks model library](https://fireworks.ai/models) para sa eksaktong ID.

### OpenRouter

**Model routing.** Niru-route ng OpenRouter ang mga requests sa iba't ibang providers. Ang mga errors mula sa underlying provider ay nakabalot sa error format ng OpenRouter. Kinukuha at ipinapakita ang actual error message.

**API error format.** Nagbabalik ang OpenRouter ng errors bilang JSON objects. Kung mukhang generic ang error message, naka-log ang raw error sa DEBUG level.

### ZenMux / Z.AI

**Streaming support.** Parehong sumusuporta ng streaming ang dalawang providers. Kung mabigo ang streaming:

```
ZenMux stream failed (status): error text
```

Tingnan kung may streaming permissions ang iyong API key (nirerestrict ng ilang API tiers ang streaming access).

---

## Failover

### Paano gumagana ang failover

Kapag mabigo ang primary provider, susubukan ng Triggerfish ang bawat model sa `failover` list nang sunud-sunod:

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Kung matagumpay ang failover provider, nila-log ang response kasama kung aling provider ang ginamit. Kung mabigo ang lahat ng providers, ibabalik sa user ang huling error.

### "All providers exhausted"

Nabigo ang bawat provider sa chain. Tingnan:

1. Valid ba ang lahat ng API keys? I-test ang bawat provider nang isa-isa.
2. May outages ba ang lahat ng providers? Tingnan ang kanilang status pages.
3. Bina-block ba ng iyong network ang outbound HTTPS sa alinman sa provider endpoints?

### Failover configuration

```yaml
models:
  failover_config:
    max_retries: 3          # Retries bawat provider bago lumipat sa susunod
    retry_delay_ms: 1000    # Base delay sa pagitan ng retries
    conditions:             # Aling errors ang nagti-trigger ng failover
      - timeout
      - server_error
      - rate_limited
```

### "Primary provider not found in registry"

Ang provider name sa `models.primary.provider` ay hindi tugma sa alinmang configured provider sa `models.providers`. Tingnan kung may typo.

### "Classification model provider not configured"

Nag-set ka ng `classification_models` override na nire-reference ang provider na wala sa `models.providers`:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local        # Kailangan umiiral ang provider na ito sa models.providers
      model: llama3.3:70b
  providers:
    # "local" ay kailangan defined dito
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"
```

---

## Retry Behavior

Nire-retry ng Triggerfish ang provider requests sa transient errors (network timeouts, 5xx responses). Ang retry logic:

1. Naghihintay na may exponential backoff sa pagitan ng mga attempts
2. Nila-log ang bawat retry attempt sa WARN level
3. Pagkatapos maubos ang retries para sa isang provider, lilipat sa susunod sa failover chain
4. Ang streaming connections ay may hiwalay na retry logic para sa connection establishment vs. mid-stream failures

Makikita mo ang retry attempts sa logs:

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
