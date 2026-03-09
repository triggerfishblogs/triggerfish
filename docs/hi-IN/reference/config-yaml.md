# Config Schema

Triggerfish `triggerfish.yaml` के माध्यम से कॉन्फ़िगर किया जाता है, जो
`triggerfish dive` चलाने के बाद `~/.triggerfish/triggerfish.yaml` पर स्थित होता है।
यह पृष्ठ प्रत्येक कॉन्फ़िगरेशन अनुभाग का दस्तावेज़ करता है।

::: info Secret References इस फ़ाइल में कोई भी string value OS keychain में
संग्रहीत credential संदर्भित करने के लिए `secret:` prefix उपयोग कर सकता है।
उदाहरण के लिए, `apiKey: "secret:provider:anthropic:apiKey"` startup पर keychain
से value resolve करता है। विवरण के लिए
[Secrets प्रबंधन](/hi-IN/security/secrets) देखें। :::

## पूर्ण Annotated उदाहरण

```yaml
# =============================================================================
# triggerfish.yaml -- पूर्ण कॉन्फ़िगरेशन संदर्भ
# =============================================================================

# ---------------------------------------------------------------------------
# Models: LLM provider कॉन्फ़िगरेशन और failover
# ---------------------------------------------------------------------------
models:
  # Agent completions के लिए उपयोग किया जाने वाला प्राथमिक model
  primary:
    provider: anthropic
    model: claude-sonnet-4-5

  # वैकल्पिक: छवि विवरण के लिए अलग vision model
  # vision: glm-4.5v

  # Streaming responses (डिफ़ॉल्ट: true)
  # streaming: true

  # Provider-विशिष्ट कॉन्फ़िगरेशन
  providers:
    anthropic:
      model: claude-sonnet-4-5

    openai:
      model: gpt-4o

    google:
      model: gemini-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434"

  # क्रमबद्ध failover chain
  failover:
    - claude-haiku-4-5
    - gpt-4o
    - ollama/llama3

  failover_config:
    max_retries: 3
    retry_delay_ms: 1000
    conditions:
      - rate_limited
      - server_error
      - timeout

# ---------------------------------------------------------------------------
# Logging: संरचित log आउटपुट
# ---------------------------------------------------------------------------
logging:
  level: normal # quiet | normal | verbose | debug

# ---------------------------------------------------------------------------
# Channels: मैसेजिंग प्लेटफ़ॉर्म connections
# ---------------------------------------------------------------------------
channels:
  telegram:
    ownerId: 123456789
    classification: INTERNAL

  slack:
    classification: PUBLIC

  discord:
    ownerId: "your-discord-user-id"
    classification: PUBLIC

# ---------------------------------------------------------------------------
# Classification: डेटा संवेदनशीलता model
# ---------------------------------------------------------------------------
classification:
  mode: personal # "personal" या "enterprise"

# ---------------------------------------------------------------------------
# MCP Servers: बाहरी tool servers
# ---------------------------------------------------------------------------
mcp_servers:
  filesystem:
    command: "deno"
    args: ["run", "--allow-read", "--allow-write", "mcp-filesystem-server.ts"]
    classification: INTERNAL

# ---------------------------------------------------------------------------
# Scheduler: Cron jobs और triggers
# ---------------------------------------------------------------------------
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *"
        task: "Prepare morning briefing with calendar, unread emails, and weather"
        channel: telegram
        classification: INTERNAL

  trigger:
    interval: 30m
    classification: INTERNAL
    quiet_hours: "22:00-07:00"

# ---------------------------------------------------------------------------
# Notifications: डिलीवरी प्राथमिकताएँ
# ---------------------------------------------------------------------------
notifications:
  preferred_channel: telegram
  quiet_hours: "22:00-07:00"
  batch_interval: 15m
```

## अनुभाग संदर्भ

### `models`

| Key                              | Type     | विवरण                                                                                             |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------- |
| `primary`                        | object   | `provider` और `model` fields के साथ प्राथमिक model संदर्भ                                          |
| `primary.provider`               | string   | Provider नाम (`anthropic`, `openai`, `google`, `ollama`, `lmstudio`, `openrouter`, `zenmux`, `zai`) |
| `primary.model`                  | string   | Agent completions के लिए उपयोग किया जाने वाला model पहचानकर्ता                                      |
| `vision`                         | string   | स्वचालित छवि विवरण के लिए वैकल्पिक vision model ([छवि और Vision](/hi-IN/features/image-vision) देखें) |
| `streaming`                      | boolean  | Streaming responses सक्षम करें (डिफ़ॉल्ट: `true`)                                                   |
| `providers`                      | object   | Provider-विशिष्ट कॉन्फ़िगरेशन (नीचे देखें)                                                         |
| `failover`                       | string[] | Fallback models की क्रमबद्ध सूची                                                                   |
| `failover_config.max_retries`    | number   | Failover से पहले प्रति provider retries                                                             |
| `failover_config.retry_delay_ms` | number   | Retries के बीच milliseconds में विलंब                                                              |
| `failover_config.conditions`     | string[] | Failover ट्रिगर करने वाली conditions                                                               |

### `channels`

प्रत्येक channel key channel type है। सभी channel types डिफ़ॉल्ट classification
स्तर override करने के लिए `classification` field का समर्थन करते हैं।

::: info सभी secrets (tokens, API keys, passwords) इस फ़ाइल में नहीं, OS keychain
में संग्रहीत हैं। Credentials सुरक्षित रूप से दर्ज करने के लिए `triggerfish config
add-channel <name>` चलाएँ। :::

### `classification`

| Key    | Type                           | विवरण                                                                            |
| ------ | ------------------------------ | -------------------------------------------------------------------------------- |
| `mode` | `"personal"` या `"enterprise"` | Deployment mode (शीघ्र आ रहा है -- वर्तमान में दोनों समान classification levels उपयोग करते हैं) |

### `policy`

Hook execution के दौरान मूल्यांकित कस्टम नियम। प्रत्येक नियम hook type,
priority, conditions, और action निर्दिष्ट करता है।

### `mcp_servers`

बाहरी MCP tool servers। प्रत्येक server launch कमांड, वैकल्पिक environment
variables, classification स्तर, और प्रति-tool permissions निर्दिष्ट करता है।

### `scheduler`

Cron job परिभाषाएँ और trigger timing। विवरण के लिए
[Cron और Triggers](/hi-IN/features/cron-and-triggers) देखें।

### `notifications`

Notification डिलीवरी प्राथमिकताएँ। विवरण के लिए
[Notifications](/hi-IN/features/notifications) देखें।

### `web`

| Key                   | Type   | विवरण                                                   |
| --------------------- | ------ | ------------------------------------------------------- |
| `web.search.provider` | string | `web_search` tool के लिए search backend (वर्तमान: `brave`) |

विवरण के लिए [वेब खोज और Fetch](/hi-IN/features/web-search) देखें।

### `logging`

| Key     | Type   | डिफ़ॉल्ट   | विवरण                                                                                 |
| ------- | ------ | --------- | ------------------------------------------------------------------------------------- |
| `level` | string | `"normal"` | Log verbosity: `quiet` (केवल errors), `normal` (info), `verbose` (debug), `debug` (trace) |

Log आउटपुट और file rotation के विवरण के लिए [संरचित लॉगिंग](/hi-IN/features/logging)
देखें।

### `github`

| Key          | Type    | डिफ़ॉल्ट | विवरण                                                                                                                                               |
| ------------ | ------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto_merge` | boolean | `false` | `true` होने पर, agent approving review प्राप्त करने के बाद PRs auto-merge करता है। `false` (डिफ़ॉल्ट) होने पर, agent owner को सूचित करता है और स्पष्ट merge निर्देश की प्रतीक्षा करता है। |

पूर्ण सेटअप निर्देशों के लिए [GitHub Integration](/hi-IN/integrations/github)
गाइड देखें।
