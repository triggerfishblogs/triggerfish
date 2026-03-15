# ಕಾನ್ಫಿಗರೇಶನ್

Triggerfish ಅನ್ನು `~/.triggerfish/triggerfish.yaml` ನಲ್ಲಿ ಒಂದೇ YAML ಫೈಲ್ ಮೂಲಕ
ಕಾನ್ಫಿಗರ್ ಮಾಡಲಾಗುತ್ತದೆ. ಸೆಟಪ್ ವಿಝಾರ್ಡ್ (`triggerfish dive`) ನಿಮಗಾಗಿ ಈ ಫೈಲ್ ರಚಿಸುತ್ತದೆ,
ಆದರೆ ನೀವು ಇದನ್ನು ಯಾವಾಗ ಬೇಕಾದರೂ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಸಂಪಾದಿಸಬಹುದು.

## Config ಫೈಲ್ ಸ್ಥಳ

```
~/.triggerfish/triggerfish.yaml
```

ಆಜ್ಞಾ ಸಾಲಿನಿಂದ dotted paths ಬಳಸಿ ಪ್ರತ್ಯೇಕ ಮೌಲ್ಯಗಳನ್ನು ಹೊಂದಿಸಬಹುದು:

```bash
triggerfish config set <key> <value>
triggerfish config get <key>
```

ನಿಮ್ಮ ಕಾನ್ಫಿಗರೇಶನ್ ಮಾನ್ಯ ಮಾಡಿ:

```bash
triggerfish config validate
```

## ಮಾದರಿಗಳು

`models` ವಿಭಾಗ ನಿಮ್ಮ LLM ಪ್ರದಾಯಕಗಳು ಮತ್ತು failover ನಡವಳಿಕೆ ಕಾನ್ಫಿಗರ್ ಮಾಡುತ್ತದೆ.

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929

    openai:
      model: gpt-4o

    google:
      model: gemini-2.5-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434"

    openrouter:
      model: anthropic/claude-sonnet-4-5

  # Failover ಸರಪಳಿ: primary ವಿಫಲವಾದರೆ, ಇವನ್ನು ಕ್ರಮದಲ್ಲಿ ಪ್ರಯತ್ನಿಸಿ
  failover:
    - openai
    - google
```

API ಕೀಗಳನ್ನು OS keychain ನಲ್ಲಿ ಸಂಗ್ರಹಿಸಲಾಗುತ್ತದೆ, ಈ ಫೈಲ್‌ನಲ್ಲಿ ಅಲ್ಲ.

## ಚಾನೆಲ್‌ಗಳು

`channels` ವಿಭಾಗ ನಿಮ್ಮ ಏಜೆಂಟ್ ಯಾವ ಮೆಸೇಜಿಂಗ್ ಪ್ಲ್ಯಾಟ್‌ಫಾರ್ಮ್‌ಗಳಿಗೆ ಸಂಪರ್ಕಿಸುತ್ತದೆ
ಮತ್ತು ಪ್ರತಿಯೊಂದಕ್ಕೂ ವರ್ಗೀಕರಣ ಮಟ್ಟ ನಿರ್ಧರಿಸುತ್ತದೆ.

```yaml
channels:
  cli:
    enabled: true
    classification: INTERNAL

  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL

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

ಪ್ರತಿ ಚಾನೆಲ್‌ಗಾಗಿ tokens, passwords ಮತ್ತು API keys OS keychain ನಲ್ಲಿ ಸಂಗ್ರಹಿಸಲಾಗುತ್ತದೆ.
ರುಜುವಾತುಗಳನ್ನು ಸಂವಾದಾತ್ಮಕವಾಗಿ ನಮೂದಿಸಲು `triggerfish config add-channel <name>` ಚಲಾಯಿಸಿ.

### ಡಿಫಾಲ್ಟ್ ವರ್ಗೀಕರಣ ಮಟ್ಟಗಳು

| ಚಾನೆಲ್    | ಡಿಫಾಲ್ಟ್         |
| --------- | --------------- |
| CLI       | `INTERNAL`      |
| Telegram  | `INTERNAL`      |
| Signal    | `PUBLIC`        |
| Slack     | `PUBLIC`        |
| Discord   | `PUBLIC`        |
| WhatsApp  | `PUBLIC`        |
| WebChat   | `PUBLIC`        |
| Email     | `CONFIDENTIAL`  |

## MCP Servers

ನಿಮ್ಮ ಏಜೆಂಟ್‌ಗೆ ಹೆಚ್ಚುವರಿ ಉಪಕರಣಗಳ ಪ್ರವೇಶ ನೀಡಲು ಬಾಹ್ಯ MCP servers ಸಂಪರ್ಕಿಸಿ.
ಸಂಪೂರ್ಣ ಭದ್ರತಾ ಮಾದರಿಗಾಗಿ [MCP Gateway](/kn-IN/integrations/mcp-gateway) ನೋಡಿ.

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

ಪ್ರತಿ server ಗೆ `classification` ಮಟ್ಟ ಇರಬೇಕು ಇಲ್ಲದಿದ್ದರೆ ತಿರಸ್ಕರಿಸಲ್ಪಡುತ್ತದೆ (default deny).

## ವರ್ಗೀಕರಣ

```yaml
classification:
  mode: personal # "personal" ಅಥವಾ "enterprise" (ಶೀಘ್ರದಲ್ಲೇ)
```

**ವರ್ಗೀಕರಣ ಮಟ್ಟಗಳು:**

| ಮಟ್ಟ           | ವಿವರಣೆ           | ಉದಾಹರಣೆಗಳು                                              |
| -------------- | ---------------- | ------------------------------------------------------- |
| `RESTRICTED`   | ಅತ್ಯಂತ ಸೂಕ್ಷ್ಮ  | M&A ದಸ್ತಾವೇಜುಗಳು, PII, ಬ್ಯಾಂಕ್ ಖಾತೆಗಳು, ವೈದ್ಯಕೀಯ ದಾಖಲೆಗಳು |
| `CONFIDENTIAL` | ಸೂಕ್ಷ್ಮ          | CRM ಡೇಟಾ, ಹಣಕಾಸು, ಒಪ್ಪಂದಗಳು, ತೆರಿಗೆ ದಾಖಲೆಗಳು            |
| `INTERNAL`     | ಆಂತರಿಕ ಮಾತ್ರ    | ಆಂತರಿಕ wikis, ವೈಯಕ್ತಿಕ ಟಿಪ್ಪಣಿಗಳು, ಸಂಪರ್ಕಗಳು             |
| `PUBLIC`       | ಯಾರಿಗೂ ಸುರಕ್ಷಿತ | ಮಾರ್ಕೆಟಿಂಗ್ ಸಾಮಗ್ರಿ, ಸಾರ್ವಜನಿಕ ಮಾಹಿತಿ, ಸಾಮಾನ್ಯ ವೆಬ್ ವಿಷಯ    |

## ನೀತಿ

`policy` ವಿಭಾಗ ಅಂತರ್ನಿರ್ಮಿತ ರಕ್ಷಣೆಗಳ ಹೊರತಾಗಿ ಕಸ್ಟಮ್ ಜಾರಿ ನಿಯಮಗಳನ್ನು ಕಾನ್ಫಿಗರ್ ಮಾಡುತ್ತದೆ.

```yaml
policy:
  default_action: ALLOW
  rules:
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[SSN REDACTED]"
      log_level: ALERT
```

::: info ಮುಖ್ಯ ಭದ್ರತಾ ನಿಯಮಗಳು -- no write-down, session taint ಏರಿಕೆ,
audit logging -- ಯಾವಾಗಲೂ ಜಾರಿಯಲ್ಲಿರುತ್ತವೆ ಮತ್ತು ನಿಷ್ಕ್ರಿಯಗೊಳಿಸಲಾಗುವುದಿಲ್ಲ. :::

## ವೆಬ್ ಸರ್ಚ್ ಮತ್ತು Fetch

```yaml
web:
  search:
    provider: brave
    max_results: 10
    safe_search: moderate
  fetch:
    rate_limit: 10
    max_content_length: 50000
    timeout: 30000
    default_mode: readability
  domains:
    denylist:
      - "*.malware-site.com"
    allowlist: []
```

## Cron ಕೆಲಸಗಳು

ನಿಮ್ಮ ಏಜೆಂಟ್‌ಗಾಗಿ ಪುನರಾವರ್ತಿತ ಕೆಲಸಗಳನ್ನು ನಿಗದಿಪಡಿಸಿ:

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *" # ಪ್ರತಿದಿನ ಬೆಳಗ್ಗೆ 7
      task: "ಕ್ಯಾಲೆಂಡರ್, ಓದದ ಇಮೇಲ್‌ಗಳು ಮತ್ತು ಹವಾಮಾನದೊಂದಿಗೆ ಬೆಳಗಿನ ಬ್ರೀಫಿಂಗ್ ತಯಾರಿಸಿ"
      channel: telegram
      classification: INTERNAL
```

## Trigger ಸಮಯ

ನಿಮ್ಮ ಏಜೆಂಟ್ ಸಕ್ರಿಯ ಪರಿಶೀಲನೆ ಮಾಡುವ ಆವರ್ತನ ಕಾನ್ಫಿಗರ್ ಮಾಡಿ:

```yaml
trigger:
  interval: 30m
  classification: INTERNAL
  quiet_hours: "22:00-07:00"
```

## ಸಂಪೂರ್ಣ ಉದಾಹರಣೆ

```yaml
# ~/.triggerfish/triggerfish.yaml

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

channels:
  cli:
    enabled: true
    classification: INTERNAL
  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL

classification:
  mode: personal

policy:
  default_action: ALLOW

cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *"
      task: "ಬೆಳಗಿನ ಬ್ರೀಫಿಂಗ್ ತಯಾರಿಸಿ"
      channel: telegram
      classification: INTERNAL

trigger:
  interval: 30m
  classification: INTERNAL
  quiet_hours: "22:00-07:00"
```

## ಮುಂದಿನ ಹೆಜ್ಜೆಗಳು

- [SPINE.md](./spine-and-triggers) ನಲ್ಲಿ ನಿಮ್ಮ ಏಜೆಂಟ್‌ನ ಗುರುತನ್ನು ನಿರ್ಧರಿಸಿ
- [TRIGGER.md](./spine-and-triggers) ನೊಂದಿಗೆ ಸಕ್ರಿಯ ಮೇಲ್ವಿಚಾರಣೆ ಸೆಟಪ್ ಮಾಡಿ
- [ಆಜ್ಞೆ ಉಲ್ಲೇಖ](./commands) ನಲ್ಲಿ ಎಲ್ಲ CLI ಆಜ್ಞೆಗಳ ಬಗ್ಗೆ ತಿಳಿಯಿರಿ
