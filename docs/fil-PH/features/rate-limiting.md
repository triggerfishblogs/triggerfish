# Rate Limiting

May sliding-window rate limiter ang Triggerfish na pumipigil sa pag-hit ng LLM provider API limits. Transparent nitong binabalot ang anumang provider -- hindi kailangan malaman ng agent loop ang tungkol sa rate limits. Kapag naubos ang capacity, awtomatikong dine-delay ang calls hangga't sapat na ang na-slide ng window para mag-free ng capacity.

## Paano Gumagana

Gumagamit ang rate limiter ng sliding window (default 60 segundo) para mag-track ng dalawang metrics:

- **Tokens per minute (TPM)** -- kabuuang tokens na nakonsumo (prompt + completion) sa loob ng window
- **Requests per minute (RPM)** -- kabuuang API calls sa loob ng window

Bago ang bawat LLM call, chine-check ng limiter ang available capacity laban sa parehong limits. Kung alinman ang naubos, naghihintay ang call hanggang mag-slide out ang pinakalumang entries sa window at mag-free ng sapat na capacity. Pagkatapos matapos ang bawat call, nire-record ang actual token usage.

Parehong streaming at non-streaming calls ay kumokonsume mula sa iisang budget. Para sa streaming calls, nire-record ang token usage kapag natapos ang stream.

<img src="/diagrams/rate-limiter-flow.svg" alt="Rate limiter flow: Agent Loop → Rate Limiter → capacity check → forward sa provider o maghintay" style="max-width: 100%;" />

## Mga OpenAI Tier Limit

May built-in defaults ang rate limiter para sa published tier limits ng OpenAI:

| Tier   | GPT-4o TPM  | GPT-4o RPM | o1 TPM  | o1 RPM |
| ------ | ----------- | ---------- | ------- | ------ |
| Free   | 30,000      | 500        | 30,000  | 500    |
| Tier 1 | 30,000      | 500        | 30,000  | 500    |
| Tier 2 | 450,000     | 5,000      | 100,000 | 1,000  |
| Tier 3 | 800,000     | 5,000      | 100,000 | 1,000  |
| Tier 4 | 2,000,000   | 10,000     | 200,000 | 10,000 |
| Tier 5 | 30,000,000  | 10,000     | 200,000 | 10,000 |

::: warning Defaults lang ang mga ito batay sa published limits ng OpenAI. Ang iyong aktwal na limits ay depende sa iyong OpenAI account tier at usage history. Ang ibang providers (Anthropic, Google) ay nagma-manage ng sarili nilang rate limits sa server-side -- pinaka-kapaki-pakinabang ang limiter para sa OpenAI kung saan pinipigilan ng client-side throttling ang 429 errors. :::

## Configuration

Automatic ang rate limiting kapag gumagamit ng wrapped provider. Walang user configuration na kailangan para sa default behavior. Awtomatikong dine-detect ng limiter ang provider mo at ina-apply ang naaangkop na limits.

Maaaring i-customize ng advanced users ang limits sa pamamagitan ng provider config sa `triggerfish.yaml`:

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

::: info Pinoprotektahan ka ng rate limiting mula sa 429 errors at unexpected bills. Gumagana ito kasabay ng failover chain -- kung na-hit ang rate limits at hindi makapaghintay ang limiter (timeout), nag-kick in ang failover para subukan ang susunod na provider. :::

## Pag-monitor ng Usage

Nag-expose ang rate limiter ng live snapshot ng kasalukuyang usage:

```
{tokensUsed, requestsUsed, tpmLimit, rpmLimit, windowMs}
```

Ipinapakita ng context progress bar sa CLI at Tide Pool ang context usage. Visible ang rate limit status sa debug logs:

```
[DEBUG] [provider] Rate limiter: 12,450/30,000 TPM, 8/500 RPM (window: 60s)
```

Kapag nag-delay ng call ang limiter, nilo-log nito ang wait time:

```
[INFO] [provider] Rate limited: waiting 4.2s for TPM capacity
```

## Channel Rate Limiting

Bukod sa LLM provider rate limiting, ine-enforce ng Triggerfish ang per-channel message rate limits para maiwasan ang pag-flood ng messaging platforms. Tina-track ng bawat channel adapter ang outbound message frequency at dine-delay ang sends kapag papalapit na sa limits.

Pinoprotektahan nito laban sa:

- Platform API bans mula sa sobrang message volume
- Hindi sinasadyang spam mula sa runaway agent loops
- Webhook-triggered message storms

Transparent na ine-enforce ng channel router ang channel rate limits. Kung mas mabilis ang pag-generate ng output ng agent kaysa sa pinapayagan ng channel, kini-queue ang messages at dine-deliver sa maximum permitted rate.

## Kaugnay

- [Mga LLM Provider at Failover](/fil-PH/features/model-failover) -- failover chain integration sa rate limiting
- [Configuration](/fil-PH/guide/configuration) -- buong `triggerfish.yaml` schema
