# CLI-kommandoer

Triggerfish tilbyr en CLI for å administrere agenten, daemonen, kanalene og sesjonene dine. Denne siden dekker alle tilgjengelige kommandoer og snarveier i chatten.

## Kjernekommandoer

### `triggerfish dive`

Kjør den interaktive oppsettveiviseren. Dette er den første kommandoen du kjører etter installasjon, og den kan kjøres på nytt når som helst for å rekonfigurere.

```bash
triggerfish dive
```

Veiviseren går gjennom 8 trinn: LLM-leverandør, agentnavn/personlighet, kanaloppsett, valgfrie plugins, Google Workspace-tilkobling, GitHub-tilkobling, søkeleverandør og daemoninstallasjon. Se [Hurtigstart](./quickstart) for en fullstendig gjennomgang.

### `triggerfish chat`

Start en interaktiv chat-sesjon i terminalen. Dette er standardkommandoen når du kjører `triggerfish` uten argumenter.

```bash
triggerfish chat
```

Chat-grensesnittet har:

- Full-bredde inndatafelt nederst i terminalen
- Strømmende svar med sanntids token-visning
- Kompakt verktøykall-visning (veksle med Ctrl+O)
- Inngangshistorikk (vedvart på tvers av sesjoner)
- ESC for å avbryte et kjørende svar
- Samtalekomrimering for å håndtere lange sesjoner

### `triggerfish run`

Start gateway-serveren i forgrunnen. Nyttig for utvikling og feilsøking.

```bash
triggerfish run
```

Gatewayen administrerer WebSocket-tilkoblinger, kanaladaptere, policy-motoren og sesjonstilstand. I produksjon, bruk `triggerfish start` for å kjøre som daemon i stedet.

### `triggerfish start`

Installer og start Triggerfish som en bakgrunnsdaemon ved hjelp av OS-tjenesteadministratoren.

```bash
triggerfish start
```

| Plattform | Tjenesteadministrator            |
| --------- | -------------------------------- |
| macOS     | launchd                          |
| Linux     | systemd                          |
| Windows   | Windows Service / Task Scheduler |

Daemonen starter automatisk ved pålogging og holder agenten kjørende i bakgrunnen.

### `triggerfish stop`

Stopp den kjørende daemonen.

```bash
triggerfish stop
```

### `triggerfish status`

Sjekk om daemonen kjører og vis grunnleggende statusinformasjon.

```bash
triggerfish status
```

Eksempelutdata:

```
Triggerfish-daemon kjører
  PID: 12345
  Oppetid: 3d 2t 15m
  Kanaler: 3 aktive (CLI, Telegram, Slack)
  Sesjoner: 2 aktive
```

### `triggerfish logs`

Vis daemon-loggutdata.

```bash
# Vis nylige logger
triggerfish logs

# Strøm logger i sanntid
triggerfish logs --tail
```

### `triggerfish patrol`

Kjør en helsesjekk av Triggerfish-installasjonen.

```bash
triggerfish patrol
```

Eksempelutdata:

```
Triggerfish helsesjekk

  Gateway kjører (PID 12345, oppetid 3d 2t)
  LLM-leverandør tilkoblet (Anthropic, Claude Sonnet 4.5)
  3 kanaler aktive (CLI, Telegram, Slack)
  Policy-motor lastet (12 regler, 3 egendefinerte)
  5 skills installert (2 medfølgende, 1 administrert, 2 arbeidsområde)
  Hemmeligheter lagret sikkert (macOS Keychain)
  2 cron-jobber planlagt
  Webhook-endepunkter konfigurert (2 aktive)

Totalt: FRISK
```

Patrol sjekker:

- Gateway-prosesstatus og oppetid
- LLM-leverandørtilkobling
- Kanaladapterhelse
- Policy-motorens regelinnlasting
- Installerte skills
- Hemmelighetslager
- Cron-jobbplanlegging
- Webhook-endepunktkonfigurasjon
- Eksponert portdeteksjon

### `triggerfish config`

Administrer konfigurasjonsfilen. Bruker punktseparerte stier inn i `triggerfish.yaml`.

```bash
# Angi en konfigurasjonsverdi
triggerfish config set <nøkkel> <verdi>

# Les en konfigurasjonsverdi
triggerfish config get <nøkkel>

# Valider konfigurasjonssyntaks og -struktur
triggerfish config validate

# Legg til en kanal interaktivt
triggerfish config add-channel [type]
```

Eksempler:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-5
triggerfish config set web.search.provider brave
triggerfish config set web.search.api_key sk-abc123
triggerfish config set scheduler.trigger.enabled true
triggerfish config get models.primary.model
triggerfish config add-channel telegram
```

#### `triggerfish config migrate-secrets`

Migrer klartekst-legitimasjon fra `triggerfish.yaml` til OS-nøkkelringen.

```bash
triggerfish config migrate-secrets
```

Dette skanner konfigurasjonen din etter klartekst API-nøkler, tokens og passord, lagrer dem i OS-nøkkelringen og erstatter klartekstverdiene med `secret:`-referanser. En sikkerhetskopi av originalfilen opprettes før endringer gjøres.

Se [Hemmelighetshåndtering](/nb-NO/security/secrets) for detaljer.

### `triggerfish connect`

Koble en ekstern tjeneste til Triggerfish.

```bash
triggerfish connect google    # Google Workspace (OAuth2-flyt)
triggerfish connect github    # GitHub (personlig tilgangstoken)
```

**Google Workspace** — Starter OAuth2-flyten. Ber om Google Cloud OAuth-klient-ID og klienthemmelighet, åpner en nettleser for autorisasjon og lagrer tokens sikkert i OS-nøkkelringen. Se [Google Workspace](/nb-NO/integrations/google-workspace) for fullstendige oppsettsinstiuksjoner.

**GitHub** — Leder deg gjennom oppretting av et finkornig personlig tilgangstoken, validerer det mot GitHub API og lagrer det i OS-nøkkelringen. Se [GitHub](/nb-NO/integrations/github) for detaljer.

### `triggerfish disconnect`

Fjern autentisering for en ekstern tjeneste.

```bash
triggerfish disconnect google    # Fjern Google-tokens
triggerfish disconnect github    # Fjern GitHub-token
```

Fjerner alle lagrede tokens fra nøkkelringen. Du kan koble til igjen når som helst.

### `triggerfish healthcheck`

Kjør en rask tilkoblingssjekk mot den konfigurerte LLM-leverandøren. Returnerer suksess hvis leverandøren svarer, eller en feil med detaljer.

```bash
triggerfish healthcheck
```

### `triggerfish release-notes`

Vis utgivelsesnotater for gjeldende eller en spesifisert versjon.

```bash
triggerfish release-notes
triggerfish release-notes v0.5.0
```

### `triggerfish update`

Sjekk for tilgjengelige oppdateringer og installer dem.

```bash
triggerfish update
```

### `triggerfish version`

Vis gjeldende Triggerfish-versjon.

```bash
triggerfish version
```

## Skill-kommandoer

Administrer skills fra The Reef-markedsplassen og ditt lokale arbeidsområde.

```bash
triggerfish skill search "kalender"     # Søk etter skills på The Reef
triggerfish skill install google-cal    # Installer en skill
triggerfish skill list                  # List opp installerte skills
triggerfish skill update --all          # Oppdater alle installerte skills
triggerfish skill publish               # Publiser en skill til The Reef
triggerfish skill create                # Lag en ny skill
```

## Plugin-kommandoer

Administrer plugins fra The Reef-markedsplassen og ditt lokale filsystem. Plugins kan også administreres av agenten under kjøring ved hjelp av de innebygde `plugin_install`-, `plugin_reload`-, `plugin_scan`- og `plugin_list`-verktøyene.

```bash
triggerfish plugin search "vær"         # Søk etter plugins på The Reef
triggerfish plugin install weather      # Installer en plugin fra The Reef
triggerfish plugin update               # Sjekk installerte plugins for oppdateringer
triggerfish plugin publish ./min-plugin # Forbered en plugin for Reef-publisering
triggerfish plugin scan ./min-plugin    # Kjør sikkerhetsskanner på en plugin
triggerfish plugin list                 # List opp lokalt installerte plugins
```

## Sesjonskommandoer

Inspiser og administrer aktive sesjoner.

```bash
triggerfish session list                # List opp aktive sesjoner
triggerfish session history             # Vis sesjonsutskrift
triggerfish session spawn               # Opprett en bakgrunnssesjon
```

## Buoy-kommandoer <ComingSoon :inline="true" />

Administrer følgeenhetstilkoblinger. Buoy er ennå ikke tilgjengelig.

```bash
triggerfish buoys list                  # List opp tilkoblede buoys
triggerfish buoys pair                  # Par en ny buoy-enhet
```

## Kommandoer i chatten

Disse kommandoene er tilgjengelige under en interaktiv chat-sesjon (via `triggerfish chat` eller en tilkoblet kanal). De er kun for eieren.

| Kommando                | Beskrivelse                                                   |
| ----------------------- | ------------------------------------------------------------- |
| `/help`                 | Vis tilgjengelige kommandoer i chatten                        |
| `/status`               | Vis sesjonsstatus: modell, token-antall, kostnad, taint-nivå  |
| `/reset`                | Tilbakestill sesjons-taint og samtalehistorikk                |
| `/compact`              | Kompinner samtalehistorikk ved hjelp av LLM-oppsummering      |
| `/model <navn>`         | Bytt LLM-modell for gjeldende sesjon                          |
| `/skill install <navn>` | Installer en skill fra The Reef                               |
| `/cron list`            | List opp planlagte cron-jobber                                |

## Tastatursnarveier

Disse snarveiene fungerer i CLI chat-grensesnittet:

| Snarvei  | Handling                                                                           |
| -------- | ---------------------------------------------------------------------------------- |
| ESC      | Avbryt gjeldende LLM-svar                                                          |
| Ctrl+V   | Lim inn bilde fra utklippstavlen (se [Bilde og visjon](/nb-NO/features/image-vision)) |
| Ctrl+O   | Veksle kompakt/utvidet verktøykall-visning                                         |
| Ctrl+C   | Avslutt chat-sesjonen                                                              |
| Opp/Ned  | Naviger inngangshistorikk                                                          |

::: tip ESC-avbryting sender et avbruddssignal gjennom hele kjeden — fra orkestratoren til LLM-leverandøren. Svaret stopper rent og du kan fortsette samtalen. :::

## Feilsøkingsutdata

Triggerfish inkluderer detaljert feilsøkingslogging for å diagnostisere LLM-leverandørproblemer, verktøykall-parsing og agent-sløyfeatferd. Aktiver det ved å sette `TRIGGERFISH_DEBUG`-miljøvariabelen til `1`.

::: tip Den foretrukne måten å kontrollere logg-utfylighet på er gjennom `triggerfish.yaml`:

```yaml
logging:
  level: verbose # quiet, normal, verbose, eller debug
```

`TRIGGERFISH_DEBUG=1`-miljøvariabelen støttes fortsatt for bakoverkompatibilitet. Se [Strukturert logging](/nb-NO/features/logging) for fullstendige detaljer. :::

### Forgrunnsmodus

```bash
TRIGGERFISH_DEBUG=1 triggerfish run
```

Eller for en chat-sesjon:

```bash
TRIGGERFISH_DEBUG=1 triggerfish chat
```

### Daemonmodus (systemd)

Legg til miljøvariabelen i systemd-tjenesteenheten din:

```bash
systemctl --user edit triggerfish.service
```

Legg til under `[Service]`:

```ini
[Service]
Environment=TRIGGERFISH_DEBUG=1
```

Start deretter på nytt:

```bash
systemctl --user daemon-reload
triggerfish stop && triggerfish start
```

Vis feilsøkingsutdata med:

```bash
journalctl --user -u triggerfish.service -f
```

### Hva som logges

Når feilsøkingsmodus er aktivert, skrives følgende til stderr:

| Komponent      | Logg-prefiks   | Detaljer                                                                                                                    |
| -------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Orkestrator    | `[orch]`       | Hver iterasjon: systemprompt-lengde, historieoppføringer, meldings-roller/-størrelser, parsede verktøykall, sluttsvar       |
| OpenRouter     | `[openrouter]` | Full forespørselnyttelast (modell, meldingsantall, verktøyantall), rå svartekst, innholdslengde, avslutningsårsak, token-bruk |
| Andre lev.     | `[provider]`   | Forespørsels-/svarsammendrag (varierer per leverandør)                                                                      |

Eksempel feilsøkingsutdata:

```
[orch] iter1 sysPrompt=4521chars history=3 entries
[orch]   [0] system 4521chars
[orch]   [1] user 42chars
[orch]   [2] assistant 0chars
[orch] iter1 raw: <tool_call>{"name":"web_search","arguments":{"query":"best fish tacos austin"}}...
[orch] iter1 parsedCalls: 1
[openrouter] request: model=openrouter/aurora-alpha messages=5 tools=12
[openrouter] response: content=1284chars finish=stop tokens=342
```

::: warning Feilsøkingsutdata inkluderer fullstendige LLM-forespørsels- og svar-nyttelaster. Ikke la det være aktivert i produksjon da det kan logge sensitivt samtaleinnhold til stderr/journal. :::

## Hurtigreferanse

```bash
# Oppsett og administrasjon
triggerfish dive              # Oppsettveiviser
triggerfish start             # Start daemon
triggerfish stop              # Stopp daemon
triggerfish status            # Sjekk status
triggerfish logs --tail       # Strøm logger
triggerfish patrol            # Helsesjekk
triggerfish config set <k> <v> # Angi konfigurasjonsverdi
triggerfish config get <nøkkel>  # Les konfigurasjonsverdi
triggerfish config add-channel # Legg til en kanal
triggerfish config migrate-secrets  # Migrer hemmeligheter til nøkkelring
triggerfish update            # Sjekk for oppdateringer
triggerfish version           # Vis versjon

# Daglig bruk
triggerfish chat              # Interaktiv chat
triggerfish run               # Forgrunnsmodus

# Skills
triggerfish skill search      # Søk på The Reef
triggerfish skill install     # Installer skill
triggerfish skill list        # List opp installerte
triggerfish skill create      # Opprett ny skill

# Plugins
triggerfish plugin search     # Søk på The Reef
triggerfish plugin install    # Installer plugin
triggerfish plugin update     # Sjekk for oppdateringer
triggerfish plugin scan       # Sikkerhetsskanning
triggerfish plugin list       # List opp installerte

# Sesjoner
triggerfish session list      # List opp sesjoner
triggerfish session history   # Vis utskrift
```
