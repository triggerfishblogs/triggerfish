# Konfigurationsschema

Triggerfish konfigureras via `triggerfish.yaml`, placerad på `~/.triggerfish/triggerfish.yaml` efter att ha kört `triggerfish dive`. Den här sidan dokumenterar varje konfigurationsavsnitt.

::: info Hemlighetshänvisningar Valfritt strängvärde i den här filen kan använda prefixet `secret:` för att referera till en uppgift lagrad i OS-nyckelringen. Till exempel löser `apiKey: "secret:provider:anthropic:apiKey"` upp värdet från nyckelringen vid uppstart. Se [Hemlighetshantering](/sv-SE/security/secrets#secret-references-in-configuration) för detaljer. :::

## Fullständigt kommenterat exempel

```yaml
# =============================================================================
# triggerfish.yaml -- Complete configuration reference
# =============================================================================

# ---------------------------------------------------------------------------
# Models: LLM provider configuration and failover
# ---------------------------------------------------------------------------
models:
  # The primary model used for agent completions
  primary:
    provider: anthropic
    model: claude-sonnet-4-5

  # Optional: separate vision model for image description
  # vision: glm-4.5v

  # Streaming responses (default: true)
  # streaming: true

  providers:
    anthropic:
      model: claude-sonnet-4-5
      # apiKey: "secret:provider:anthropic:apiKey"

    openai:
      model: gpt-4o

    google:
      model: gemini-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434"

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234"

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # Ordered failover chain -- tried in sequence when primary fails
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
# Logging: Structured log output
# ---------------------------------------------------------------------------
logging:
  level: normal # quiet | normal | verbose | debug

# ---------------------------------------------------------------------------
# Channels: Messaging platform connections
# ---------------------------------------------------------------------------
channels:
  telegram:
    ownerId: 123456789
    classification: INTERNAL

  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
    defaultGroupMode: mentioned-only
    groups:
      "group-id-here":
        mode: always
        classification: INTERNAL

  slack:
    classification: PUBLIC

  discord:
    ownerId: "your-discord-user-id"
    classification: PUBLIC

  whatsapp:
    phoneNumberId: "your-phone-number-id"
    classification: PUBLIC

  webchat:
    port: 8765
    classification: PUBLIC

  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Classification: Data sensitivity model
# ---------------------------------------------------------------------------
classification:
  mode: personal # "personal" or "enterprise" (coming soon)

# ---------------------------------------------------------------------------
# Policy: Custom enforcement rules (enterprise escape hatch)
# ---------------------------------------------------------------------------
policy:
  rules:
    - id: block-external-pii
      hook: PRE_OUTPUT
      priority: 100
      conditions:
        - type: recipient_is
          value: EXTERNAL
        - type: content_matches
          pattern: "\\b\\d{3}-\\d{2}-\\d{4}\\b"
      action: REDACT
      message: "PII redacted for external recipient"

    - id: rate-limit-browser
      hook: PRE_TOOL_CALL
      priority: 50
      conditions:
        - type: tool_name
          value: browser
        - type: rate_exceeds
          value: 10/minute
      action: BLOCK
      message: "Browser tool rate limit exceeded"

# ---------------------------------------------------------------------------
# MCP Servers: External tool servers
# ---------------------------------------------------------------------------
mcp_servers:
  filesystem:
    command: "deno"
    args: ["run", "--allow-read", "--allow-write", "mcp-filesystem-server.ts"]
    classification: INTERNAL

  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Plugins: Dynamic plugin configuration (optional)
# ---------------------------------------------------------------------------
plugins:
  weather:
    enabled: true
    classification: PUBLIC
    trust: sandboxed
    api_key: "secret:plugin:weather:apiKey"

  system-info:
    enabled: true
    classification: PUBLIC
    trust: trusted

# ---------------------------------------------------------------------------
# Scheduler: Cron jobs and triggers
# ---------------------------------------------------------------------------
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *"
        task: "Prepare morning briefing with calendar, unread emails, and weather"
        channel: telegram
        classification: INTERNAL

      - id: pipeline-check
        schedule: "0 */4 * * *"
        task: "Check Salesforce pipeline for changes and notify if significant"
        channel: slack
        classification: CONFIDENTIAL

      - id: pr-review-check
        schedule: "*/15 * * * *"
        task: "Check open PR tracking files and query GitHub for new reviews"
        classification: INTERNAL

  trigger:
    interval: 30m
    classification: INTERNAL
    quiet_hours: "22:00-07:00"

# ---------------------------------------------------------------------------
# Notifications: Delivery preferences
# ---------------------------------------------------------------------------
notifications:
  preferred_channel: telegram
  quiet_hours: "22:00-07:00"
  batch_interval: 15m

# ---------------------------------------------------------------------------
# Agents: Multi-agent routing (optional)
# ---------------------------------------------------------------------------
agents:
  default: personal
  list:
    - id: personal
      name: "Personal Assistant"
      channels: [whatsapp, telegram]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: INTERNAL

    - id: work
      name: "Work Assistant"
      channels: [slack, email]
      tools:
        profile: "coding"
        allow: [browser, github]
      model: claude-sonnet-4-5
      classification_ceiling: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Voice: Speech configuration (optional)
# ---------------------------------------------------------------------------
voice:
  stt:
    provider: whisper
    model: base
  tts:
    provider: elevenlabs
    voice_id: "your-voice-id"
  wake_word: "triggerfish"
  push_to_talk:
    shortcut: "Ctrl+Space"

# ---------------------------------------------------------------------------
# Webhooks: Inbound event endpoints (optional)
# ---------------------------------------------------------------------------
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "pull_request_review"
          task: "A PR review was submitted. Read tracking file, address feedback, commit, push."
        - event: "pull_request_review_comment"
          task: "An inline review comment was posted. Read tracking file, address comment."
        - event: "issue_comment"
          task: "A comment was posted on a PR. If tracked, address feedback."
        - event: "pull_request.closed"
          task: "PR closed or merged. Clean up branches and archive tracking file."
        - event: "issues.opened"
          task: "Triage new issue"

# ---------------------------------------------------------------------------
# GitHub: GitHub integration settings (optional)
# ---------------------------------------------------------------------------
github:
  auto_merge: false

# ---------------------------------------------------------------------------
# Groups: Group chat behavior (optional)
# ---------------------------------------------------------------------------
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"

# ---------------------------------------------------------------------------
# Web: Search and fetch configuration
# ---------------------------------------------------------------------------
web:
  search:
    provider: brave

# ---------------------------------------------------------------------------
# Remote: Remote access (optional)
# ---------------------------------------------------------------------------
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
    # Auth-token lagrad i OS-nyckelring
```

## Avsnittsreferens

### `models`

| Nyckel                           | Typ      | Beskrivning                                                                                               |
| -------------------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `primary`                        | object   | Primär modellreferens med fälten `provider` och `model`                                                   |
| `primary.provider`               | string   | Leverantörsnamn (`anthropic`, `openai`, `google`, `ollama`, `lmstudio`, `openrouter`, `zenmux`, `zai`)    |
| `primary.model`                  | string   | Modellidentifierare som används för agentkompletteringar                                                   |
| `vision`                         | string   | Valfri visionmodell för automatisk bildbeskrivning (se [Bild och vision](/sv-SE/features/image-vision))  |
| `streaming`                      | boolean  | Aktivera strömmande svar (standard: `true`)                                                               |
| `providers`                      | object   | Leverantörsspecifik konfiguration                                                                         |
| `failover`                       | string[] | Ordnad lista med reservmodeller                                                                           |
| `failover_config.max_retries`    | number   | Återförsök per leverantör före failover                                                                   |
| `failover_config.retry_delay_ms` | number   | Fördröjning mellan återförsök i millisekunder                                                             |
| `failover_config.conditions`     | string[] | Villkor som utlöser failover                                                                              |

### `channels`

Varje kanalnyckel är kanaltypen. Alla kanaltyper stöder ett `classification`-fält för att åsidosätta standardklassificeringsnivån.

::: info Alla hemligheter (tokens, API-nycklar, lösenord) lagras i OS-nyckelringen, inte i den här filen. Kör `triggerfish config add-channel <namn>` för att ange uppgifter säkert. :::

### `classification`

| Nyckel | Typ                              | Beskrivning                                                                     |
| ------ | -------------------------------- | ------------------------------------------------------------------------------- |
| `mode` | `"personal"` eller `"enterprise"` | Distributionsläge (kommer snart — för närvarande använder båda samma nivåer)   |

### `policy`

Anpassade regler utvärderade under hook-körning. Varje regel specificerar en hook-typ, prioritet, villkor och åtgärd. Högre prioritetsnummer utvärderas först.

### `mcp_servers`

Externa MCP-verktygsservrar. Varje server specificerar ett kommando för att starta den, valfria miljövariabler, en klassificeringsnivå och per-verktygsbehörigheter.

### `plugins`

Dynamisk pluginkonfiguration. Varje nyckel är ett pluginnamn som matchar katalogen i `~/.triggerfish/plugins/`. Konfiguration är valfri — plugins laddade av agenten under körtid (via `plugin_install`) fungerar utan en konfigurationspost.

| Nyckel           | Typ                              | Standard      | Beskrivning                                                              |
| ---------------- | -------------------------------- | ------------- | ------------------------------------------------------------------------ |
| `enabled`        | boolean                          | `false`       | Om pluginet ska laddas vid uppstart                                       |
| `classification` | string                           | från manifest | Åsidosätt pluginets klassificeringsnivå                                  |
| `trust`          | `"sandboxed"` eller `"trusted"`  | `"sandboxed"` | Förtroendenivåbeviljande. Både manifest OCH konfiguration måste säga `"trusted"` |
| (andra nycklar)  | valfri                           | --            | Skickas till pluginet som `context.config`                               |

Se [Plugins](/sv-SE/integrations/plugins) för detaljer om att skriva, ladda och hantera plugins.

### `scheduler`

Cron-jobbdefinitioner och triggertime. Se [Cron och triggers](/sv-SE/features/cron-and-triggers) för detaljer.

### `notifications`

Notifikationsleveransinställningar. Se [Notifikationer](/sv-SE/features/notifications) för detaljer.

### `web`

| Nyckel                | Typ    | Beskrivning                                                      |
| --------------------- | ------ | ---------------------------------------------------------------- |
| `web.search.provider` | string | Sökbakänd för verktyget `web_search` (för närvarande: `brave`)  |

Se [Webbsökning och hämtning](/sv-SE/features/web-search) för detaljer.

### `logging`

| Nyckel  | Typ    | Standard   | Beskrivning                                                                                    |
| ------- | ------ | ---------- | ---------------------------------------------------------------------------------------------- |
| `level` | string | `"normal"` | Loggdetaljeringsgrad: `quiet` (bara fel), `normal` (info), `verbose` (debug), `debug` (trace) |

Se [Strukturerad loggning](/sv-SE/features/logging) för detaljer om loggutdata och filrotation.

### `github`

| Nyckel       | Typ     | Standard | Beskrivning                                                                                                                                                                     |
| ------------ | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto_merge` | boolean | `false`  | När `true` auto-mergar agenten PRs efter att ha tagit emot en godkännandegranskning. När `false` (standard) notifierar agenten ägaren och väntar på en explicit mergeinstruktion. |

Se [GitHub-integrationsguiden](/sv-SE/integrations/github) för fullständiga installationsinstruktioner.
