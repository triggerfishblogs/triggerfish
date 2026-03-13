# Rate Limiting

Triggerfish LLM provider API limits ತಲುಪುವುದನ್ನು ತಡೆಯುವ sliding-window rate
limiter ಹೊಂದಿದೆ. ಇದು ಯಾವ provider ಅನ್ನೂ ಪಾರದರ್ಶಕವಾಗಿ wrap ಮಾಡುತ್ತದೆ -- agent
loop ಗೆ rate limits ಬಗ್ಗೆ ತಿಳಿಯಬೇಕಿಲ್ಲ. Capacity ಖಾಲಿಯಾದಾಗ, window ಸಾಕಷ್ಟು
slide ಆಗಿ capacity ಬಿಡುಗಡೆ ಮಾಡುವ ತನಕ calls ಸ್ವಯಂಚಾಲಿತವಾಗಿ ವಿಳಂಬ ಮಾಡಲ್ಪಡುತ್ತವೆ.

## ಇದು ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ

Rate limiter sliding window (ಡಿಫಾಲ್ಟ್ 60 ಸೆಕೆಂಡ್) ಬಳಸಿ ಎರಡು metrics track ಮಾಡುತ್ತದೆ:

- **Tokens per minute (TPM)** -- Window ಒಳಗೆ ಬಳಸಿದ ಒಟ್ಟು tokens (prompt + completion)
- **Requests per minute (RPM)** -- Window ಒಳಗಿನ ಒಟ್ಟು API calls

ಪ್ರತಿ LLM call ಮೊದಲು, limiter ಎರಡೂ limits ವಿರುದ್ಧ ಲಭ್ಯ capacity ತಪಾಸಿಸುತ್ತದೆ.
ಯಾವುದಾದರೂ ಖಾಲಿಯಾಗಿದ್ದರೆ, ಹಳೆ entries window ಒಳಗಿಂದ slide out ಆಗಿ ಸಾಕಷ್ಟು
capacity ಬಿಡುಗಡೆ ಮಾಡುವ ತನಕ call ನಿರೀಕ್ಷಿಸುತ್ತದೆ. ಪ್ರತಿ call ಮುಗಿದ ನಂತರ, ನಿಜ
token ಬಳಕೆ ದಾಖಲಿಸಲ್ಪಡುತ್ತದೆ.

Streaming ಮತ್ತು non-streaming ಎರಡೂ calls ಅದೇ budget ನಿಂದ ಬಳಸುತ್ತವೆ. Streaming
calls ಗಾಗಿ, stream ಮುಗಿದ ನಂತರ token ಬಳಕೆ ದಾಖಲಿಸಲ್ಪಡುತ್ತದೆ.

<img src="/diagrams/rate-limiter-flow.svg" alt="Rate limiter flow: Agent Loop → Rate Limiter → capacity check → forward to provider or wait" style="max-width: 100%;" />

## OpenAI Tier Limits

Rate limiter OpenAI ನ published tier limits ಗಾಗಿ ಅಂತರ್ನಿರ್ಮಿತ defaults ಜೊತೆ
ಬರುತ್ತದೆ:

| Tier   | GPT-4o TPM | GPT-4o RPM | o1 TPM  | o1 RPM |
| ------ | ---------- | ---------- | ------- | ------ |
| Free   | 30,000     | 500        | 30,000  | 500    |
| Tier 1 | 30,000     | 500        | 30,000  | 500    |
| Tier 2 | 450,000    | 5,000      | 100,000 | 1,000  |
| Tier 3 | 800,000    | 5,000      | 100,000 | 1,000  |
| Tier 4 | 2,000,000  | 10,000     | 200,000 | 10,000 |
| Tier 5 | 30,000,000 | 10,000     | 200,000 | 10,000 |

::: warning ಇವು OpenAI ನ published limits ಆಧಾರದ defaults. ನಿಮ್ಮ ನಿಜ limits
ನಿಮ್ಮ OpenAI account tier ಮತ್ತು ಬಳಕೆ ಇತಿಹಾಸ ಅವಲಂಬಿಸುತ್ತವೆ. ಇತರ providers
(Anthropic, Google) ತಮ್ಮ ಸ್ವಂತ rate limits server-side ನಿರ್ವಹಿಸುತ್ತವೆ -- limiter
client-side throttling 429 errors ತಡೆಯಲು OpenAI ಗೆ ಅತ್ಯಂತ ಉಪಯುಕ್ತ. :::

## ಸಂರಚನೆ

Rate limiting wrapped provider ಬಳಸಿದಾಗ ಸ್ವಯಂಚಾಲಿತ. Default ನಡವಳಿಕೆಗೆ user
configuration ಅಗತ್ಯವಿಲ್ಲ. Limiter ನಿಮ್ಮ provider ಪತ್ತೆ ಮಾಡಿ ಸೂಕ್ತ limits
ಅನ್ವಯಿಸುತ್ತದೆ.

Advanced users `triggerfish.yaml` ನಲ್ಲಿ provider config ಮೂಲಕ limits customize
ಮಾಡಬಹುದು:

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

::: info Rate limiting 429 errors ಮತ್ತು ಅನಿರೀಕ್ಷಿತ bills ನಿಂದ ರಕ್ಷಿಸುತ್ತದೆ. Failover
chain ಜೊತೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ -- rate limits ತಲುಪಿ limiter ಕಾಯಲಾಗದಿದ್ದರೆ (timeout),
failover activate ಮಾಡಿ ಮುಂದಿನ provider try ಮಾಡುತ್ತದೆ. :::

## Usage ಮೇಲ್ವಿಚಾರಣೆ

Rate limiter ಪ್ರಸ್ತುತ usage ನ live snapshot expose ಮಾಡುತ್ತದೆ:

```
{tokensUsed, requestsUsed, tpmLimit, rpmLimit, windowMs}
```

CLI ಮತ್ತು Tide Pool ನಲ್ಲಿ context progress bar context usage ತೋರಿಸುತ್ತದೆ. Rate
limit status debug logs ನಲ್ಲಿ ಗೋಚರಿಸುತ್ತದೆ:

```
[DEBUG] [provider] Rate limiter: 12,450/30,000 TPM, 8/500 RPM (window: 60s)
```

Limiter call ವಿಳಂಬ ಮಾಡಿದಾಗ, wait time log ಮಾಡುತ್ತದೆ:

```
[INFO] [provider] Rate limited: waiting 4.2s for TPM capacity
```

## Channel Rate Limiting

LLM provider rate limiting ಜೊತೆ, Triggerfish messaging platforms flood
ಮಾಡುವುದನ್ನು ತಡೆಯಲು per-channel message rate limits ಜಾರಿಗೊಳಿಸುತ್ತದೆ. ಪ್ರತಿ
channel adapter outbound message frequency track ಮಾಡಿ limits ಸಮೀಪಿಸಿದಾಗ sends
ವಿಳಂಬ ಮಾಡುತ್ತದೆ.

ಇದು ಈ ವಿಷಯಗಳ ವಿರುದ್ಧ ರಕ್ಷಿಸುತ್ತದೆ:

- ಅತಿಯಾದ message volume ನಿಂದ platform API bans
- Runaway agent loops ನಿಂದ ಆಕಸ್ಮಿಕ spam
- Webhook-triggered message storms

Channel rate limits channel router ನಿಂದ ಪಾರದರ್ಶಕವಾಗಿ ಜಾರಿಗೊಳಿಸಲ್ಪಡುತ್ತವೆ.
Agent channel ಅನುಮತಿಸುವುದಕ್ಕಿಂತ ವೇಗವಾಗಿ output ರಚಿಸಿದರೆ, messages queued ಮಾಡಿ
ಗರಿಷ್ಠ permitted rate ನಲ್ಲಿ ತಲುಪಿಸಲ್ಪಡುತ್ತವೆ.

## ಸಂಬಂಧಿತ

- [LLM Providers ಮತ್ತು Failover](/kn-IN/features/model-failover) -- rate limiting
  ಜೊತೆ failover chain ಸಂಯೋಜನೆ
- [ಸಂರಚನೆ](/kn-IN/guide/configuration) -- ಪೂರ್ಣ `triggerfish.yaml` schema
