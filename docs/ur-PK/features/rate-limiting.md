# Rate Limiting

Triggerfish میں sliding-window rate limiter ہے جو LLM provider API limits سے
ٹکرانے سے روکتا ہے۔ یہ کوئی بھی provider کو transparently wrap کرتا ہے — agent
loop کو rate limits کے بارے میں جاننے کی ضرورت نہیں۔ جب capacity ختم ہو جائے،
calls automatically delay ہوتی ہیں جب تک window slide نہ ہو اور capacity free نہ
ہو۔

## یہ کیسے کام کرتا ہے

Rate limiter دو metrics track کرنے کے لیے sliding window (ڈیفالٹ 60 سیکنڈ)
استعمال کرتا ہے:

- **Tokens per minute (TPM)** -- window کے اندر consumed total tokens
  (prompt + completion)
- **Requests per minute (RPM)** -- window کے اندر total API calls

ہر LLM call سے پہلے، limiter دونوں limits کے خلاف available capacity check کرتا
ہے۔ اگر کوئی ختم ہو جائے، تو call اس وقت تک رکتی ہے جب تک oldest entries window
سے slide out نہ ہوں اور کافی capacity free نہ ہو۔ ہر call complete ہونے کے بعد،
actual token usage record ہوتا ہے۔

Streaming اور non-streaming دونوں calls ایک ہی budget سے consume کرتی ہیں۔
Streaming calls کے لیے، token usage stream ختم ہونے پر record ہوتا ہے۔

<img src="/diagrams/rate-limiter-flow.svg" alt="Rate limiter flow: Agent Loop → Rate Limiter → capacity check → forward to provider or wait" style="max-width: 100%;" />

## OpenAI Tier Limits

Rate limiter OpenAI کے published tier limits کے لیے built-in defaults کے ساتھ
آتا ہے:

| Tier   | GPT-4o TPM | GPT-4o RPM | o1 TPM  | o1 RPM |
| ------ | ---------- | ---------- | ------- | ------ |
| Free   | 30,000     | 500        | 30,000  | 500    |
| Tier 1 | 30,000     | 500        | 30,000  | 500    |
| Tier 2 | 450,000    | 5,000      | 100,000 | 1,000  |
| Tier 3 | 800,000    | 5,000      | 100,000 | 1,000  |
| Tier 4 | 2,000,000  | 10,000     | 200,000 | 10,000 |
| Tier 5 | 30,000,000 | 10,000     | 200,000 | 10,000 |

::: warning یہ OpenAI کے published limits پر based defaults ہیں۔ آپ کے actual
limits آپ کے OpenAI account tier اور usage history پر depend کرتے ہیں۔ دوسرے
providers (Anthropic، Google) اپنے rate limits server-side manage کرتے ہیں —
limiter OpenAI کے لیے سب سے زیادہ مفید ہے جہاں client-side throttling 429 errors
روکتا ہے۔ :::

## Configuration

Rate limiting wrapped provider استعمال کرتے وقت automatic ہے۔ Default behavior
کے لیے کوئی user configuration ضروری نہیں۔ Limiter آپ کا provider detect کرتا
ہے اور appropriate limits apply کرتا ہے۔

Advanced users `triggerfish.yaml` میں provider config کے ذریعے limits customize
کر سکتے ہیں:

```yaml
models:
  providers:
    openai:
      model: gpt-4o
      rate_limit:
        tpm: 450000 # Tokens per minute
        rpm: 5000 # Requests per minute
        window_ms: 60000 # Window size (ڈیفالٹ 60s)
```

::: info Rate limiting آپ کو 429 errors اور unexpected bills سے بچاتی ہے۔ یہ
failover chain کے ساتھ کام کرتی ہے — اگر rate limits hit ہوں اور limiter
timeout کے اندر wait نہ کر سکے، failover kick in ہو کر اگلے provider کو try
کرتا ہے۔ :::

## Usage Monitor کریں

Rate limiter current usage کا live snapshot expose کرتا ہے:

```
{tokensUsed, requestsUsed, tpmLimit, rpmLimit, windowMs}
```

CLI اور Tide Pool میں context progress bar context usage دکھاتی ہے۔ Rate limit
status debug logs میں visible ہے:

```
[DEBUG] [provider] Rate limiter: 12,450/30,000 TPM, 8/500 RPM (window: 60s)
```

جب limiter call delay کرے، wait time log ہوتا ہے:

```
[INFO] [provider] Rate limited: waiting 4.2s for TPM capacity
```

## Channel Rate Limiting

LLM provider rate limiting کے علاوہ، Triggerfish messaging platforms کو flooding
سے روکنے کے لیے per-channel message rate limits enforce کرتا ہے۔ ہر channel adapter
outbound message frequency track کرتا ہے اور limits approach ہونے پر sends delay
کرتا ہے۔

یہ بچاتا ہے:

- Excessive message volume سے platform API bans
- Runaway agent loops سے accidental spam
- Webhook-triggered message storms سے

Channel rate limits channel router کی طرف سے transparently enforce ہوتی ہیں۔
اگر ایجنٹ channel سے زیادہ تیز output generate کرے، messages queue ہوتے ہیں
اور زیادہ سے زیادہ permitted rate پر deliver ہوتے ہیں۔

## متعلقہ

- [LLM Providers اور Failover](/ur-PK/features/model-failover) -- rate limiting
  کے ساتھ failover chain integration
- [Configuration](/ur-PK/guide/configuration) -- مکمل `triggerfish.yaml` schema
