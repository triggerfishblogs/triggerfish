# Configuration

Triggerfish is configured through a single YAML file at `~/.triggerfish/triggerfish.yaml`. The setup wizard (`triggerfish dive`) creates this file for you, but you can edit it manually at any time.

## Config File Location

```
~/.triggerfish/triggerfish.yaml
```

You can also open it directly with:

```bash
triggerfish config edit
```

And validate your changes with:

```bash
triggerfish config validate
```

## Models

The `models` section configures your LLM providers and failover behavior.

```yaml
models:
  # Which provider to use by default
  primary: anthropic

  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929
      # Auth: apiKey field or ANTHROPIC_API_KEY env var

    openai:
      model: gpt-4o
      # Uses OPENAI_API_KEY from environment

    google:
      model: gemini-2.5-pro
      # Uses GOOGLE_API_KEY from environment

    local:
      model: llama3
      baseUrl: "http://localhost:11434/v1"  # Ollama default

    openrouter:
      model: anthropic/claude-sonnet-4-5
      # Uses OPENROUTER_API_KEY from environment

  # Failover chain: if primary fails, try these in order
  failover:
    - openai
    - google
```


### Provider Authentication

| Provider | Environment Variable | Notes |
|----------|---------------------|-------|
| Anthropic | `apiKey` in YAML or `ANTHROPIC_API_KEY` env var | Standard API key |
| OpenAI | `OPENAI_API_KEY` | Standard API key |
| Google | `GOOGLE_API_KEY` | Gemini API key |
| Local | None | Connects to local OpenAI-compatible endpoint |
| OpenRouter | `OPENROUTER_API_KEY` | Access any model on OpenRouter |

::: warning
Never put API keys directly in your `triggerfish.yaml`. Use environment variables or the OS keychain. Triggerfish reads secrets from the environment at startup.
:::

## Channels

The `channels` section defines which messaging platforms your agent connects to and the classification level for each.

```yaml
channels:
  cli:
    enabled: true
    classification: INTERNAL

  telegram:
    enabled: true
    botToken: "${TELEGRAM_BOT_TOKEN}"
    ownerId: 123456789
    classification: INTERNAL

  slack:
    enabled: true
    botToken: "${SLACK_BOT_TOKEN}"
    appToken: "${SLACK_APP_TOKEN}"
    signingSecret: "${SLACK_SIGNING_SECRET}"
    classification: PUBLIC

  discord:
    enabled: true
    botToken: "${DISCORD_BOT_TOKEN}"
    ownerId: "your-discord-user-id"
    classification: PUBLIC

  whatsapp:
    enabled: true
    classification: PUBLIC
    # WhatsApp uses QR code pairing -- run triggerfish dive to set up

  webchat:
    enabled: true
    classification: PUBLIC
    port: 18790

  email:
    enabled: true
    imapHost: "imap.gmail.com"
    smtpHost: "smtp.gmail.com"
    address: "${EMAIL_ADDRESS}"
    password: "${EMAIL_APP_PASSWORD}"
    classification: CONFIDENTIAL
```

### Channel Configuration Keys

| Channel | Required Keys | Optional Keys |
|---------|--------------|---------------|
| CLI | `enabled` | `classification` |
| Telegram | `enabled`, `botToken`, `ownerId` | `classification` |
| Slack | `enabled`, `botToken`, `appToken`, `signingSecret` | `classification` |
| Discord | `enabled`, `botToken`, `ownerId` | `classification` |
| WhatsApp | `enabled` | `classification` |
| WebChat | `enabled` | `classification`, `port` |
| Email | `enabled`, `imapHost`, `smtpHost`, `address`, `password` | `classification` |

### Default Classification Levels

| Channel | Default |
|---------|---------|
| CLI | `INTERNAL` |
| Telegram | `INTERNAL` |
| Slack | `PUBLIC` |
| Discord | `PUBLIC` |
| WhatsApp | `PUBLIC` |
| WebChat | `PUBLIC` |
| Email | `PUBLIC` |

All defaults are configurable. Set any channel to any classification level.

## Classification

The `classification` section controls how Triggerfish classifies and protects data.

```yaml
classification:
  # "personal" uses: SENSITIVE > PRIVATE > PERSONAL > PUBLIC
  # "enterprise" uses: RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC
  mode: personal
```

**Personal mode labels:**

| Level | Description | Examples |
|-------|-------------|---------|
| `SENSITIVE` | Highest protection | Bank accounts, medical records, legal documents |
| `PRIVATE` | Personal business | Personal finances, contracts |
| `PERSONAL` | General personal | Notes, contacts |
| `PUBLIC` | Safe for anyone | General web info, public content |

**Enterprise mode labels:**

| Level | Description | Examples |
|-------|-------------|---------|
| `RESTRICTED` | Most sensitive | M&A documents, board materials, PII |
| `CONFIDENTIAL` | Business sensitive | CRM data, financials, HR records |
| `INTERNAL` | Company-wide | Internal wikis, team documents |
| `PUBLIC` | Safe externally | Marketing materials, public info |

## Policy

The `policy` section configures custom enforcement rules beyond the built-in protections.

```yaml
policy:
  # Default action when no rule matches
  default_action: ALLOW

  # Custom rules
  rules:
    # Block tool responses containing SSN patterns
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[SSN REDACTED]"
      log_level: ALERT

    # Rate limit external API calls
    - hook: PRE_TOOL_CALL
      conditions:
        - tool_category: external_api
      rate_limit: 100/hour
      action: BLOCK
```

::: info
The core security rules -- no write-down, session taint escalation, audit logging -- are always enforced and cannot be disabled. Custom policy rules add additional controls on top of these fixed protections.
:::

## Cron Jobs

Schedule recurring tasks for your agent:

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *"           # 7 AM daily
      task: "Prepare morning briefing with calendar, unread emails, and weather"
      channel: telegram                # Where to deliver results
      classification: INTERNAL         # Max taint ceiling for this job

    - id: pipeline-check
      schedule: "0 */4 * * *"         # Every 4 hours
      task: "Check Salesforce pipeline for changes"
      channel: slack
      classification: CONFIDENTIAL
```

Each cron job runs in its own isolated session with a classification ceiling. All cron actions pass through the normal policy hooks.

## Trigger Timing

Configure how often your agent performs proactive check-ins:

```yaml
trigger:
  interval: 30m                # Check every 30 minutes
  classification: INTERNAL     # Max taint ceiling for trigger sessions
  quiet_hours: "22:00-07:00"   # Don't trigger during quiet hours
```

The trigger system reads your `~/.triggerfish/TRIGGER.md` file to decide what to check on each wakeup. See [SPINE and Triggers](./spine-and-triggers) for details on writing your TRIGGER.md.

## Webhooks

Accept inbound events from external services:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      secret: "${GITHUB_WEBHOOK_SECRET}"
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      secret: "${SENTRY_WEBHOOK_SECRET}"
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"
```

## Full Example

Here is a complete example configuration with comments:

```yaml
# ~/.triggerfish/triggerfish.yaml

# --- LLM Providers ---
models:
  primary: anthropic
  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929
    openai:
      model: gpt-4o
  failover:
    - openai

# --- Channels ---
channels:
  cli:
    enabled: true
    classification: INTERNAL
  telegram:
    enabled: true
    botToken: "${TELEGRAM_BOT_TOKEN}"
    ownerId: 123456789
    classification: INTERNAL
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

## Next Steps

- Define your agent's identity in [SPINE.md](./spine-and-triggers)
- Set up proactive monitoring with [TRIGGER.md](./spine-and-triggers)
- Learn all CLI commands in the [Commands reference](./commands)
