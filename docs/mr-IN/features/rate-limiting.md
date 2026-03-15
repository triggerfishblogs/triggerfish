# Rate Limiting

Triggerfish मध्ये sliding-window rate limiter आहे जो LLM provider API limits
hit होण्यापासून रोखतो. ते कोणत्याही provider ला transparently wrap करतो -- एजंट
loop ला rate limits बद्दल माहित असण्याची गरज नाही. Capacity exhausted झाल्यावर,
calls आपोआप delay केल्या जातात जोपर्यंत window slide होऊन enough capacity free
होत नाही.

## हे कसे काम करते

Rate limiter दोन metrics track करण्यासाठी sliding window (default 60 seconds)
वापरतो:

- **Tokens per minute (TPM)** -- window मध्ये consumed total tokens (prompt +
  completion)
- **Requests per minute (RPM)** -- window मध्ये total API calls

प्रत्येक LLM call पूर्वी, limiter दोन्ही limits विरुद्ध available capacity check
करतो. कोणतेही exhausted असल्यास, oldest entries window च्या बाहेर slide होऊन
enough capacity free होईपर्यंत call await करतो. प्रत्येक call complete झाल्यावर,
actual token usage recorded केला जातो.

Streaming आणि non-streaming दोन्ही calls same budget मधून consume करतात.
Streaming calls साठी, stream finish झाल्यावर token usage recorded केला जातो.

<img src="/diagrams/rate-limiter-flow.svg" alt="Rate limiter flow: Agent Loop → Rate Limiter → capacity check → forward to provider or wait" style="max-width: 100%;" />

## OpenAI Tier Limits

Rate limiter OpenAI च्या published tier limits साठी built-in defaults सह ship
होतो:

| Tier   | GPT-4o TPM | GPT-4o RPM | o1 TPM  | o1 RPM |
| ------ | ---------- | ---------- | ------- | ------ |
| Free   | 30,000     | 500        | 30,000  | 500    |
| Tier 1 | 30,000     | 500        | 30,000  | 500    |
| Tier 2 | 450,000    | 5,000      | 100,000 | 1,000  |
| Tier 3 | 800,000    | 5,000      | 100,000 | 1,000  |
| Tier 4 | 2,000,000  | 10,000     | 200,000 | 10,000 |
| Tier 5 | 30,000,000 | 10,000     | 200,000 | 10,000 |

::: warning हे OpenAI च्या published limits वर आधारित defaults आहेत. तुमच्या
actual limits तुमच्या OpenAI account tier आणि usage history वर अवलंबून आहेत.
इतर providers (Anthropic, Google) त्यांचे स्वतःचे rate limits server-side manage
करतात -- limiter OpenAI साठी सर्वात उपयुक्त आहे जिथे client-side throttling
429 errors रोखतो. :::

## Configuration

Rate limiting wrapped provider वापरताना automatic आहे. Default वर्तनासाठी
कोणत्याही user configuration आवश्यक नाही. Limiter तुमचा provider detect करतो
आणि appropriate limits लागू करतो.

Advanced users `triggerfish.yaml` मध्ये provider config द्वारे limits customize
करू शकतात:

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

::: info Rate limiting तुम्हाला 429 errors आणि unexpected bills पासून वाचवतो.
ते failover chain सोबत काम करतो -- rate limits hit झाल्यास आणि limiter wait
करू शकत नसल्यास (timeout), failover पुढचा provider try करण्यासाठी kick in होतो. :::

## Usage Monitoring

Rate limiter current usage चा live snapshot expose करतो:

```
{tokensUsed, requestsUsed, tpmLimit, rpmLimit, windowMs}
```

CLI आणि Tide Pool मधील context progress bar context usage दाखवतो. Rate limit
status debug logs मध्ये visible आहे:

```
[DEBUG] [provider] Rate limiter: 12,450/30,000 TPM, 8/500 RPM (window: 60s)
```

Limiter call delay करतो तेव्हा, wait time log करतो:

```
[INFO] [provider] Rate limited: waiting 4.2s for TPM capacity
```

## Channel Rate Limiting

LLM provider rate limiting व्यतिरिक्त, Triggerfish messaging platforms flooding
रोखण्यासाठी per-channel message rate limits enforce करतो. प्रत्येक channel
adapter outbound message frequency track करतो आणि limits approached होतात तेव्हा
sends delay करतो.

हे protect करतो:

- Excessive message volume मुळे platform API bans
- Runaway agent loops मुळे accidental spam
- Webhook-triggered message storms

Channel rate limits channel router द्वारे transparently enforce केल्या जातात.
एजंट channel allow करतो त्यापेक्षा जलद output generate करत असल्यास, messages
queued केले जातात आणि maximum permitted rate वर delivered होतात.

## Related

- [LLM Providers आणि Failover](/mr-IN/features/model-failover) -- rate limiting
  सह failover chain integration
- [Configuration](/mr-IN/guide/configuration) -- full `triggerfish.yaml` schema
