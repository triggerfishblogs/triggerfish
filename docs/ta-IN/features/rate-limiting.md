# Rate Limiting

Triggerfish LLM provider API limits தாக்காமல் தடுக்கும் ஒரு sliding-window rate limiter சேர்க்கிறது. இது எந்த provider ஐயும் transparently wrap செய்கிறது -- agent loop rate limits பற்றி தெரிந்திருக்க தேவையில்லை. Capacity exhausted ஆகும்போது, window போதுமான capacity free செய்யும் வரை calls தானாக delayed ஆகின்றன.

## எவ்வாறு செயல்படுகிறது

Rate limiter இரண்டு metrics track செய்ய ஒரு sliding window (default 60 வினாடிகள்) பயன்படுத்துகிறது:

- **Tokens per minute (TPM)** -- window க்குள் total tokens consumed (prompt + completion)
- **Requests per minute (RPM)** -- window க்குள் total API calls

ஒவ்வொரு LLM call க்கும் முன்பு, limiter இரண்டு limits க்கும் எதிராக available capacity சரிபார்க்கிறது. ஏதாவது exhausted ஆனால், oldest entries window இலிருந்து slide out ஆகி போதுமான capacity free செய்யும் வரை call காத்திருக்கிறது. ஒவ்வொரு call complete ஆன பிறகு, actual token usage பதிவு செய்யப்படுகிறது.

Streaming மற்றும் non-streaming calls இரண்டும் அதே budget இலிருந்து consume செய்கின்றன. Streaming calls க்கு, stream finish ஆகும்போது token usage பதிவு செய்யப்படுகிறது.

<img src="/diagrams/rate-limiter-flow.svg" alt="Rate limiter flow: Agent Loop → Rate Limiter → capacity check → forward to provider or wait" style="max-width: 100%;" />

## OpenAI Tier Limits

Rate limiter OpenAI இன் published tier limits க்கான built-in defaults ship செய்கிறது:

| Tier   | GPT-4o TPM | GPT-4o RPM | o1 TPM  | o1 RPM |
| ------ | ---------- | ---------- | ------- | ------ |
| Free   | 30,000     | 500        | 30,000  | 500    |
| Tier 1 | 30,000     | 500        | 30,000  | 500    |
| Tier 2 | 450,000    | 5,000      | 100,000 | 1,000  |
| Tier 3 | 800,000    | 5,000      | 100,000 | 1,000  |
| Tier 4 | 2,000,000  | 10,000     | 200,000 | 10,000 |
| Tier 5 | 30,000,000 | 10,000     | 200,000 | 10,000 |

::: warning இவை OpenAI இன் published limits அடிப்படையிலான defaults. உங்கள் actual limits உங்கள் OpenAI account tier மற்றும் usage history ஐ பொறுத்தது. மற்ற providers (Anthropic, Google) server-side தங்கள் சொந்த rate limits manage செய்கின்றன -- limiter OpenAI க்கு மிகவும் பயனுள்ளது, client-side throttling 429 errors தடுக்கும். :::

## கட்டமைப்பு

Wrapped provider பயன்படுத்தும்போது Rate limiting automatic. Default நடத்தைக்கு user configuration தேவையில்லை. Limiter உங்கள் provider கண்டறிந்து பொருத்தமான limits apply செய்கிறது.

Advanced பயனர்கள் `triggerfish.yaml` இல் provider config மூலம் limits customize செய்யலாம்:

```yaml
models:
  providers:
    openai:
      model: gpt-4o
      rate_limit:
        tpm: 450000 # Tokens per minute
        rpm: 5000 # Requests per minute
        window_ms: 60000 # Window size (default 60s)
```

::: info Rate limiting 429 errors மற்றும் unexpected bills இலிருந்து பாதுகாக்கிறது. இது failover chain உடன் சேர்ந்து வேலை செய்கிறது -- rate limits hit ஆகி limiter காத்திருக்க முடியாவிட்டால் (timeout), failover activate ஆகி அடுத்த provider முயற்சிக்கிறது. :::

## Usage Monitor செய்யவும்

Rate limiter current usage இன் live snapshot expose செய்கிறது:

```
{tokensUsed, requestsUsed, tpmLimit, rpmLimit, windowMs}
```

CLI மற்றும் Tide Pool இல் context progress bar context usage காட்டுகிறது. Debug logs இல் rate limit status visible:

```
[DEBUG] [provider] Rate limiter: 12,450/30,000 TPM, 8/500 RPM (window: 60s)
```

Limiter ஒரு call delay செய்யும்போது, wait time log செய்கிறது:

```
[INFO] [provider] Rate limited: waiting 4.2s for TPM capacity
```

## Channel Rate Limiting

LLM provider rate limiting கூடுதலாக, Triggerfish messaging platforms ஐ flooding தடுக்க per-channel message rate limits enforce செய்கிறது. ஒவ்வொரு channel adapter உம் outbound message frequency track செய்கிறது மற்றும் limits நெருங்கும்போது sends delay செய்கிறது.

இது பாதுகாக்கிறது:

- Excessive message volume இலிருந்து Platform API bans
- Runaway agent loops இலிருந்து Accidental spam
- Webhook-triggered message storms

Channel rate limits channel router மூலம் transparently enforce ஆகின்றன. Agent channel allow செய்வதை விட வேகமாக output generate செய்தால், செய்திகள் queue ஆகி அதிகபட்ச permitted rate இல் deliver ஆகின்றன.

## தொடர்புடையவை

- [LLM Providers மற்றும் Failover](/ta-IN/features/model-failover) -- rate limiting உடன் failover chain integration
- [கட்டமைப்பு](/ta-IN/guide/configuration) -- முழு `triggerfish.yaml` schema
