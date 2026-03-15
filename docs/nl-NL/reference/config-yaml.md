# Configuratieschema

Triggerfish wordt geconfigureerd via `triggerfish.yaml`, te vinden op `~/.triggerfish/triggerfish.yaml` na het uitvoeren van `triggerfish dive`. Deze pagina documenteert elke configuratiesectie.

::: info Geheimreferenties Elke tekenreekswaarde in dit bestand kan het `secret:`-prefix gebruiken om te verwijzen naar een inloggegevens opgeslagen in de OS-sleutelhanger. Bijvoorbeeld: `apiKey: "secret:provider:anthropic:apiKey"` lost de waarde op uit de sleutelhanger bij het opstarten. Zie [Geheimenbeheer](/nl-NL/security/secrets#geheimreferenties-in-configuratie) voor details. :::

## Volledig geannoteerd voorbeeld

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

## Sectiereferentie

### `models`

| Sleutel                          | Type     | Beschrijving                                                                                          |
| -------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `primary`                        | object   | Primaire modelreferentie met `provider`- en `model`-velden                                            |
| `primary.provider`               | string   | Providernaam (`anthropic`, `openai`, `google`, `ollama`, `lmstudio`, `openrouter`, `zenmux`, `zai`)   |
| `primary.model`                  | string   | Modelidentificatie gebruikt voor agentcompletie                                                       |
| `vision`                         | string   | Optioneel visiemodel voor automatische beeldbeschrijving (zie [Beeld en visie](/nl-NL/features/image-vision)) |
| `streaming`                      | boolean  | Streaming-reacties inschakelen (standaard: `true`)                                                    |
| `providers`                      | object   | Provider-specifieke configuratie (zie hieronder)                                                      |
| `failover`                       | string[] | Geordende lijst van terugvalmodellen                                                                  |
| `failover_config.max_retries`    | number   | Pogingen per provider vóór failover                                                                   |
| `failover_config.retry_delay_ms` | number   | Vertraging tussen pogingen in milliseconden                                                           |
| `failover_config.conditions`     | string[] | Voorwaarden die failover activeren                                                                    |

### `channels`

Elke kanaaalsleutel is het kanaaltype. Alle kanaaltypen ondersteunen een `classification`-veld om het standaardclassificatieniveau te overschrijven.

::: info Alle geheimen (tokens, API-sleutels, wachtwoorden) worden opgeslagen in de OS-sleutelhanger, niet in dit bestand. Voer `triggerfish config add-channel <name>` uit om inloggegevens veilig in te voeren. :::

### `classification`

| Sleutel | Type                          | Beschrijving                                                                               |
| ------- | ----------------------------- | ------------------------------------------------------------------------------------------ |
| `mode`  | `"personal"` of `"enterprise"` | Implementatiemodus (binnenkort — momenteel gebruiken beide dezelfde classificatieniveaus)  |

### `policy`

Aangepaste regels geëvalueerd tijdens hookuitvoering. Elke regel specificeert een hooktype, prioriteit, voorwaarden en actie. Hogere prioriteitsnummers worden eerst geëvalueerd.

### `mcp_servers`

Externe MCP-toolservers. Elke server specificeert een opdracht om hem te starten, optionele omgevingsvariabelen, een classificatieniveau en per-tool-machtigingen.

### `plugins`

Dynamische pluginconfiguratie. Elke sleutel is een pluginnaam die overeenkomt met de map in `~/.triggerfish/plugins/`. Configuratie is optioneel — plugins geladen door de agent tijdens uitvoering (via `plugin_install`) werken zonder een configuratievermelding.

| Sleutel          | Type                            | Standaard       | Beschrijving                                                              |
| ---------------- | ------------------------------- | --------------- | ------------------------------------------------------------------------- |
| `enabled`        | boolean                         | `false`         | Of deze plugin bij opstarten moet worden geladen                          |
| `classification` | string                          | uit manifest    | Het classificatieniveau van de plugin overschrijven                       |
| `trust`          | `"sandboxed"` of `"trusted"`    | `"sandboxed"`   | Vertrouwensniveauverlening. Zowel manifest ALS configuratie moeten `"trusted"` aangeven |
| (andere sleutels) | any                            | --              | Doorgegeven aan de plugin als `context.config`                            |

Zie [Plugins](/nl-NL/integrations/plugins) voor details over het schrijven, laden en beheren van plugins.

### `scheduler`

Cron-taakdefinities en triggertiming. Zie [Cron en triggers](/nl-NL/features/cron-and-triggers) voor details.

### `notifications`

Meldingsleveringsvoorkeuren. Zie [Meldingen](/nl-NL/features/notifications) voor details.

### `web`

| Sleutel               | Type   | Beschrijving                                                  |
| --------------------- | ------ | ------------------------------------------------------------- |
| `web.search.provider` | string | Zoekbackend voor de `web_search`-tool (momenteel: `brave`)    |

Zie [Webzoeken en -ophalen](/nl-NL/features/web-search) voor details.

### `logging`

| Sleutel | Type   | Standaard  | Beschrijving                                                                                      |
| ------- | ------ | ---------- | ------------------------------------------------------------------------------------------------- |
| `level` | string | `"normal"` | Loguitgebreidheid: `quiet` (alleen fouten), `normal` (info), `verbose` (debug), `debug` (trace)  |

Zie [Gestructureerde logboekregistratie](/nl-NL/features/logging) voor details over loguitvoer en bestandsrotatie.

### `github`

| Sleutel      | Type    | Standaard | Beschrijving                                                                                                                                                                                 |
| ------------ | ------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto_merge` | boolean | `false`   | Wanneer `true`, voegt de agent PR's automatisch samen na het ontvangen van een goedkeurende beoordeling. Wanneer `false` (standaard), meldt de agent de eigenaar en wacht op een expliciete samenvoeginstructie. |

Zie de [GitHub-integratiehandleiding](/nl-NL/integrations/github) voor volledige installatie-instructies.
