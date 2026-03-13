# CLI-opdrachten

Triggerfish biedt een CLI voor het beheren van uw agent, daemon, kanalen en sessies. Op deze pagina vindt u alle beschikbare opdrachten en in-chat-snelkoppelingen.

## Kernopdrachten

### `triggerfish dive`

Start de interactieve installatiewizard. Dit is de eerste opdracht die u uitvoert na de installatie en kan op elk moment opnieuw worden uitgevoerd om opnieuw te configureren.

```bash
triggerfish dive
```

De wizard doorloopt 8 stappen: LLM-aanbieder, agentnaam/-persoonlijkheid, kanaalinstelling, optionele plugins, Google Workspace-verbinding, GitHub-verbinding, zoekprovider en daemon-installatie. Zie [Snel starten](./quickstart) voor een volledig overzicht.

### `triggerfish chat`

Start een interactieve chatsessie in uw terminal. Dit is de standaardopdracht wanneer u `triggerfish` uitvoert zonder argumenten.

```bash
triggerfish chat
```

De chatinterface biedt:

- Invoerveld op volledige breedte onderaan de terminal
- Gestreamde antwoorden met realtime tokenweergave
- Compacte toolaanroepdisplay (wisselen met Ctrl+O)
- Invoerinvoergeschiedenis (bewaard over sessies)
- ESC om een lopend antwoord te onderbreken
- Gesprekscomprimering voor het beheren van lange sessies

### `triggerfish run`

Start de gatewayserver op de voorgrond. Nuttig voor ontwikkeling en foutopsporing.

```bash
triggerfish run
```

De gateway beheert WebSocket-verbindingen, kanaaladapters, de beleidsengine en sessiestatus. In productie gebruikt u `triggerfish start` om als daemon te draaien.

### `triggerfish start`

Installeer en start Triggerfish als een achtergrond-daemon met behulp van uw OS-servicebeheerder.

```bash
triggerfish start
```

| Platform | Servicebeheerder                 |
| -------- | -------------------------------- |
| macOS    | launchd                          |
| Linux    | systemd                          |
| Windows  | Windows Service / Taakplanner    |

De daemon start automatisch bij inloggen en houdt uw agent actief op de achtergrond.

### `triggerfish stop`

Stop de actieve daemon.

```bash
triggerfish stop
```

### `triggerfish status`

Controleer of de daemon momenteel actief is en geef basisstatusinformatie weer.

```bash
triggerfish status
```

Voorbeelduitvoer:

```
Triggerfish-daemon is actief
  PID: 12345
  Uptime: 3d 2h 15m
  Kanalen: 3 actief (CLI, Telegram, Slack)
  Sessies: 2 actief
```

### `triggerfish logs`

Bekijk de daemon-logboekuitvoer.

```bash
# Recente logboeken tonen
triggerfish logs

# Logboeken in realtime streamen
triggerfish logs --tail
```

### `triggerfish patrol`

Voer een gezondheidscontrole uit van uw Triggerfish-installatie.

```bash
triggerfish patrol
```

Voorbeelduitvoer:

```
Triggerfish gezondheidscontrole

  Gateway actief (PID 12345, uptime 3d 2h)
  LLM-aanbieder verbonden (Anthropic, Claude Sonnet 4.5)
  3 kanalen actief (CLI, Telegram, Slack)
  Beleidsengine geladen (12 regels, 3 aangepast)
  5 skills geïnstalleerd (2 gebundeld, 1 beheerd, 2 werkruimte)
  Geheimen veilig opgeslagen (macOS-sleutelhanger)
  2 cron-jobs gepland
  Webhook-eindpunten geconfigureerd (2 actief)

Algemeen: GEZOND
```

Patrol controleert:

- Status en uptime van het gatewayproces
- Connectiviteit van de LLM-aanbieder
- Gezondheid van kanaaladapters
- Laden van regels in de beleidsengine
- Geïnstalleerde skills
- Opslag van geheimen
- Planning van cron-jobs
- Configuratie van webhook-eindpunten
- Detectie van blootgestelde poorten

### `triggerfish config`

Beheer uw configuratiebestand. Gebruikt gestippelde paden in `triggerfish.yaml`.

```bash
# Elke configuratiewaarde instellen
triggerfish config set <sleutel> <waarde>

# Elke configuratiewaarde lezen
triggerfish config get <sleutel>

# Configuratiesyntaxis en -structuur valideren
triggerfish config validate

# Een kanaal interactief toevoegen
triggerfish config add-channel [type]
```

Voorbeelden:

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

Migreer platte inloggegevens uit `triggerfish.yaml` naar de OS-sleutelhanger.

```bash
triggerfish config migrate-secrets
```

Dit scant uw configuratie op platte API-sleutels, tokens en wachtwoorden, slaat ze op in de OS-sleutelhanger en vervangt de platte waarden door `secret:`-verwijzingen. Er wordt een back-up van het originele bestand gemaakt vóór wijzigingen.

Zie [Geheimenbeheer](/nl-NL/security/secrets) voor meer informatie.

### `triggerfish connect`

Verbind een externe service met Triggerfish.

```bash
triggerfish connect google    # Google Workspace (OAuth2-stroom)
triggerfish connect github    # GitHub (persoonlijk toegangstoken)
```

**Google Workspace** — Start de OAuth2-stroom. Vraagt om uw Google Cloud OAuth Client ID en Client Secret, opent een browser voor autorisatie en slaat tokens veilig op in de OS-sleutelhanger. Zie [Google Workspace](/nl-NL/integrations/google-workspace) voor volledige installatie-instructies, inclusief het aanmaken van inloggegevens.

**GitHub** — Begeleidt u bij het aanmaken van een fijnmazig persoonlijk toegangstoken, valideert het bij de GitHub API en slaat het op in de OS-sleutelhanger. Zie [GitHub](/nl-NL/integrations/github) voor meer informatie.

### `triggerfish disconnect`

Verwijder authenticatie voor een externe service.

```bash
triggerfish disconnect google    # Google-tokens verwijderen
triggerfish disconnect github    # GitHub-token verwijderen
```

Verwijdert alle opgeslagen tokens uit de sleutelhanger. U kunt op elk moment opnieuw verbinden.

### `triggerfish healthcheck`

Voer een snelle connectiviteitscontrole uit op de geconfigureerde LLM-aanbieder. Geeft succes terug als de aanbieder reageert, of een fout met details.

```bash
triggerfish healthcheck
```

### `triggerfish release-notes`

Toon releasenotes voor de huidige of een opgegeven versie.

```bash
triggerfish release-notes
triggerfish release-notes v0.5.0
```

### `triggerfish update`

Controleer op beschikbare updates en installeer ze.

```bash
triggerfish update
```

### `triggerfish version`

Toon de huidige Triggerfish-versie.

```bash
triggerfish version
```

## Skill-opdrachten

Beheer skills van de Reef-marktplaats en uw lokale werkruimte.

```bash
triggerfish skill search "agenda"       # Zoek naar skills op The Reef
triggerfish skill install google-cal    # Een skill installeren
triggerfish skill list                  # Geïnstalleerde skills weergeven
triggerfish skill update --all          # Alle geïnstalleerde skills updaten
triggerfish skill publish               # Een skill publiceren op The Reef
triggerfish skill create                # Een nieuwe skill aanmaken
```

## Plugin-opdrachten

Beheer plugins van de Reef-marktplaats en uw lokale bestandssysteem. Plugins kunnen ook door de agent worden beheerd tijdens runtime met de ingebouwde tools `plugin_install`, `plugin_reload`, `plugin_scan` en `plugin_list`.

```bash
triggerfish plugin search "weer"        # Zoek naar plugins op The Reef
triggerfish plugin install weather      # Een plugin installeren van The Reef
triggerfish plugin update               # Geïnstalleerde plugins op updates controleren
triggerfish plugin publish ./my-plugin  # Een plugin voorbereiden voor Reef-publicatie
triggerfish plugin scan ./my-plugin     # Beveiligingsscanner uitvoeren op een plugin
triggerfish plugin list                 # Lokaal geïnstalleerde plugins weergeven
```

## Sessieopdrachten

Inspecteren en beheren van actieve sessies.

```bash
triggerfish session list                # Actieve sessies weergeven
triggerfish session history             # Sessietranscript bekijken
triggerfish session spawn               # Een achtergrondssessie aanmaken
```

## Buoy-opdrachten <ComingSoon :inline="true" />

Beheer verbindingen met companionapparaten. Buoy is nog niet beschikbaar.

```bash
triggerfish buoys list                  # Verbonden buoys weergeven
triggerfish buoys pair                  # Een nieuw buoy-apparaat koppelen
```

## In-chat-opdrachten

Deze opdrachten zijn beschikbaar tijdens een interactieve chatsessie (via `triggerfish chat` of een verbonden kanaal). Ze zijn alleen voor de eigenaar.

| Opdracht                | Beschrijving                                                             |
| ----------------------- | ------------------------------------------------------------------------ |
| `/help`                 | Beschikbare in-chat-opdrachten tonen                                     |
| `/status`               | Sessiestatus tonen: model, tokenaantal, kosten, taint-niveau             |
| `/reset`                | Sessie-taint en gespreksgeschiedenis resetten                            |
| `/compact`              | Gespreksgeschiedenis comprimeren met LLM-samenvatting                    |
| `/model <naam>`         | Het LLM-model voor de huidige sessie wisselen                            |
| `/skill install <naam>` | Een skill installeren van The Reef                                       |
| `/cron list`            | Geplande cron-jobs weergeven                                             |

## Sneltoetsen

Deze sneltoetsen werken in de CLI-chatinterface:

| Sneltoets | Actie                                                                        |
| --------- | ---------------------------------------------------------------------------- |
| ESC       | Het huidige LLM-antwoord onderbreken                                         |
| Ctrl+V    | Afbeelding uit klembord plakken (zie [Afbeelding en visie](/nl-NL/features/image-vision)) |
| Ctrl+O    | Compacte/uitgebreide toolaanroepdisplay wisselen                             |
| Ctrl+C    | De chatsessie afsluiten                                                      |
| Omhoog/Omlaag | Door de invoergeschiedenis navigeren                                    |

::: tip De ESC-onderbreking verzendt een afbrekingssignaal door de hele keten — van de orkestrator tot aan de LLM-aanbieder. Het antwoord stopt netjes en u kunt het gesprek voortzetten. :::

## Foutopsporingsuitvoer

Triggerfish bevat gedetailleerde foutopsporingslogboeken voor het diagnosticeren van problemen met LLM-aanbieders, het parseren van toolaanroepen en het gedrag van de agentlus. Schakel dit in door de omgevingsvariabele `TRIGGERFISH_DEBUG` op `1` in te stellen.

::: tip De voorkeursmethode om logboekdetailniveau te beheren is via `triggerfish.yaml`:

```yaml
logging:
  level: verbose # quiet, normal, verbose of debug
```

De omgevingsvariabele `TRIGGERFISH_DEBUG=1` wordt nog steeds ondersteund voor achterwaartse compatibiliteit. Zie [Gestructureerde logboekregistratie](/nl-NL/features/logging) voor volledige details. :::

### Voorgrondmodus

```bash
TRIGGERFISH_DEBUG=1 triggerfish run
```

Of voor een chatsessie:

```bash
TRIGGERFISH_DEBUG=1 triggerfish chat
```

### Daemonmodus (systemd)

Voeg de omgevingsvariabele toe aan uw systemd-service-unit:

```bash
systemctl --user edit triggerfish.service
```

Voeg toe onder `[Service]`:

```ini
[Service]
Environment=TRIGGERFISH_DEBUG=1
```

Start vervolgens opnieuw op:

```bash
systemctl --user daemon-reload
triggerfish stop && triggerfish start
```

Bekijk foutopsporingsuitvoer met:

```bash
journalctl --user -u triggerfish.service -f
```

### Wat er wordt vastgelegd

Wanneer de foutopsporingsmodus is ingeschakeld, wordt het volgende naar stderr geschreven:

| Component       | Logboekprefix  | Details                                                                                                                      |
| --------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Orkestrator     | `[orch]`       | Elke iteratie: lengte van systeemprompt, aantal geschiedenisitems, berichtrol/-groottes, geparseerd toolaanroepaantal, definitieve antwoordtekst |
| OpenRouter      | `[openrouter]` | Volledig verzoekpayload (model, berichtaantal, toolaantal), ruwe antwoordtekst, inhoudslengte, beëindigingsreden, tokengebruik |
| Overige aanbieders | `[provider]` | Verzoek-/antwoordsamenvattingen (verschilt per aanbieder)                                                                  |

Voorbeeld foutopsporingsuitvoer:

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

::: warning Foutopsporingsuitvoer bevat volledige LLM-verzoek- en antwoordpayloads. Laat dit niet ingeschakeld in productie, omdat het gevoelige gespreksinhoud kan vastleggen in stderr/journal. :::

## Snelle reference

```bash
# Installatie en beheer
triggerfish dive              # Installatiewizard
triggerfish start             # Daemon starten
triggerfish stop              # Daemon stoppen
triggerfish status            # Status controleren
triggerfish logs --tail       # Logboeken streamen
triggerfish patrol            # Gezondheidscontrole
triggerfish config set <k> <v> # Configuratiewaarde instellen
triggerfish config get <sleutel> # Configuratiewaarde lezen
triggerfish config add-channel # Een kanaal toevoegen
triggerfish config migrate-secrets  # Geheimen migreren naar sleutelhanger
triggerfish update            # Controleren op updates
triggerfish version           # Versie tonen

# Dagelijks gebruik
triggerfish chat              # Interactieve chat
triggerfish run               # Voorgrondmodus

# Skills
triggerfish skill search      # Zoeken op The Reef
triggerfish skill install     # Skill installeren
triggerfish skill list        # Geïnstalleerde weergeven
triggerfish skill create      # Nieuwe skill aanmaken

# Plugins
triggerfish plugin search     # Zoeken op The Reef
triggerfish plugin install    # Plugin installeren
triggerfish plugin update     # Controleren op updates
triggerfish plugin scan       # Beveiligingsscan
triggerfish plugin list       # Geïnstalleerde weergeven

# Sessies
triggerfish session list      # Sessies weergeven
triggerfish session history   # Transcript bekijken
```
