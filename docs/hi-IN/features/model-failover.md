# LLM Providers और Failover

Triggerfish स्वचालित failover, प्रति-agent model चयन, और session-स्तर model
स्विचिंग के साथ कई LLM providers का समर्थन करता है। कोई single-provider lock-in
नहीं।

## समर्थित Providers

| Provider   | Auth    | Models                     | नोट्स                                |
| ---------- | ------- | -------------------------- | ------------------------------------ |
| Anthropic  | API key | Claude Opus, Sonnet, Haiku | मानक Anthropic API                   |
| OpenAI     | API key | GPT-4o, o1, o3             | मानक OpenAI API                      |
| Google     | API key | Gemini Pro, Flash          | Google AI Studio API                  |
| Local      | कोई नहीं | Llama, Mistral, आदि       | Ollama-संगत, OpenAI format             |
| OpenRouter | API key | OpenRouter पर कोई भी model  | कई providers तक एकीकृत पहुँच           |
| Z.AI       | API key | GLM-4.7, GLM-4.5, GLM-5    | Z.AI Coding Plan, OpenAI-संगत         |

## LlmProvider Interface

सभी providers एक ही interface लागू करते हैं:

```typescript
interface LlmProvider {
  /** संदेश इतिहास से completion उत्पन्न करें। */
  complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResult>;

  /** Token-by-token completion स्ट्रीम करें। */
  stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncIterable<StreamChunk>;

  /** क्या यह provider tool/function calling का समर्थन करता है। */
  supportsTools: boolean;

  /** Model पहचानकर्ता (जैसे "claude-sonnet-4-5", "gpt-4o")। */
  modelId: string;
}
```

इसका अर्थ है कि आप बिना किसी application logic बदले providers स्विच कर सकते हैं।
Agent loop और सभी tool orchestration समान रूप से काम करते हैं चाहे कौन सा
provider सक्रिय हो।

## कॉन्फ़िगरेशन

### बुनियादी सेटअप

अपना प्राथमिक model और provider credentials `triggerfish.yaml` में कॉन्फ़िगर करें:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-5
  providers:
    anthropic:
      model: claude-sonnet-4-5
    openai:
      model: gpt-4o
    google:
      model: gemini-pro
    ollama:
      model: llama3
      baseUrl: "http://localhost:11434/v1" # Ollama डिफ़ॉल्ट
    openrouter:
      model: anthropic/claude-sonnet-4-5
    zai:
      model: glm-4.7
```

### Failover Chain

FailoverChain provider अनुपलब्ध होने पर स्वचालित fallback प्रदान करता है।
Fallback models की एक क्रमबद्ध सूची कॉन्फ़िगर करें:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-opus-4-5
  failover:
    - claude-sonnet-4-5 # पहला fallback
    - gpt-4o # दूसरा fallback
    - ollama/llama3 # स्थानीय fallback (इंटरनेट आवश्यक नहीं)

  failover_config:
    max_retries: 3
    retry_delay_ms: 1000
    conditions:
      - rate_limited
      - server_error
      - timeout
```

जब प्राथमिक model एक कॉन्फ़िगर की गई स्थिति (rate limiting, server error, या
timeout) के कारण विफल होता है, Triggerfish स्वचालित रूप से chain में अगले
provider को आज़माता है। यह पारदर्शी रूप से होता है -- वार्तालाप बिना रुकावट
जारी रहता है।

### Failover Conditions

| Condition      | विवरण                                       |
| -------------- | ------------------------------------------- |
| `rate_limited` | Provider 429 rate limit प्रतिक्रिया लौटाता है  |
| `server_error` | Provider 5xx server error लौटाता है           |
| `timeout`      | अनुरोध कॉन्फ़िगर किए गए timeout से अधिक होता है |

## प्रति-Agent Model चयन

[Multi-agent setup](./multi-agent) में, प्रत्येक agent अपनी भूमिका के लिए
अनुकूलित एक अलग model उपयोग कर सकता है:

```yaml
agents:
  list:
    - id: research
      model: claude-opus-4-5 # अनुसंधान के लिए सर्वोत्तम तर्क
    - id: quick-tasks
      model: claude-haiku-4-5 # सरल कार्यों के लिए तेज़ और सस्ता
    - id: coding
      model: claude-sonnet-4-5 # कोड के लिए अच्छा संतुलन
```

## Session-स्तर Model स्विचिंग

Agent लागत अनुकूलन के लिए mid-session models स्विच कर सकता है। सरल queries के
लिए तेज़ model उपयोग करें और जटिल तर्क के लिए अधिक सक्षम model पर बढ़ें। यह
`session_status` tool के माध्यम से उपलब्ध है।

## Rate Limiting

Triggerfish में एक अंतर्निहित sliding-window rate limiter शामिल है जो provider API
सीमाओं से टकराने से रोकता है। Limiter किसी भी provider को पारदर्शी रूप से wrap
करता है -- यह एक sliding window में tokens-per-minute (TPM) और requests-per-minute
(RPM) ट्रैक करता है और सीमाओं के करीब पहुँचने पर calls में देरी करता है।

Rate limiting failover के साथ काम करता है: यदि किसी provider की rate limit समाप्त
हो जाती है और limiter timeout के भीतर प्रतीक्षा नहीं कर सकता, failover chain
सक्रिय होती है और अगले provider को आज़माती है।

पूर्ण विवरण के लिए [Rate Limiting](/hi-IN/features/rate-limiting) देखें जिसमें
OpenAI tier limits शामिल हैं।

::: info API keys कभी configuration फ़ाइलों में संग्रहीत नहीं होतीं। `triggerfish
config set-secret` के माध्यम से अपने OS keychain का उपयोग करें। Secrets प्रबंधन
के विवरण के लिए [सुरक्षा मॉडल](/hi-IN/security/) देखें। :::
