# Konfiguration

Triggerfish konfigureras via en enda YAML-fil på `~/.triggerfish/triggerfish.yaml`. Installationsguiden (`triggerfish dive`) skapar den här filen åt dig, men du kan redigera den manuellt när som helst.

## Konfigurationsfilens plats

```
~/.triggerfish/triggerfish.yaml
```

Du kan ange enskilda värden från kommandoraden med punktnotation:

```bash
triggerfish config set <nyckel> <värde>
triggerfish config get <nyckel>
```

Booleanska värden och heltalsvärden konverteras automatiskt. Hemligheter maskeras i utdata.

Validera din konfiguration med:

```bash
triggerfish config validate
```

## Modeller

Avsnittet `models` konfigurerar dina LLM-leverantörer och failover-beteende.

```yaml
models:
  # Vilken leverantör och modell som ska användas som standard
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  # Valfritt: synmodell för automatisk bildbeskrivning när primär
  # modell saknar synstöd
  # vision: gemini-2.0-flash

  # Strömningssvar (standard: true)
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

  # Failover-kedja: om primär misslyckas, prova dessa i ordning
  failover:
    - openai
    - google
```

API-nycklar lagras i OS-nyckelringen, inte i den här filen. Installationsguiden (`triggerfish dive`) frågar efter din API-nyckel och lagrar den säkert. Ollama och LM Studio är lokala och kräver ingen autentisering.

## Kanaler

Avsnittet `channels` definierar vilka meddelandeplattformar din agent ansluter till och klassificeringsnivån för var och en.

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
    ownerId: "ditt-discord-användar-id"
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
    imapUser: "du@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "du@gmail.com"
    classification: CONFIDENTIAL
```

Tokens, lösenord och API-nycklar för varje kanal lagras i OS-nyckelringen. Kör `triggerfish config add-channel <namn>` för att ange uppgifter interaktivt — de sparas i nyckelringen, aldrig i den här filen.

### Kanalkonfigurationsnycklar

Icke-hemlig konfiguration i `triggerfish.yaml`:

| Kanal    | Konfigurationsnycklar                                          | Valfria nycklar                                                         |
| -------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| CLI      | `enabled`                                                      | `classification`                                                        |
| Telegram | `enabled`, `ownerId`                                           | `classification`                                                        |
| Signal   | `enabled`, `endpoint`, `account`                               | `classification`, `defaultGroupMode`, `groups`, `ownerPhone`, `pairing` |
| Slack    | `enabled`                                                      | `classification`, `ownerId`                                             |
| Discord  | `enabled`, `ownerId`                                           | `classification`                                                        |
| WhatsApp | `enabled`, `phoneNumberId`                                     | `classification`, `ownerPhone`, `webhookPort`                           |
| WebChat  | `enabled`                                                      | `classification`, `port`, `allowedOrigins`                              |
| E-post   | `enabled`, `smtpApiUrl`, `imapHost`, `imapUser`, `fromAddress` | `classification`, `ownerEmail`, `imapPort`, `pollInterval`              |

Hemligheter (bot-tokens, API-nycklar, lösenord, signeringshemligheter) anges under kanalinställning och lagras i OS-nyckelringen.

### Standardklassificeringsnivåer

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

Alla standardvärden är konfigurerbara. Ange vilken kanal som helst till vilken klassificeringsnivå som helst.

## MCP-servrar

Anslut externa MCP-servrar för att ge din agent tillgång till ytterligare verktyg. Se [MCP Gateway](/sv-SE/integrations/mcp-gateway) för den fullständiga säkerhetsmodellen.

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
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/du/docs"]
    classification: INTERNAL
```

Varje server måste ha en `classification`-nivå annars avvisas den (neka som standard). Använd `command` + `args` för lokala servrar (startas som underprocesser) eller `url` för fjärrservrar (HTTP SSE). Miljövärden med prefixet `keychain:` hämtas från OS-nyckelringen.

För hjälp att välja klassificeringsnivåer, se [Klassificeringsguiden](./classification-guide).

## Klassificering

Avsnittet `classification` styr hur Triggerfish klassificerar och skyddar data.

```yaml
classification:
  mode: personal # "personal" eller "enterprise" (kommer snart)
```

**Klassificeringsnivåer:**

| Nivå           | Beskrivning       | Exempel                                                       |
| -------------- | ----------------- | ------------------------------------------------------------- |
| `RESTRICTED`   | Mest känslig      | Fusionsdokument, personuppgifter, bankkonton, journaler       |
| `CONFIDENTIAL` | Känslig           | CRM-data, ekonomi, kontrakt, skatteuppgifter                  |
| `INTERNAL`     | Endast internt    | Interna wikis, personliga anteckningar, kontakter             |
| `PUBLIC`       | Säker för alla    | Marknadsföringsmaterial, offentlig info, allmänt webbinnehåll |

För detaljerad vägledning om att välja rätt nivå för dina integrationer, kanaler och MCP-servrar, se [Klassificeringsguiden](./classification-guide).

## Policy

Avsnittet `policy` konfigurerar anpassade hanteringsregler utöver de inbyggda skydden.

```yaml
policy:
  # Standardåtgärd när ingen regel matchar
  default_action: ALLOW

  # Anpassade regler
  rules:
    # Blockera verktygsvar som innehåller personnummermönster
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[PERSONNUMMER BORTTAGET]"
      log_level: ALERT

    # Begränsa externa API-anrop
    - hook: PRE_TOOL_CALL
      conditions:
        - tool_category: external_api
      rate_limit: 100/hour
      action: BLOCK
```

::: info De grundläggande säkerhetsreglerna — inget nedskrivningsförbud, session-taint-eskalering, revisionsloggning — tillämpas alltid och kan inte inaktiveras. Anpassade policyregler lägger till ytterligare kontroller ovanpå dessa fasta skydd. :::

## Webbsökning och hämtning

Avsnittet `web` konfigurerar webbsökning och innehållshämtning, inklusive domänsäkerhetskontroller.

```yaml
web:
  search:
    provider: brave # Sökmotor (brave stöds för närvarande)
    max_results: 10
    safe_search: moderate # av, moderat, strikt
  fetch:
    rate_limit: 10 # Förfrågningar per minut
    max_content_length: 50000
    timeout: 30000
    default_mode: readability # readability eller raw
  domains:
    denylist:
      - "*.malware-site.com"
    allowlist: [] # Tom = tillåt alla (minus denylist)
    classifications:
      - pattern: "*.internal.corp"
        classification: CONFIDENTIAL
```

Ställ in sökning från kommandoraden:

```bash
triggerfish config set web.search.provider brave
```

Brave API-nyckeln anges under `triggerfish dive` och lagras i OS-nyckelringen.

::: tip Hämta en Brave Search API-nyckel på [brave.com/search/api](https://brave.com/search/api/). Den kostnadsfria nivån inkluderar 2 000 sökningar/månad. :::

## Cron-jobb

Schemalägg återkommande uppgifter för din agent:

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *" # Kl 7 varje dag
      task: "Förbered morgonbriefing med kalender, olästa e-post och väder"
      channel: telegram # Var leveransresultaten ska skickas
      classification: INTERNAL # Max taint-tak för det här jobbet

    - id: pipeline-check
      schedule: "0 */4 * * *" # Var 4:e timme
      task: "Kontrollera Salesforce-pipelinen för ändringar"
      channel: slack
      classification: CONFIDENTIAL
```

Varje cron-jobb körs i sin egen isolerade session med ett klassificeringstak. Alla cron-åtgärder passerar de normala policy-hooksen.

## Triggertiming

Konfigurera hur ofta din agent utför proaktiva incheckningar:

```yaml
trigger:
  interval: 30m # Kontrollera var 30:e minut
  classification: INTERNAL # Max taint-tak för triggersessioner
  quiet_hours: "22:00-07:00" # Utlös inte under tysta timmar
```

Triggersystemet läser din `~/.triggerfish/TRIGGER.md`-fil för att avgöra vad som ska kontrolleras vid varje uppvaknande. Se [SPINE och Triggers](./spine-and-triggers) för detaljer om att skriva din TRIGGER.md.

## Webhooks

Ta emot inkommande händelser från externa tjänster:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Granska PR och posta sammanfattning"
        - event: "issues.opened"
          task: "Prioritera nytt ärende"

    - id: sentry-alerts
      path: /webhook/sentry
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Undersök fel och skapa fix-PR om möjligt"
```

## Fullständigt exempel

Här är ett komplett konfigurationsexempel med kommentarer:

```yaml
# ~/.triggerfish/triggerfish.yaml

# --- LLM-leverantörer ---
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

# --- Klassificering ---
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
      task: "Förbered morgonbriefing"
      channel: telegram
      classification: INTERNAL

# --- Triggers ---
trigger:
  interval: 30m
  classification: INTERNAL
  quiet_hours: "22:00-07:00"
```

## Nästa steg

- Definiera din agents identitet i [SPINE.md](./spine-and-triggers)
- Ställ in proaktiv övervakning med [TRIGGER.md](./spine-and-triggers)
- Lär dig alla CLI-kommandon i [Kommandoreferensen](./commands)
