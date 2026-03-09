# Troubleshooting: LLM Providers

## Common Provider Errors

### 401 Unauthorised / 403 Forbidden

Your API key is invalid, expired, or does not have sufficient permissions.

**Fix:**

```bash
# Re-store the API key
triggerfish config set-secret provider:<name>:apiKey <your-key>

# Restart the daemon
triggerfish stop && triggerfish start
```

Provider-specific notes:

| Provider | Key format | Where to get it |
|----------|-----------|-----------------|
| Anthropic | `sk-ant-...` | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI | `sk-...` | [platform.openai.com](https://platform.openai.com/) |
| Google | `AIza...` | [aistudio.google.com](https://aistudio.google.com/) |
| Fireworks | `fw_...` | [fireworks.ai](https://fireworks.ai/) |
| OpenRouter | `sk-or-...` | [openrouter.ai](https://openrouter.ai/) |

### 429 Rate Limited

You have exceeded the provider's rate limit. Triggerfish does not automatically retry on 429 for most providers (except Notion, which has built-in backoff).

**Fix:** Wait and try again. If you consistently hit rate limits, consider:
- Upgrading your API plan for higher limits
- Adding a failover provider so requests fall through when the primary is throttled
- Reducing trigger frequency if scheduled tasks are the cause

### 500 / 502 / 503 Server Error

The provider's servers are experiencing issues. These are typically transient.

If you have a failover chain configured, Triggerfish tries the next provider automatically. Without failover, the error propagates to the user.

### "No response body for streaming"

The provider accepted the request but returned an empty response body for a streaming call. This can happen when:

- The provider's infrastructure is overloaded
- A proxy or firewall is stripping the response body
- The model is temporarily unavailable

This affects: OpenRouter, Local (Ollama/LM Studio), ZenMux, Z.AI, Fireworks.

---

## Provider-Specific Issues

### Anthropic

**Tool format conversion.** Triggerfish converts between internal tool format and Anthropic's native tool format. If you see tool-related errors, check that your tool definitions have valid JSON Schema.

**System prompt handling.** Anthropic requires the system prompt as a separate field, not as a message. This conversion is automatic, but if you see "system" messages appearing in conversation, something is wrong with message formatting.

### OpenAI

**Frequency penalty.** Triggerfish applies a 0.3 frequency penalty to all OpenAI requests to discourage repetitive output. This is hardcoded and cannot be changed via config.

**Image support.** OpenAI supports base64-encoded images in message content. If vision is not working, make sure you have a vision-capable model configured (e.g., `gpt-4o`, not `gpt-4o-mini`).

### Google Gemini

**Key in query string.** Unlike other providers, Google uses the API key as a query parameter, not a header. This is handled automatically, but it means the key may appear in proxy/access logs if you route through a corporate proxy.

### Ollama / LM Studio (Local)

**Server must be running.** Local providers require the model server to be running before Triggerfish starts. If Ollama or LM Studio is not running:

```
Local LLM request failed (connection refused)
```

**Start the server:**

```bash
# Ollama
ollama serve

# LM Studio
# Open LM Studio and start the local server
```

**Model not loaded.** With Ollama, the model must be pulled first:

```bash
ollama pull llama3.3:70b
```

**Endpoint override.** If your local server is not on the default port:

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # Ollama default
      # endpoint: "http://localhost:1234"  # LM Studio default
```

### Fireworks

**Native API.** Triggerfish uses Fireworks' native API, not their OpenAI-compatible endpoint. Model IDs may differ from what you see in OpenAI-compatible documentation.

**Model ID formats.** Fireworks accepts several model ID patterns. The wizard normalises common formats, but if verification fails, check the [Fireworks model library](https://fireworks.ai/models) for the exact ID.

### OpenRouter

**Model routing.** OpenRouter routes requests to various providers. Errors from the underlying provider are wrapped in OpenRouter's error format. The actual error message is extracted and displayed.

**API error format.** OpenRouter returns errors as JSON objects. If the error message seems generic, the raw error is logged at DEBUG level.

### ZenMux / Z.AI

**Streaming support.** Both providers support streaming. If streaming fails:

```
ZenMux stream failed (status): error text
```

Check that your API key has streaming permissions (some API tiers restrict streaming access).

---

## Failover

### How failover works

When the primary provider fails, Triggerfish tries each model in the `failover` list in order:

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

If a failover provider succeeds, the response is logged with which provider was used. If all providers fail, the last error is returned to the user.

### "All providers exhausted"

Every provider in the chain failed. Check:

1. Are all API keys valid? Test each provider individually.
2. Are all providers experiencing outages? Check their status pages.
3. Is your network blocking outbound HTTPS to any of the provider endpoints?

### Failover configuration

```yaml
models:
  failover_config:
    max_retries: 3          # Retries per provider before moving to next
    retry_delay_ms: 1000    # Base delay between retries
    conditions:             # Which errors trigger failover
      - timeout
      - server_error
      - rate_limited
```

### "Primary provider not found in registry"

The provider name in `models.primary.provider` does not match any configured provider in `models.providers`. Check for typos.

### "Classification model provider not configured"

You set a `classification_models` override that references a provider not present in `models.providers`:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local        # This provider must exist in models.providers
      model: llama3.3:70b
  providers:
    # "local" must be defined here
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"
```

---

## Retry Behaviour

Triggerfish retries provider requests on transient errors (network timeouts, 5xx responses). The retry logic:

1. Waits with exponential backoff between attempts
2. Logs each retry attempt at WARN level
3. After exhausting retries for one provider, moves to the next in the failover chain
4. Streaming connections have separate retry logic for connection establishment vs. mid-stream failures

You can see retry attempts in the logs:

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
