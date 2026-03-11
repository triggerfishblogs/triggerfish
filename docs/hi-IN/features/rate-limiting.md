# Rate Limiting

Triggerfish में एक sliding-window rate limiter शामिल है जो LLM provider API
सीमाओं से टकराने से रोकता है। यह किसी भी provider को पारदर्शी रूप से wrap करता
है -- agent loop को rate limits के बारे में जानने की आवश्यकता नहीं है। जब
क्षमता समाप्त हो जाती है, calls स्वचालित रूप से विलंबित होती हैं जब तक कि
window इतनी स्लाइड नहीं हो जाती कि क्षमता मुक्त हो जाए।

## यह कैसे काम करता है

Rate limiter दो मेट्रिक्स ट्रैक करने के लिए एक sliding window (डिफ़ॉल्ट 60
सेकंड) का उपयोग करता है:

- **Tokens per minute (TPM)** -- window के भीतर उपभोग किए गए कुल tokens (prompt
  + completion)
- **Requests per minute (RPM)** -- window के भीतर कुल API calls

प्रत्येक LLM call से पहले, limiter दोनों सीमाओं के विरुद्ध उपलब्ध क्षमता जाँचता
है। यदि कोई भी समाप्त हो जाती है, call तब तक प्रतीक्षा करता है जब तक कि सबसे
पुरानी entries window से बाहर स्लाइड न हो जाएँ और पर्याप्त क्षमता मुक्त न हो।
प्रत्येक call पूर्ण होने के बाद, वास्तविक token उपयोग रिकॉर्ड किया जाता है।

Streaming और non-streaming दोनों calls एक ही बजट से उपभोग करते हैं। Streaming
calls के लिए, token उपयोग stream समाप्त होने पर रिकॉर्ड किया जाता है।

<img src="/diagrams/rate-limiter-flow.svg" alt="Rate limiter प्रवाह: Agent Loop → Rate Limiter → क्षमता जाँच → provider को अग्रेषित या प्रतीक्षा" style="max-width: 100%;" />

## OpenAI Tier Limits

Rate limiter OpenAI की प्रकाशित tier limits के लिए अंतर्निहित defaults के साथ
आता है:

| Tier   | GPT-4o TPM | GPT-4o RPM | o1 TPM  | o1 RPM |
| ------ | ---------- | ---------- | ------- | ------ |
| Free   | 30,000     | 500        | 30,000  | 500    |
| Tier 1 | 30,000     | 500        | 30,000  | 500    |
| Tier 2 | 450,000    | 5,000      | 100,000 | 1,000  |
| Tier 3 | 800,000    | 5,000      | 100,000 | 1,000  |
| Tier 4 | 2,000,000  | 10,000     | 200,000 | 10,000 |
| Tier 5 | 30,000,000 | 10,000     | 200,000 | 10,000 |

::: warning ये OpenAI की प्रकाशित सीमाओं पर आधारित defaults हैं। आपकी वास्तविक
सीमाएँ आपके OpenAI account tier और उपयोग इतिहास पर निर्भर करती हैं। अन्य
providers (Anthropic, Google) अपनी rate limits server-side प्रबंधित करते हैं --
limiter OpenAI के लिए सबसे उपयोगी है जहाँ client-side throttling 429 errors
रोकती है। :::

## कॉन्फ़िगरेशन

Wrapped provider उपयोग करते समय rate limiting स्वचालित है। डिफ़ॉल्ट व्यवहार के
लिए कोई उपयोगकर्ता कॉन्फ़िगरेशन आवश्यक नहीं है। Limiter आपके provider का पता
लगाता है और उपयुक्त सीमाएँ लागू करता है।

उन्नत उपयोगकर्ता `triggerfish.yaml` में provider config के माध्यम से सीमाएँ
कस्टमाइज़ कर सकते हैं:

```yaml
models:
  providers:
    openai:
      model: gpt-4o
      rate_limit:
        tpm: 450000 # Tokens per minute
        rpm: 5000 # Requests per minute
        window_ms: 60000 # Window आकार (डिफ़ॉल्ट 60s)
```

::: info Rate limiting आपको 429 errors और अप्रत्याशित bills से बचाती है। यह
failover chain के साथ काम करती है -- यदि rate limits hit होती हैं और limiter
प्रतीक्षा नहीं कर सकता (timeout), failover अगले provider को आज़माने के लिए
सक्रिय होता है। :::

## उपयोग निगरानी

Rate limiter वर्तमान उपयोग का एक live snapshot प्रदान करता है:

```
{tokensUsed, requestsUsed, tpmLimit, rpmLimit, windowMs}
```

CLI और Tide Pool में context progress bar context उपयोग दिखाता है। Rate limit
स्थिति debug logs में दिखाई देती है:

```
[DEBUG] [provider] Rate limiter: 12,450/30,000 TPM, 8/500 RPM (window: 60s)
```

जब limiter किसी call में विलंब करता है, यह प्रतीक्षा समय लॉग करता है:

```
[INFO] [provider] Rate limited: waiting 4.2s for TPM capacity
```

## चैनल Rate Limiting

LLM provider rate limiting के अतिरिक्त, Triggerfish मैसेजिंग प्लेटफ़ॉर्म में
flooding रोकने के लिए प्रति-चैनल message rate limits प्रवर्तित करता है। प्रत्येक
channel adapter outbound message frequency ट्रैक करता है और सीमाओं के करीब
पहुँचने पर sends में विलंब करता है।

यह इनसे सुरक्षा प्रदान करता है:

- अत्यधिक message volume से प्लेटफ़ॉर्म API bans
- भागते agent loops से आकस्मिक spam
- Webhook-triggered message storms

चैनल rate limits channel router द्वारा पारदर्शी रूप से प्रवर्तित होती हैं। यदि
agent चैनल की अनुमति से तेज़ आउटपुट उत्पन्न करता है, messages queue किए जाते हैं
और अधिकतम अनुमत दर पर डिलीवर किए जाते हैं।

## संबंधित

- [LLM Providers और Failover](/hi-IN/features/model-failover) -- rate limiting
  के साथ failover chain एकीकरण
- [कॉन्फ़िगरेशन](/hi-IN/guide/configuration) -- पूर्ण `triggerfish.yaml` schema
