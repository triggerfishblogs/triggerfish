# Configuration

Ang Triggerfish ay kino-configure sa pamamagitan ng isang YAML file sa
`~/.triggerfish/triggerfish.yaml`. Ginagawa ng setup wizard (`triggerfish dive`) ang
file na ito para sa iyo, ngunit maaari mo itong i-edit nang manu-mano anumang oras.

## Lokasyon ng Config File

```
~/.triggerfish/triggerfish.yaml
```

Maaari kang mag-set ng mga indibidwal na values mula sa command line gamit ang mga dotted paths:

```bash
triggerfish config set <key> <value>
triggerfish config get <key>
```

Awtomatikong kino-coerce ang mga Boolean at integer values. Naka-mask ang mga secrets sa output.

I-validate ang iyong configuration gamit ang:

```bash
triggerfish config validate
```

## Models

Ang `models` section ay nagko-configure ng iyong mga LLM providers at failover behavior.

```yaml
models:
  # Aling provider at model ang gagamitin bilang default
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  # Opsyonal: vision model para sa automatic na image description kapag ang primary
  # model ay walang vision support
  # vision: gemini-2.0-flash

  # Streaming responses (default: true)
  # streaming: true

  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929

    openai:
      model: gpt-4o

    google:
      model: gemini-2.5-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434" # Ollama default

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234" # LM Studio default

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # Failover chain: kung ma-fail ang primary, subukan ang mga ito sa pagkakasunod-sunod
  failover:
    - openai
    - google
```

Ang mga API keys ay nakalagak sa OS keychain, hindi sa file na ito. Ang setup wizard
(`triggerfish dive`) ay nagpro-prompt para sa iyong API key at ini-store ito nang secure. Ang Ollama at
LM Studio ay lokal at hindi nangangailangan ng authentication.

## Channels

Ang `channels` section ay nagde-define kung aling mga messaging platforms ang kinokonekta ng iyong agent
at ang classification level para sa bawat isa.

```yaml
channels:
  cli:
    enabled: true
    classification: INTERNAL

  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL

  signal:
    enabled: true
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
    defaultGroupMode: mentioned-only

  slack:
    enabled: true
    classification: PUBLIC

  discord:
    enabled: true
    ownerId: "your-discord-user-id"
    classification: PUBLIC

  whatsapp:
    enabled: true
    phoneNumberId: "your-phone-number-id"
    classification: PUBLIC

  webchat:
    enabled: true
    classification: PUBLIC
    port: 18790

  email:
    enabled: true
    imapHost: "imap.gmail.com"
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL
```

Ang mga tokens, passwords, at API keys para sa bawat channel ay nakalagak sa OS keychain.
Patakbuhin ang `triggerfish config add-channel <name>` para mag-enter ng credentials nang interactive
-- ini-save ang mga ito sa keychain, hindi sa file na ito.

### Mga Channel Configuration Keys

Non-secret configuration sa `triggerfish.yaml`:

| Channel  | Config Keys                                                    | Optional Keys                                                           |
| -------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| CLI      | `enabled`                                                      | `classification`                                                        |
| Telegram | `enabled`, `ownerId`                                           | `classification`                                                        |
| Signal   | `enabled`, `endpoint`, `account`                               | `classification`, `defaultGroupMode`, `groups`, `ownerPhone`, `pairing` |
| Slack    | `enabled`                                                      | `classification`, `ownerId`                                             |
| Discord  | `enabled`, `ownerId`                                           | `classification`                                                        |
| WhatsApp | `enabled`, `phoneNumberId`                                     | `classification`, `ownerPhone`, `webhookPort`                           |
| WebChat  | `enabled`                                                      | `classification`, `port`, `allowedOrigins`                              |
| Email    | `enabled`, `smtpApiUrl`, `imapHost`, `imapUser`, `fromAddress` | `classification`, `ownerEmail`, `imapPort`, `pollInterval`              |

Ang mga secrets (bot tokens, API keys, passwords, signing secrets) ay ini-enter sa panahon ng
channel setup at ini-store sa OS keychain.

### Mga Default na Classification Levels

| Channel  | Default        |
| -------- | -------------- |
| CLI      | `INTERNAL`     |
| Telegram | `INTERNAL`     |
| Signal   | `PUBLIC`       |
| Slack    | `PUBLIC`       |
| Discord  | `PUBLIC`       |
| WhatsApp | `PUBLIC`       |
| WebChat  | `PUBLIC`       |
| Email    | `CONFIDENTIAL` |

Lahat ng defaults ay configurable. I-set ang kahit anong channel sa kahit anong classification level.

## Mga MCP Server

Kumonekta ng mga external MCP servers para bigyan ang iyong agent ng access sa karagdagang tools. Tingnan ang
[MCP Gateway](/integrations/mcp-gateway) para sa buong security model.

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL
```

Bawat server ay dapat may `classification` level o ire-reject ito (default
deny). Gamitin ang `command` + `args` para sa mga lokal na server (naga-spawn bilang subprocesses) o
`url` para sa mga remote server (HTTP SSE). Ang mga environment values na naka-prefix ng
`keychain:` ay nire-resolve mula sa OS keychain.

Para sa tulong sa pagpili ng classification levels, tingnan ang
[Classification Guide](./classification-guide).

## Classification

Ang `classification` section ay nagko-kontrol kung paano kinaklasipika at pinoprotektahan ng Triggerfish ang
data.

```yaml
classification:
  mode: personal # "personal" o "enterprise" (paparating pa)
```

**Mga classification levels:**

| Level          | Paglalarawan    | Mga Halimbawa                                                 |
| -------------- | --------------- | ------------------------------------------------------------- |
| `RESTRICTED`   | Pinaka-sensitibo | M&A documents, PII, bank accounts, medical records           |
| `CONFIDENTIAL` | Sensitibo       | CRM data, financials, contracts, tax records                  |
| `INTERNAL`     | Internal lamang | Internal wikis, personal notes, contacts                      |
| `PUBLIC`       | Ligtas para sa lahat | Marketing materials, public info, general web content    |

Para sa detalyadong gabay sa pagpili ng tamang level para sa iyong mga integrations,
channels, at MCP servers, tingnan ang
[Classification Guide](./classification-guide).

## Policy

Ang `policy` section ay nagko-configure ng mga custom enforcement rules bukod sa mga built-in
na proteksyon.

```yaml
policy:
  # Default action kapag walang rule na tumugma
  default_action: ALLOW

  # Mga custom rules
  rules:
    # I-block ang tool responses na naglalaman ng SSN patterns
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[SSN REDACTED]"
      log_level: ALERT

    # Rate limit ng mga external API calls
    - hook: PRE_TOOL_CALL
      conditions:
        - tool_category: external_api
      rate_limit: 100/hour
      action: BLOCK
```

::: info Ang mga core security rules -- walang write-down, session taint escalation,
audit logging -- ay palaging naipapatupad at hindi maaaring i-disable. Ang mga custom policy rules
ay nagdadagdag ng mga karagdagang kontrol sa ibabaw ng mga fixed na proteksyong ito. :::

## Web Search at Fetch

Ang `web` section ay nagko-configure ng web search at content fetching, kabilang ang mga domain
security controls.

```yaml
web:
  search:
    provider: brave # Search backend (brave ang kasalukuyang sinusuportahan)
    max_results: 10
    safe_search: moderate # off, moderate, strict
  fetch:
    rate_limit: 10 # Mga request bawat minuto
    max_content_length: 50000
    timeout: 30000
    default_mode: readability # readability o raw
  domains:
    denylist:
      - "*.malware-site.com"
    allowlist: [] # Walang laman = payagan lahat (maliban sa denylist)
    classifications:
      - pattern: "*.internal.corp"
        classification: CONFIDENTIAL
```

I-setup ang search mula sa command line:

```bash
triggerfish config set web.search.provider brave
```

Ang Brave API key ay ini-enter sa panahon ng `triggerfish dive` at ini-store sa OS
keychain.

::: tip Kumuha ng Brave Search API key sa
[brave.com/search/api](https://brave.com/search/api/). Kasama sa free tier ang
2,000 queries/buwan. :::

## Mga Cron Job

Mag-iskedyul ng mga paulit-ulit na gawain para sa iyong agent:

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *" # 7 AM araw-araw
      task: "Prepare morning briefing with calendar, unread emails, and weather"
      channel: telegram # Kung saan ihahatid ang mga resulta
      classification: INTERNAL # Pinakamataas na taint ceiling para sa job na ito

    - id: pipeline-check
      schedule: "0 */4 * * *" # Tuwing 4 oras
      task: "Check Salesforce pipeline for changes"
      channel: slack
      classification: CONFIDENTIAL
```

Bawat cron job ay tumatakbo sa sarili nitong isolated session na may classification ceiling.
Lahat ng cron actions ay dumadaan sa normal na policy hooks.

## Trigger Timing

I-configure kung gaano kadalas nagsasagawa ang iyong agent ng mga proactive check-in:

```yaml
trigger:
  interval: 30m # Mag-check tuwing 30 minuto
  classification: INTERNAL # Pinakamataas na taint ceiling para sa trigger sessions
  quiet_hours: "22:00-07:00" # Huwag mag-trigger sa panahon ng quiet hours
```

Binabasa ng trigger system ang iyong `~/.triggerfish/TRIGGER.md` file para magdesisyon kung ano ang
titingnan sa bawat wakeup. Tingnan ang [SPINE at Triggers](./spine-and-triggers) para sa mga detalye
sa pagsulat ng iyong TRIGGER.md.

## Mga Webhook

Tumanggap ng mga inbound events mula sa mga external services:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"
```

## Buong Halimbawa

Narito ang isang kumpletong halimbawa ng configuration na may mga komento:

```yaml
# ~/.triggerfish/triggerfish.yaml

# --- Mga LLM Provider ---
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929
  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929
    openai:
      model: gpt-4o
  failover:
    - openai

# --- Mga Channel ---
channels:
  cli:
    enabled: true
    classification: INTERNAL
  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL
  signal:
    enabled: false
  slack:
    enabled: false

# --- Classification ---
classification:
  mode: personal

# --- Policy ---
policy:
  default_action: ALLOW

# --- Cron ---
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *"
      task: "Prepare morning briefing"
      channel: telegram
      classification: INTERNAL

# --- Triggers ---
trigger:
  interval: 30m
  classification: INTERNAL
  quiet_hours: "22:00-07:00"
```

## Mga Susunod na Hakbang

- I-define ang identity ng iyong agent sa [SPINE.md](./spine-and-triggers)
- I-setup ang proactive monitoring gamit ang [TRIGGER.md](./spine-and-triggers)
- Alamin ang lahat ng CLI commands sa [Commands reference](./commands)
