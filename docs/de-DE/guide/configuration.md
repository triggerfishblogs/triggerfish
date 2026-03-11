# Konfiguration

Triggerfish wird ueber eine einzelne YAML-Datei unter `~/.triggerfish/triggerfish.yaml` konfiguriert. Der Einrichtungsassistent (`triggerfish dive`) erstellt diese Datei fuer Sie, aber Sie koennen sie jederzeit manuell bearbeiten.

## Speicherort der Konfigurationsdatei

```
~/.triggerfish/triggerfish.yaml
```

Sie koennen einzelne Werte ueber die Befehlszeile mit Punkt-Pfaden setzen:

```bash
triggerfish config set <schluessel> <wert>
triggerfish config get <schluessel>
```

Boolean- und Integer-Werte werden automatisch konvertiert. Secrets werden in der Ausgabe maskiert.

Validieren Sie Ihre Konfiguration mit:

```bash
triggerfish config validate
```

## Modelle

Der `models`-Abschnitt konfiguriert Ihre LLM-Anbieter und das Failover-Verhalten.

```yaml
models:
  # Welcher Anbieter und welches Modell standardmaessig verwendet werden sollen
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  # Optional: Vision-Modell fuer automatische Bildbeschreibung, wenn das
  # primaere Modell keine Vision-Unterstuetzung hat
  # vision: gemini-2.0-flash

  # Streaming-Antworten (Standard: true)
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
      endpoint: "http://localhost:11434" # Ollama-Standard

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234" # LM Studio-Standard

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # Failover-Kette: wenn der primaere Anbieter fehlschlaegt, diese der Reihe nach versuchen
  failover:
    - openai
    - google
```

API-Schluessel werden im Betriebssystem-Schluesselbund gespeichert, nicht in dieser Datei. Der Einrichtungsassistent (`triggerfish dive`) fragt nach Ihrem API-Schluessel und speichert ihn sicher. Ollama und LM Studio sind lokal und erfordern keine Authentifizierung.

## Kanaele

Der `channels`-Abschnitt definiert, mit welchen Messaging-Plattformen sich Ihr Agent verbindet und die Klassifizierungsstufe fuer jeden Kanal.

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
    ownerId: "ihre-discord-benutzer-id"
    classification: PUBLIC

  whatsapp:
    enabled: true
    phoneNumberId: "ihre-telefonnummer-id"
    classification: PUBLIC

  webchat:
    enabled: true
    classification: PUBLIC
    port: 18790

  email:
    enabled: true
    imapHost: "imap.gmail.com"
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapUser: "sie@gmail.com"
    fromAddress: "bot@beispiel.de"
    ownerEmail: "sie@gmail.com"
    classification: CONFIDENTIAL
```

Tokens, Passwoerter und API-Schluessel fuer jeden Kanal werden im Betriebssystem-Schluesselbund gespeichert. Fuehren Sie `triggerfish config add-channel <name>` aus, um Anmeldedaten interaktiv einzugeben -- sie werden im Schluesselbund gespeichert, niemals in dieser Datei.

### Kanal-Konfigurationsschluessel

Nicht-geheime Konfiguration in `triggerfish.yaml`:

| Kanal    | Konfigurationsschluessel                                        | Optionale Schluessel                                                     |
| -------- | --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| CLI      | `enabled`                                                       | `classification`                                                        |
| Telegram | `enabled`, `ownerId`                                            | `classification`                                                        |
| Signal   | `enabled`, `endpoint`, `account`                                | `classification`, `defaultGroupMode`, `groups`, `ownerPhone`, `pairing` |
| Slack    | `enabled`                                                       | `classification`, `ownerId`                                             |
| Discord  | `enabled`, `ownerId`                                            | `classification`                                                        |
| WhatsApp | `enabled`, `phoneNumberId`                                      | `classification`, `ownerPhone`, `webhookPort`                           |
| WebChat  | `enabled`                                                       | `classification`, `port`, `allowedOrigins`                              |
| E-Mail   | `enabled`, `smtpApiUrl`, `imapHost`, `imapUser`, `fromAddress`  | `classification`, `ownerEmail`, `imapPort`, `pollInterval`              |

Secrets (Bot-Tokens, API-Schluessel, Passwoerter, Signiergeheimnisse) werden bei der Kanaleinrichtung eingegeben und im Betriebssystem-Schluesselbund gespeichert.

### Standard-Klassifizierungsstufen

| Kanal    | Standard        |
| -------- | --------------- |
| CLI      | `INTERNAL`      |
| Telegram | `INTERNAL`      |
| Signal   | `PUBLIC`        |
| Slack    | `PUBLIC`        |
| Discord  | `PUBLIC`        |
| WhatsApp | `PUBLIC`        |
| WebChat  | `PUBLIC`        |
| E-Mail   | `CONFIDENTIAL`  |

Alle Standardwerte sind konfigurierbar. Setzen Sie jeden Kanal auf jede beliebige Klassifizierungsstufe.

## MCP-Server

Verbinden Sie externe MCP-Server, um Ihrem Agenten Zugang zu zusaetzlichen Tools zu geben. Siehe [MCP Gateway](/de-DE/integrations/mcp-gateway) fuer das vollstaendige Sicherheitsmodell.

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
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/sie/docs"]
    classification: INTERNAL
```

Jeder Server muss eine `classification`-Stufe haben, sonst wird er abgelehnt (Standard-Verweigerung). Verwenden Sie `command` + `args` fuer lokale Server (als Unterprozesse gestartet) oder `url` fuer Remote-Server (HTTP SSE). Umgebungswerte mit dem Praefix `keychain:` werden aus dem Betriebssystem-Schluesselbund aufgeloest.

Hilfe bei der Auswahl der Klassifizierungsstufen finden Sie im [Klassifizierungsleitfaden](./classification-guide).

## Klassifizierung

Der `classification`-Abschnitt steuert, wie Triggerfish Daten klassifiziert und schuetzt.

```yaml
classification:
  mode: personal # "personal" oder "enterprise" (in Kuerze verfuegbar)
```

**Klassifizierungsstufen:**

| Stufe          | Beschreibung       | Beispiele                                                  |
| -------------- | ------------------ | ---------------------------------------------------------- |
| `RESTRICTED`   | Am sensibelsten    | M&A-Dokumente, PII, Bankkonten, Krankenakten               |
| `CONFIDENTIAL` | Sensibel           | CRM-Daten, Finanzen, Vertraege, Steuerunterlagen           |
| `INTERNAL`     | Nur intern         | Interne Wikis, persoenliche Notizen, Kontakte              |
| `PUBLIC`       | Fuer jeden sicher  | Marketingmaterialien, oeffentliche Infos, allg. Webinhalte |

Detaillierte Anleitungen zur Auswahl der richtigen Stufe fuer Ihre Integrationen, Kanaele und MCP-Server finden Sie im [Klassifizierungsleitfaden](./classification-guide).

## Policy

Der `policy`-Abschnitt konfiguriert benutzerdefinierte Durchsetzungsregeln ueber die integrierten Schutzmechanismen hinaus.

```yaml
policy:
  # Standardaktion, wenn keine Regel zutrifft
  default_action: ALLOW

  # Benutzerdefinierte Regeln
  rules:
    # Tool-Antworten mit SSN-Mustern blockieren
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[SSN GESCHWÄRZT]"
      log_level: ALERT

    # Externe API-Aufrufe ratenbegrenzen
    - hook: PRE_TOOL_CALL
      conditions:
        - tool_category: external_api
      rate_limit: 100/hour
      action: BLOCK
```

::: info Die Kern-Sicherheitsregeln -- kein Write-Down, Session-Taint-Eskalation, Audit-Logging -- werden immer durchgesetzt und koennen nicht deaktiviert werden. Benutzerdefinierte Policy-Regeln fuegen zusaetzliche Kontrollen ueber diese festen Schutzmechanismen hinzu. :::

## Websuche & Abruf

Der `web`-Abschnitt konfiguriert Websuche und Inhaltsabruf, einschliesslich Domain-Sicherheitskontrollen.

```yaml
web:
  search:
    provider: brave # Such-Backend (brave wird derzeit unterstuetzt)
    max_results: 10
    safe_search: moderate # off, moderate, strict
  fetch:
    rate_limit: 10 # Anfragen pro Minute
    max_content_length: 50000
    timeout: 30000
    default_mode: readability # readability oder raw
  domains:
    denylist:
      - "*.malware-site.com"
    allowlist: [] # Leer = alle erlauben (minus Denylist)
    classifications:
      - pattern: "*.internal.corp"
        classification: CONFIDENTIAL
```

Suche ueber die Befehlszeile einrichten:

```bash
triggerfish config set web.search.provider brave
```

Der Brave-API-Schluessel wird bei `triggerfish dive` eingegeben und im Betriebssystem-Schluesselbund gespeichert.

::: tip Einen Brave Search API-Schluessel erhalten Sie unter [brave.com/search/api](https://brave.com/search/api/). Der kostenlose Tarif umfasst 2.000 Abfragen/Monat. :::

## Cron-Jobs

Planen Sie wiederkehrende Aufgaben fuer Ihren Agenten:

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *" # Taeglich um 7 Uhr
      task: "Morgenbriefing mit Kalender, ungelesenen E-Mails und Wetter vorbereiten"
      channel: telegram # Wohin die Ergebnisse zugestellt werden
      classification: INTERNAL # Maximale Taint-Obergrenze fuer diesen Job

    - id: pipeline-check
      schedule: "0 */4 * * *" # Alle 4 Stunden
      task: "Salesforce-Pipeline auf Aenderungen pruefen"
      channel: slack
      classification: CONFIDENTIAL
```

Jeder Cron-Job laeuft in einer eigenen isolierten Session mit einer Klassifizierungsobergrenze. Alle Cron-Aktionen durchlaufen die normalen Policy-Hooks.

## Trigger-Timing

Konfigurieren Sie, wie oft Ihr Agent proaktive Check-ins durchfuehrt:

```yaml
trigger:
  interval: 30m # Alle 30 Minuten pruefen
  classification: INTERNAL # Maximale Taint-Obergrenze fuer Trigger-Sessions
  quiet_hours: "22:00-07:00" # Waehrend der Ruhezeiten nicht triggern
```

Das Trigger-System liest Ihre `~/.triggerfish/TRIGGER.md`-Datei, um zu entscheiden, was bei jedem Aufwachen geprueft werden soll. Siehe [SPINE und Trigger](./spine-and-triggers) fuer Details zum Schreiben Ihrer TRIGGER.md.

## Webhooks

Eingehende Ereignisse von externen Diensten empfangen:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "PR ueberpruefen und Zusammenfassung posten"
        - event: "issues.opened"
          task: "Neues Issue triagieren"

    - id: sentry-alerts
      path: /webhook/sentry
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Fehler untersuchen und wenn moeglich Fix-PR erstellen"
```

## Vollstaendiges Beispiel

Hier ist eine vollstaendige Beispielkonfiguration mit Kommentaren:

```yaml
# ~/.triggerfish/triggerfish.yaml

# --- LLM-Anbieter ---
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

# --- Kanaele ---
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

# --- Klassifizierung ---
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
      task: "Morgenbriefing vorbereiten"
      channel: telegram
      classification: INTERNAL

# --- Trigger ---
trigger:
  interval: 30m
  classification: INTERNAL
  quiet_hours: "22:00-07:00"
```

## Naechste Schritte

- Definieren Sie die Identitaet Ihres Agenten in [SPINE.md](./spine-and-triggers)
- Richten Sie proaktive Ueberwachung mit [TRIGGER.md](./spine-and-triggers) ein
- Lernen Sie alle CLI-Befehle in der [Befehlsreferenz](./commands)
