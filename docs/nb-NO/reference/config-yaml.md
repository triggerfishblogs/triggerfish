# Konfigurasjonsskjema

Triggerfish konfigureres gjennom `triggerfish.yaml`, plassert på
`~/.triggerfish/triggerfish.yaml` etter kjøring av `triggerfish dive`. Denne
siden dokumenterer alle konfigurasjonseksjoner.

::: info Hemmelighetreferanser Enhver strengverdi i denne filen kan bruke
`secret:`-prefikset for å referere til en legitimasjon lagret i OS-nøkkelringen.
For eksempel løser `apiKey: "secret:provider:anthropic:apiKey"` verdien fra
nøkkelringen ved oppstart. Se
[Hemmelighetsadministrasjon](/nb-NO/security/secrets#secret-references-in-configuration)
for detaljer. :::

## Fullstendig kommentert eksempel

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
  # When the primary model doesn't support vision, images are automatically
  # described by this model before reaching the primary.
  # vision: glm-4.5v

  # Streaming responses (default: true)
  # streaming: true

  # Provider-specific configuration
  # API keys are referenced via secret: syntax and resolved from the OS keychain.
  # Run `triggerfish dive` or `triggerfish config migrate-secrets` to set up.
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
    - claude-haiku-4-5 # First fallback
    - gpt-4o # Second fallback
    - ollama/llama3 # Local fallback (no internet required)

  # Failover behavior
  failover_config:
    max_retries: 3 # Retries per provider before moving to next
    retry_delay_ms: 1000 # Delay between retries
    conditions: # What triggers failover
      - rate_limited # Provider returned 429
      - server_error # Provider returned 5xx
      - timeout # Request exceeded timeout

# ---------------------------------------------------------------------------
# Logging: Structured log output
# ---------------------------------------------------------------------------
logging:
  level: normal # quiet | normal | verbose | debug

# ---------------------------------------------------------------------------
# Channels: Messaging platform connections
# ---------------------------------------------------------------------------
# Secrets (bot tokens, API keys, passwords) are stored in the OS keychain.
# Run `triggerfish config add-channel <name>` to enter them securely.
# Only non-secret configuration appears here.
channels:
  telegram:
    ownerId: 123456789 # Your Telegram numeric user ID
    classification: INTERNAL # Default: INTERNAL

  signal:
    endpoint: "tcp://127.0.0.1:7583" # signal-cli daemon endpoint
    account: "+14155552671" # Your Signal phone number (E.164)
    classification: PUBLIC # Default: PUBLIC
    defaultGroupMode: mentioned-only # always | mentioned-only | owner-only
    groups:
      "group-id-here":
        mode: always
        classification: INTERNAL

  slack:
    classification: PUBLIC # Default: PUBLIC

  discord:
    ownerId: "your-discord-user-id" # Your Discord user ID
    classification: PUBLIC # Default: PUBLIC

  whatsapp:
    phoneNumberId: "your-phone-number-id" # From Meta Business Dashboard
    classification: PUBLIC # Default: PUBLIC

  webchat:
    port: 8765 # WebSocket port for web client
    classification: PUBLIC # Default: PUBLIC (visitors)

  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL # Default: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Classification: Data sensitivity model
# ---------------------------------------------------------------------------
classification:
  mode: personal # "personal" or "enterprise" (coming soon)
# Levels: RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC

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
          pattern: "\\b\\d{3}-\\d{2}-\\d{4}\\b" # SSN pattern
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
# Plugins in ~/.triggerfish/plugins/ are loaded at startup when enabled here.
# Plugins loaded by the agent at runtime (via plugin_install) do NOT require
# a config entry -- they default to sandboxed trust and manifest classification.
plugins:
  weather:
    enabled: true
    classification: PUBLIC
    trust: sandboxed # or "trusted" to grant full Deno permissions
    # Additional keys are passed as context.config to the plugin
    api_key: "secret:plugin:weather:apiKey"

  system-info:
    enabled: true
    classification: PUBLIC
    trust: trusted # both manifest AND config must say "trusted"

# ---------------------------------------------------------------------------
# Scheduler: Cron jobs and triggers
# ---------------------------------------------------------------------------
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 7 AM daily
        task: "Prepare morning briefing with calendar, unread emails, and weather"
        channel: telegram
        classification: INTERNAL

      - id: pipeline-check
        schedule: "0 */4 * * *" # Every 4 hours
        task: "Check Salesforce pipeline for changes and notify if significant"
        channel: slack
        classification: CONFIDENTIAL

      - id: pr-review-check
        schedule: "*/15 * * * *" # Every 15 minutes
        task: "Check open PR tracking files and query GitHub for new reviews"
        classification: INTERNAL

  trigger:
    interval: 30m # Check every 30 minutes
    classification: INTERNAL # Max taint ceiling for triggers
    quiet_hours: "22:00-07:00" # Suppress during these hours

# ---------------------------------------------------------------------------
# Notifications: Delivery preferences
# ---------------------------------------------------------------------------
notifications:
  preferred_channel: telegram # Default delivery channel
  quiet_hours: "22:00-07:00" # Suppress normal/low priority
  batch_interval: 15m # Batch low-priority notifications

# ---------------------------------------------------------------------------
# Agents: Multi-agent routing (optional)
# ---------------------------------------------------------------------------
agents:
  default: personal # Fallback agent
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
    provider: whisper # whisper | deepgram | openai
    model: base # Whisper model size
  tts:
    provider: elevenlabs # elevenlabs | openai | system
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
      # Webhook secret is stored in the OS keychain
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
  auto_merge: false # Default: false. Set true to auto-merge approved PRs.

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
    provider: brave # Search backend (brave is the default)
# API key is stored in the OS keychain

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
# Auth token is stored in the OS keychain
```

## Seksjonsreferanse

### `models`

| Nøkkel                           | Type     | Beskrivelse                                                                                                              |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ |
| `primary`                        | object   | Primærmodellreferanse med `provider`- og `model`-felter                                                                  |
| `primary.provider`               | string   | Leverandørnavn (`anthropic`, `openai`, `google`, `ollama`, `lmstudio`, `openrouter`, `zenmux`, `zai`)                   |
| `primary.model`                  | string   | Modellidentifikator brukt for agentkompletteringer                                                                       |
| `vision`                         | string   | Valgfri visjonsmodell for automatisk bildebeskrivelse (se [Bildeanalyse og vision](/nb-NO/features/image-vision))        |
| `streaming`                      | boolean  | Aktiver strømmende svar (standard: `true`)                                                                               |
| `providers`                      | object   | Leverandørspesifikk konfigurasjon (se nedenfor)                                                                          |
| `failover`                       | string[] | Ordnet liste over reservemodeller                                                                                        |
| `failover_config.max_retries`    | number   | Forsøk per leverandør før failover                                                                                       |
| `failover_config.retry_delay_ms` | number   | Forsinkelse mellom forsøk i millisekunder                                                                                |
| `failover_config.conditions`     | string[] | Betingelser som utløser failover                                                                                         |

### `channels`

Hver kanalnøkkel er kanaltypen. Alle kanaltyper støtter et `classification`-felt
for å overstyre standard klassifiseringsnivå.

::: info Alle hemmeligheter (tokens, API-nøkler, passord) lagres i OS-nøkkelringen,
ikke i denne filen. Kjør `triggerfish config add-channel <navn>` for å angi
legitimasjon sikkert. :::

### `classification`

| Nøkkel | Type                           | Beskrivelse                                                                              |
| ------ | ------------------------------ | ---------------------------------------------------------------------------------------- |
| `mode` | `"personal"` eller `"enterprise"` | Distribusjonsmodus (kommer snart — for øyeblikket bruker begge de samme klassifiseringsnivåene) |

### `policy`

Egendefinerte regler evaluert under hook-kjøring. Hver regel angir en hook-type,
prioritet, betingelser og handling. Høyere prioritetstall evalueres først.

### `mcp_servers`

Eksterne MCP-verktøyservere. Hver server angir en kommando for å starte den,
valgfrie miljøvariabler, et klassifiseringsnivå og per-verktøy-tillatelser.

### `plugins`

Dynamisk plugin-konfigurasjon. Hver nøkkel er et pluginnavn som samsvarer med
katalogen i `~/.triggerfish/plugins/`. Konfigurasjon er valgfri — plugins lastet
av agenten under kjøretid (via `plugin_install`) fungerer uten en konfigurasjonoppføring.

| Nøkkel           | Type                              | Standard       | Beskrivelse                                                        |
| ---------------- | --------------------------------- | -------------- | ------------------------------------------------------------------ |
| `enabled`        | boolean                           | `false`        | Om plugin-en skal lastes ved oppstart                              |
| `classification` | string                            | fra manifest   | Overstyr plugin-ens klassifiseringsnivå                            |
| `trust`          | `"sandboxed"` eller `"trusted"`   | `"sandboxed"`  | Tillitsnivåtildeling. Både manifest OG konfig må si `"trusted"`    |
| (andre nøkler)   | any                               | --             | Sendes til plugin-en som `context.config`                          |

Se [Plugins](/nb-NO/integrations/plugins) for detaljer om skriving, lasting og
administrasjon av plugins.

### `scheduler`

Cron-jobbdefinisjoner og trigger-timing. Se
[Cron og Triggers](/nb-NO/features/cron-and-triggers) for detaljer.

### `notifications`

Varslingsleverings-preferanser. Se [Varsler](/nb-NO/features/notifications)
for detaljer.

### `web`

| Nøkkel                | Type   | Beskrivelse                                                    |
| --------------------- | ------ | -------------------------------------------------------------- |
| `web.search.provider` | string | Søkemotor for `web_search`-verktøy (for øyeblikket: `brave`)  |

Se [Nettsøk og -henting](/nb-NO/features/web-search) for detaljer.

### `logging`

| Nøkkel  | Type   | Standard   | Beskrivelse                                                                                        |
| ------- | ------ | ---------- | -------------------------------------------------------------------------------------------------- |
| `level` | string | `"normal"` | Loggvolum: `quiet` (bare feil), `normal` (info), `verbose` (debug), `debug` (trace)               |

Se [Strukturert logging](/nb-NO/features/logging) for detaljer om loggutdata og
filrotasjon.

### `github`

| Nøkkel       | Type    | Standard | Beskrivelse                                                                                                                                                                                    |
| ------------ | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto_merge` | boolean | `false`  | Når `true`, fletter agenten automatisk PR-er etter å ha mottatt en godkjennende gjennomgang. Når `false` (standard), varsler agenten eieren og venter på en eksplisitt flettekommando. |

Se [GitHub-integrasjonen](/nb-NO/integrations/github) for fullstendige
oppsettpinstruksjoner.
