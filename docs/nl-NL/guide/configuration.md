# Configuratie

Triggerfish wordt geconfigureerd via één YAML-bestand op `~/.triggerfish/triggerfish.yaml`. De installatiewizard (`triggerfish dive`) maakt dit bestand voor u aan, maar u kunt het op elk moment handmatig bewerken.

## Locatie van het configuratiebestand

```
~/.triggerfish/triggerfish.yaml
```

U kunt afzonderlijke waarden instellen via de opdrachtregel met behulp van gestippelde paden:

```bash
triggerfish config set <sleutel> <waarde>
triggerfish config get <sleutel>
```

Booleaanse en gehele getallen worden automatisch omgezet. Geheimen worden gemaskeerd in de uitvoer.

Valideer uw configuratie met:

```bash
triggerfish config validate
```

## Modellen

De sectie `models` configureert uw LLM-aanbieders en failover-gedrag.

```yaml
models:
  # Welke aanbieder en model standaard te gebruiken
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  # Optioneel: visiemodel voor automatische afbeeldingsbeschrijving wanneer het
  # primaire model geen visieondersteuning heeft
  # vision: gemini-2.0-flash

  # Gestreamde antwoorden (standaard: true)
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
      endpoint: "http://localhost:11434" # Ollama-standaard

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234" # LM Studio-standaard

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # Failover-keten: als de primaire aanbieder uitvalt, probeer deze in volgorde
  failover:
    - openai
    - google
```

API-sleutels worden opgeslagen in de OS-sleutelhanger, niet in dit bestand. De installatiewizard (`triggerfish dive`) vraagt om uw API-sleutel en slaat deze veilig op. Ollama en LM Studio zijn lokaal en vereisen geen authenticatie.

## Kanalen

De sectie `channels` definieert met welke berichtenplatforms uw agent verbindt en het classificatieniveau voor elk kanaal.

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
    ownerId: "uw-discord-gebruikers-id"
    classification: PUBLIC

  whatsapp:
    enabled: true
    phoneNumberId: "uw-telefoonnummer-id"
    classification: PUBLIC

  webchat:
    enabled: true
    classification: PUBLIC
    port: 18790

  email:
    enabled: true
    imapHost: "imap.gmail.com"
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapUser: "u@gmail.com"
    fromAddress: "bot@voorbeeld.com"
    ownerEmail: "u@gmail.com"
    classification: CONFIDENTIAL
```

Tokens, wachtwoorden en API-sleutels voor elk kanaal worden opgeslagen in de OS-sleutelhanger. Voer `triggerfish config add-channel <naam>` uit om inloggegevens interactief in te voeren — ze worden opgeslagen in de sleutelhanger, nooit in dit bestand.

### Kanaalconfiguratiesleutels

Niet-geheime configuratie in `triggerfish.yaml`:

| Kanaal   | Configuratiesleutels                                               | Optionele sleutels                                                      |
| -------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| CLI      | `enabled`                                                          | `classification`                                                        |
| Telegram | `enabled`, `ownerId`                                               | `classification`                                                        |
| Signal   | `enabled`, `endpoint`, `account`                                   | `classification`, `defaultGroupMode`, `groups`, `ownerPhone`, `pairing` |
| Slack    | `enabled`                                                          | `classification`, `ownerId`                                             |
| Discord  | `enabled`, `ownerId`                                               | `classification`                                                        |
| WhatsApp | `enabled`, `phoneNumberId`                                         | `classification`, `ownerPhone`, `webhookPort`                           |
| WebChat  | `enabled`                                                          | `classification`, `port`, `allowedOrigins`                              |
| E-mail   | `enabled`, `smtpApiUrl`, `imapHost`, `imapUser`, `fromAddress`     | `classification`, `ownerEmail`, `imapPort`, `pollInterval`              |

Geheimen (bottokens, API-sleutels, wachtwoorden, ondertekeningsgeheimen) worden ingevoerd tijdens de kanaalinstelling en opgeslagen in de OS-sleutelhanger.

### Standaard classificatieniveaus

| Kanaal   | Standaard      |
| -------- | -------------- |
| CLI      | `INTERNAL`     |
| Telegram | `INTERNAL`     |
| Signal   | `PUBLIC`       |
| Slack    | `PUBLIC`       |
| Discord  | `PUBLIC`       |
| WhatsApp | `PUBLIC`       |
| WebChat  | `PUBLIC`       |
| E-mail   | `CONFIDENTIAL` |

Alle standaardwaarden zijn configureerbaar. Stel elk kanaal in op elk classificatieniveau.

## MCP-servers

Verbind externe MCP-servers om uw agent toegang te geven tot aanvullende tools. Zie [MCP Gateway](/nl-NL/integrations/mcp-gateway) voor het volledige beveiligingsmodel.

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
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/u/docs"]
    classification: INTERNAL
```

Elke server moet een `classification`-niveau hebben, anders wordt de server geweigerd (standaard weigeren). Gebruik `command` + `args` voor lokale servers (gestart als subprocessen) of `url` voor externe servers (HTTP SSE). Omgevingswaarden met het voorvoegsel `keychain:` worden opgelost vanuit de OS-sleutelhanger.

Voor hulp bij het kiezen van classificatieniveaus, zie de [Classificatiegids](./classification-guide).

## Classificatie

De sectie `classification` bepaalt hoe Triggerfish gegevens classificeert en beschermt.

```yaml
classification:
  mode: personal # "personal" of "enterprise" (binnenkort beschikbaar)
```

**Classificatieniveaus:**

| Niveau         | Beschrijving      | Voorbeelden                                                |
| -------------- | ----------------- | ---------------------------------------------------------- |
| `RESTRICTED`   | Meest gevoelig    | F&O-documenten, PII, bankrekeningen, medische dossiers     |
| `CONFIDENTIAL` | Gevoelig          | CRM-gegevens, financiën, contracten, belastinggegevens     |
| `INTERNAL`     | Alleen intern     | Interne wiki's, persoonlijke notities, contacten           |
| `PUBLIC`       | Veilig voor ieder | Marketingmateriaal, openbare info, algemene webinhoud      |

Voor gedetailleerde richtlijnen over het kiezen van het juiste niveau voor uw integraties, kanalen en MCP-servers, zie de [Classificatiegids](./classification-guide).

## Beleid

De sectie `policy` configureert aangepaste handhavingsregels bovenop de ingebouwde beschermingen.

```yaml
policy:
  # Standaardactie wanneer geen regel overeenkomt
  default_action: ALLOW

  # Aangepaste regels
  rules:
    # Blokkeer toolreacties die BSN-patronen bevatten
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[BSN VERWIJDERD]"
      log_level: ALERT

    # Beperk externe API-aanroepen
    - hook: PRE_TOOL_CALL
      conditions:
        - tool_category: external_api
      rate_limit: 100/hour
      action: BLOCK
```

::: info De kernbeveiligingsregels — geen write-down, sessie-taint-escalatie, auditregistratie — worden altijd gehandhaafd en kunnen niet worden uitgeschakeld. Aangepaste beleidsregels voegen extra controles toe bovenop deze vaste beveiligingen. :::

## Webzoeken en ophalen

De sectie `web` configureert webzoeken en het ophalen van inhoud, inclusief domeinstandbeveiligingscontroles.

```yaml
web:
  search:
    provider: brave # Zoekbackend (brave wordt momenteel ondersteund)
    max_results: 10
    safe_search: moderate # off, moderate, strict
  fetch:
    rate_limit: 10 # Verzoeken per minuut
    max_content_length: 50000
    timeout: 30000
    default_mode: readability # readability of raw
  domains:
    denylist:
      - "*.malware-site.com"
    allowlist: [] # Leeg = alles toestaan (minus denylist)
    classifications:
      - pattern: "*.internal.corp"
        classification: CONFIDENTIAL
```

Stel zoeken in via de opdrachtregel:

```bash
triggerfish config set web.search.provider brave
```

De Brave API-sleutel wordt ingevoerd tijdens `triggerfish dive` en opgeslagen in de OS-sleutelhanger.

::: tip Haal een Brave Search API-sleutel op via [brave.com/search/api](https://brave.com/search/api/). Het gratis abonnement bevat 2.000 zoekopdrachten per maand. :::

## Cron-jobs

Plan terugkerende taken voor uw agent:

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *" # Elke dag om 7 uur
      task: "Ochtendoverzicht opstellen met agenda, ongelezen e-mails en weer"
      channel: telegram # Waar de resultaten te bezorgen
      classification: INTERNAL # Maximaal taint-plafond voor deze job

    - id: pipeline-check
      schedule: "0 */4 * * *" # Elke 4 uur
      task: "Salesforce-pipeline controleren op wijzigingen"
      channel: slack
      classification: CONFIDENTIAL
```

Elke cron-job draait in zijn eigen geïsoleerde sessie met een classificatieplafond. Alle cron-acties worden via de normale beleidshooks uitgevoerd.

## Triggertiming

Configureer hoe vaak uw agent proactieve controles uitvoert:

```yaml
trigger:
  interval: 30m # Elke 30 minuten controleren
  classification: INTERNAL # Maximaal taint-plafond voor triggersessies
  quiet_hours: "22:00-07:00" # Geen triggers buiten kantooruren
```

Het triggersysteem leest uw `~/.triggerfish/TRIGGER.md`-bestand om te bepalen wat er bij elke activering moet worden gecontroleerd. Zie [SPINE en Triggers](./spine-and-triggers) voor meer informatie over het schrijven van uw TRIGGER.md.

## Webhooks

Accepteer inkomende evenementen van externe services:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "PR beoordelen en samenvatting plaatsen"
        - event: "issues.opened"
          task: "Nieuw issue triageren"

    - id: sentry-alerts
      path: /webhook/sentry
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Fout onderzoeken en indien mogelijk een fix-PR aanmaken"
```

## Volledig voorbeeld

Hier is een complete voorbeeldconfiguratie met opmerkingen:

```yaml
# ~/.triggerfish/triggerfish.yaml

# --- LLM-aanbieders ---
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

# --- Kanalen ---
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

# --- Classificatie ---
classification:
  mode: personal

# --- Beleid ---
policy:
  default_action: ALLOW

# --- Cron ---
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *"
      task: "Ochtendoverzicht opstellen"
      channel: telegram
      classification: INTERNAL

# --- Triggers ---
trigger:
  interval: 30m
  classification: INTERNAL
  quiet_hours: "22:00-07:00"
```

## Volgende stappen

- Definieer de identiteit van uw agent in [SPINE.md](./spine-and-triggers)
- Stel proactieve bewaking in met [TRIGGER.md](./spine-and-triggers)
- Leer alle CLI-opdrachten kennen in de [Opdrachtreference](./commands)
