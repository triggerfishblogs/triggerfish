# Konfigurasjon

Triggerfish konfigureres gjennom én enkelt YAML-fil i `~/.triggerfish/triggerfish.yaml`. Oppsettveiviseren (`triggerfish dive`) oppretter denne filen for deg, men du kan redigere den manuelt når som helst.

## Plassering av konfigurasjonsfil

```
~/.triggerfish/triggerfish.yaml
```

Du kan angi individuelle verdier fra kommandolinjen ved hjelp av punktseparerte stier:

```bash
triggerfish config set <nøkkel> <verdi>
triggerfish config get <nøkkel>
```

Boolske og heltallsverdier konverteres automatisk. Hemmeligheter maskeres i utdata.

Valider konfigurasjonen din med:

```bash
triggerfish config validate
```

## Modeller

`models`-seksjonen konfigurerer LLM-leverandørene og failover-atferden.

```yaml
models:
  # Hvilken leverandør og modell som brukes som standard
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  # Valgfritt: visjonsmodell for automatisk bildebeskrivelse når primærmodellen
  # mangler visjonsstøtte
  # vision: gemini-2.0-flash

  # Strømmende svar (standard: true)
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
      endpoint: "http://localhost:11434" # Ollama-standard

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234" # LM Studio-standard

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # Failover-kjede: hvis primær feiler, prøv disse i rekkefølge
  failover:
    - openai
    - google
```

API-nøkler lagres i OS-nøkkelringen, ikke i denne filen. Oppsettveiviseren (`triggerfish dive`) ber om API-nøkkelen din og lagrer den sikkert. Ollama og LM Studio er lokale og krever ingen autentisering.

## Kanaler

`channels`-seksjonen definerer hvilke meldingsplattformer agenten din kobler til og klassifiseringsnivået for hver.

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
    ownerId: "ditt-discord-bruker-id"
    classification: PUBLIC

  whatsapp:
    enabled: true
    phoneNumberId: "ditt-telefonnummer-id"
    classification: PUBLIC

  webchat:
    enabled: true
    classification: PUBLIC
    port: 18790

  email:
    enabled: true
    imapHost: "imap.gmail.com"
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapUser: "deg@gmail.com"
    fromAddress: "bot@eksempel.no"
    ownerEmail: "deg@gmail.com"
    classification: CONFIDENTIAL
```

Tokens, passord og API-nøkler for hver kanal lagres i OS-nøkkelringen. Kjør `triggerfish config add-channel <navn>` for å skrive inn legitimasjon interaktivt — de lagres i nøkkelringen, aldri i denne filen.

### Kanalkonfigurasjonsnøkler

Ikke-hemmelig konfigurasjon i `triggerfish.yaml`:

| Kanal    | Konfigurasjonsnøkler                                             | Valgfrie nøkler                                                         |
| -------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| CLI      | `enabled`                                                        | `classification`                                                        |
| Telegram | `enabled`, `ownerId`                                             | `classification`                                                        |
| Signal   | `enabled`, `endpoint`, `account`                                 | `classification`, `defaultGroupMode`, `groups`, `ownerPhone`, `pairing` |
| Slack    | `enabled`                                                        | `classification`, `ownerId`                                             |
| Discord  | `enabled`, `ownerId`                                             | `classification`                                                        |
| WhatsApp | `enabled`, `phoneNumberId`                                       | `classification`, `ownerPhone`, `webhookPort`                           |
| WebChat  | `enabled`                                                        | `classification`, `port`, `allowedOrigins`                              |
| E-post   | `enabled`, `smtpApiUrl`, `imapHost`, `imapUser`, `fromAddress`   | `classification`, `ownerEmail`, `imapPort`, `pollInterval`              |

Hemmeligheter (bot-tokens, API-nøkler, passord, signeringshemmeligheter) angis under kanaloppsett og lagres i OS-nøkkelringen.

### Standard klassifiseringsnivåer

| Kanal    | Standard       |
| -------- | -------------- |
| CLI      | `INTERNAL`     |
| Telegram | `INTERNAL`     |
| Signal   | `PUBLIC`       |
| Slack    | `PUBLIC`       |
| Discord  | `PUBLIC`       |
| WhatsApp | `PUBLIC`       |
| WebChat  | `PUBLIC`       |
| E-post   | `CONFIDENTIAL` |

Alle standardverdier er konfigurerbare. Angi enhver kanal til et hvilket som helst klassifiseringsnivå.

## MCP-servere

Koble til eksterne MCP-servere for å gi agenten din tilgang til ytterligere verktøy. Se [MCP Gateway](/nb-NO/integrations/mcp-gateway) for den fullstendige sikkerhetsmodellen.

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
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/deg/docs"]
    classification: INTERNAL
```

Hver server må ha et `classification`-nivå, ellers vil den avvises (standard avvis). Bruk `command` + `args` for lokale servere (startet som underprosesser) eller `url` for eksterne servere (HTTP SSE). Miljøverdier prefiks med `keychain:` hentes fra OS-nøkkelringen.

For hjelp med å velge klassifiseringsnivåer, se [Klassifiseringsveiledning](./classification-guide).

## Klassifisering

`classification`-seksjonen kontrollerer hvordan Triggerfish klassifiserer og beskytter data.

```yaml
classification:
  mode: personal # "personal" eller "enterprise" (kommer snart)
```

**Klassifiseringsnivåer:**

| Nivå           | Beskrivelse     | Eksempler                                              |
| -------------- | --------------- | ------------------------------------------------------ |
| `RESTRICTED`   | Mest sensitivt  | M&A-dokumenter, PII, bankkontoer, medisinske journaler |
| `CONFIDENTIAL` | Sensitivt       | CRM-data, økonomi, kontrakter, skatteoppføringer       |
| `INTERNAL`     | Kun internt     | Interne wikier, personlige notater, kontakter          |
| `PUBLIC`       | Trygt for alle  | Markedsføringsmateriell, offentlig info, nettinnhold   |

For detaljert veiledning om å velge riktig nivå for integrasjoner, kanaler og MCP-servere, se [Klassifiseringsveiledning](./classification-guide).

## Policy

`policy`-seksjonen konfigurerer tilpassede håndhevingsregler utover de innebygde beskyttelsene.

```yaml
policy:
  # Standardhandling når ingen regel samsvarer
  default_action: ALLOW

  # Tilpassede regler
  rules:
    # Blokker verktøysvar som inneholder SSN-mønstre
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[SSN REDIGERT]"
      log_level: ALERT

    # Hastighetsbegrens eksterne API-kall
    - hook: PRE_TOOL_CALL
      conditions:
        - tool_category: external_api
      rate_limit: 100/hour
      action: BLOCK
```

::: info Kjernesikkerhetsreglene — ingen write-down, session taint-eskalering, revisjonslogging — håndheves alltid og kan ikke deaktiveres. Tilpassede policyregler legger til ytterligere kontroller på toppen av disse faste beskyttelsene. :::

## Nettsøk og henting

`web`-seksjonen konfigurerer nettsøk og innholdshenting, inkludert domene-sikkerhetskontroller.

```yaml
web:
  search:
    provider: brave # Søkebakside (brave er for øyeblikket støttet)
    max_results: 10
    safe_search: moderate # off, moderate, strict
  fetch:
    rate_limit: 10 # Forespørsler per minutt
    max_content_length: 50000
    timeout: 30000
    default_mode: readability # readability eller raw
  domains:
    denylist:
      - "*.malware-site.com"
    allowlist: [] # Tom = tillat alt (minus denylist)
    classifications:
      - pattern: "*.internal.corp"
        classification: CONFIDENTIAL
```

Sett opp søk fra kommandolinjen:

```bash
triggerfish config set web.search.provider brave
```

Brave API-nøkkelen angis under `triggerfish dive` og lagres i OS-nøkkelringen.

::: tip Få en Brave Search API-nøkkel på [brave.com/search/api](https://brave.com/search/api/). Gratisplanen inkluderer 2 000 spørringer/måned. :::

## Cron-jobber

Planlegg gjentakende oppgaver for agenten din:

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *" # 7:00 daglig
      task: "Forbered morgenbriefing med kalender, uleste e-poster og vær"
      channel: telegram # Hvor resultater leveres
      classification: INTERNAL # Maks taint-tak for denne jobben

    - id: pipeline-check
      schedule: "0 */4 * * *" # Hvert 4. time
      task: "Sjekk Salesforce-pipeline for endringer"
      channel: slack
      classification: CONFIDENTIAL
```

Hver cron-jobb kjører i sin egen isolerte sesjon med et klassifiseringstak. Alle cron-handlinger går gjennom de vanlige policy-hooks.

## Trigger-timing

Konfigurer hvor ofte agenten din utfører proaktive innsjekker:

```yaml
trigger:
  interval: 30m # Sjekk hvert 30. minutt
  classification: INTERNAL # Maks taint-tak for trigger-sesjoner
  quiet_hours: "22:00-07:00" # Ikke utløs i stille timer
```

Trigger-systemet leser `~/.triggerfish/TRIGGER.md`-filen for å bestemme hva som skal sjekkes ved hver oppvåkning. Se [SPINE og Triggers](./spine-and-triggers) for detaljer om skriving av TRIGGER.md.

## Webhooks

Aksepter innkommende hendelser fra eksterne tjenester:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Gjennomgå PR og post sammendrag"
        - event: "issues.opened"
          task: "Triert nytt issue"

    - id: sentry-alerts
      path: /webhook/sentry
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Undersøk feil og opprett fiks-PR om mulig"
```

## Fullstendig eksempel

Her er et fullstendig eksempel på konfigurasjon med kommentarer:

```yaml
# ~/.triggerfish/triggerfish.yaml

# --- LLM-leverandører ---
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

# --- Kanaler ---
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

# --- Klassifisering ---
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
      task: "Forbered morgenbriefing"
      channel: telegram
      classification: INTERNAL

# --- Triggers ---
trigger:
  interval: 30m
  classification: INTERNAL
  quiet_hours: "22:00-07:00"
```

## Neste steg

- Definer agentens identitet i [SPINE.md](./spine-and-triggers)
- Sett opp proaktiv overvåking med [TRIGGER.md](./spine-and-triggers)
- Lær alle CLI-kommandoer i [Kommandreferanse](./commands)
