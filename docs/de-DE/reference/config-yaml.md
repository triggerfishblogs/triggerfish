# Konfigurationsschema

Triggerfish wird ueber `triggerfish.yaml` konfiguriert, die sich nach Ausfuehrung von `triggerfish dive` unter `~/.triggerfish/triggerfish.yaml` befindet. Diese Seite dokumentiert jeden Konfigurationsabschnitt.

::: info Secret-Referenzen Jeder Zeichenkettenwert in dieser Datei kann das `secret:`-Praefix verwenden, um auf einen im Betriebssystem-Schluesselbund gespeicherten Credential zu verweisen. Zum Beispiel loest `apiKey: "secret:provider:anthropic:apiKey"` den Wert beim Start aus dem Schluesselbund auf. Siehe [Secrets-Verwaltung](/de-DE/security/secrets#secret-references-in-configuration) fuer Details. :::

## Vollstaendiges annotiertes Beispiel

```yaml
# =============================================================================
# triggerfish.yaml -- Vollstaendige Konfigurationsreferenz
# =============================================================================

# ---------------------------------------------------------------------------
# Models: LLM-Provider-Konfiguration und Failover
# ---------------------------------------------------------------------------
models:
  # Das primaere Modell fuer Agenten-Completions
  primary:
    provider: anthropic
    model: claude-sonnet-4-5

  # Optional: Separates Vision-Modell fuer Bildbeschreibung
  # vision: glm-4.5v

  # Streaming-Antworten (Standard: true)
  # streaming: true

  # Provider-spezifische Konfiguration
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

  # Geordnete Failover-Kette
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
# Logging: Strukturierte Log-Ausgabe
# ---------------------------------------------------------------------------
logging:
  level: normal # quiet | normal | verbose | debug

# ---------------------------------------------------------------------------
# Channels: Messaging-Plattform-Verbindungen
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
# Classification: Daten-Sensitivitaetsmodell
# ---------------------------------------------------------------------------
classification:
  mode: personal

# ---------------------------------------------------------------------------
# Policy: Benutzerdefinierte Durchsetzungsregeln
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
# MCP-Server: Externe Tool-Server
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
# Scheduler: Cron-Jobs und Trigger
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
# Notifications: Zustellungspraeferenzen
# ---------------------------------------------------------------------------
notifications:
  preferred_channel: telegram
  quiet_hours: "22:00-07:00"
  batch_interval: 15m

# ---------------------------------------------------------------------------
# Agents: Multi-Agent-Routing (optional)
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
# Voice: Sprachkonfiguration (optional)
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
# Webhooks: Eingehende Ereignis-Endpunkte (optional)
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
# GitHub: GitHub-Integrationseinstellungen (optional)
# ---------------------------------------------------------------------------
github:
  auto_merge: false

# ---------------------------------------------------------------------------
# Groups: Gruppenchat-Verhalten (optional)
# ---------------------------------------------------------------------------
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"

# ---------------------------------------------------------------------------
# Web: Such- und Fetch-Konfiguration
# ---------------------------------------------------------------------------
web:
  search:
    provider: brave

# ---------------------------------------------------------------------------
# Remote: Remote-Zugriff (optional)
# ---------------------------------------------------------------------------
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
```

## Abschnittsreferenz

### `models`

| Schluessel                       | Typ      | Beschreibung                                                                                           |
| -------------------------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `primary`                        | object   | Primaere Modellreferenz mit `provider`- und `model`-Feldern                                            |
| `primary.provider`               | string   | Provider-Name (`anthropic`, `openai`, `google`, `ollama`, `lmstudio`, `openrouter`, `zenmux`, `zai`)   |
| `primary.model`                  | string   | Modellbezeichner fuer Agenten-Completions                                                              |
| `vision`                         | string   | Optionales Vision-Modell fuer automatische Bildbeschreibung (siehe [Bild und Vision](/de-DE/features/image-vision)) |
| `streaming`                      | boolean  | Streaming-Antworten aktivieren (Standard: `true`)                                                      |
| `providers`                      | object   | Provider-spezifische Konfiguration (siehe unten)                                                       |
| `failover`                       | string[] | Geordnete Liste von Fallback-Modellen                                                                  |
| `failover_config.max_retries`    | number   | Versuche pro Provider vor Failover                                                                     |
| `failover_config.retry_delay_ms` | number   | Verzoegerung zwischen Versuchen in Millisekunden                                                       |
| `failover_config.conditions`     | string[] | Bedingungen, die Failover ausloesen                                                                    |

### `channels`

Jeder Channel-Schluessel ist der Channel-Typ. Alle Channel-Typen unterstuetzen ein `classification`-Feld zur Ueberschreibung der Standard-Klassifizierungsstufe.

::: info Alle Secrets (Tokens, API-Schluessel, Passwoerter) werden im Betriebssystem-Schluesselbund gespeichert, nicht in dieser Datei. Fuehren Sie `triggerfish config add-channel <name>` aus, um Anmeldedaten sicher einzugeben. :::

### `classification`

| Schluessel | Typ                              | Beschreibung                                                                      |
| ---------- | -------------------------------- | --------------------------------------------------------------------------------- |
| `mode`     | `"personal"` oder `"enterprise"` | Bereitstellungsmodus (demnachst -- derzeit verwenden beide dieselben Klassifizierungsstufen) |

### `policy`

Benutzerdefinierte Regeln, die waehrend der Hook-Ausfuehrung ausgewertet werden. Jede Regel gibt einen Hook-Typ, Prioritaet, Bedingungen und Aktion an. Hoehere Prioritaetsnummern werden zuerst ausgewertet.

### `mcp_servers`

Externe MCP-Tool-Server. Jeder Server gibt einen Befehl zum Starten, optionale Umgebungsvariablen, eine Klassifizierungsstufe und pro-Tool-Berechtigungen an.

### `scheduler`

Cron-Job-Definitionen und Trigger-Timing. Siehe [Cron und Trigger](/de-DE/features/cron-and-triggers) fuer Details.

### `notifications`

Benachrichtigungs-Zustellungspraeferenzen. Siehe [Benachrichtigungen](/de-DE/features/notifications) fuer Details.

### `web`

| Schluessel            | Typ    | Beschreibung                                              |
| --------------------- | ------ | --------------------------------------------------------- |
| `web.search.provider` | string | Such-Backend fuer das `web_search`-Tool (aktuell: `brave`) |

Siehe [Websuche und Fetch](/de-DE/features/web-search) fuer Details.

### `logging`

| Schluessel | Typ    | Standard   | Beschreibung                                                                              |
| ---------- | ------ | ---------- | ----------------------------------------------------------------------------------------- |
| `level`    | string | `"normal"` | Log-Ausfuehrlichkeit: `quiet` (nur Fehler), `normal` (Info), `verbose` (Debug), `debug` (Trace) |

Siehe [Strukturiertes Logging](/de-DE/features/logging) fuer Details zur Log-Ausgabe und Dateirotation.

### `github`

| Schluessel   | Typ     | Standard | Beschreibung                                                                                                                                                                  |
| ------------ | ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto_merge` | boolean | `false`  | Wenn `true`, mergt der Agent PRs automatisch nach Erhalt eines genehmigenden Reviews. Wenn `false` (Standard), benachrichtigt der Agent den Eigentuemer und wartet auf eine explizite Merge-Anweisung. |

Siehe die [GitHub-Integration](/de-DE/integrations/github)-Anleitung fuer vollstaendige Einrichtungsanweisungen.
