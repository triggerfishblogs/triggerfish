# Veelgestelde vragen

## Installatie

### Wat zijn de systeemvereisten?

Triggerfish draait op macOS (Intel en Apple Silicon), Linux (x64 en arm64) en Windows (x64). Het binaire installatieprogramma regelt alles. Als u vanuit broncode bouwt, heeft u Deno 2.x nodig.

Voor Docker-implementaties werkt elk systeem met Docker of Podman. De containerafbeelding is gebaseerd op distroless Debian 12.

### Waar slaat Triggerfish zijn gegevens op?

Alles bevindt zich standaard onder `~/.triggerfish/`:

```
~/.triggerfish/
  triggerfish.yaml          # Configuration
  SPINE.md                  # Agent identity
  TRIGGER.md                # Proactive behavior definition
  logs/                     # Log files (rotated at 1 MB, 10 backups)
  data/triggerfish.db       # SQLite database (sessions, memory, state)
  skills/                   # Installed skills
  backups/                  # Timestamped config backups
```

Docker-implementaties gebruiken `/data` in plaats daarvan. U kunt de basismap overschrijven met de omgevingsvariabele `TRIGGERFISH_DATA_DIR`.

### Kan ik de gegevensmap verplaatsen?

Ja. Stel de omgevingsvariabele `TRIGGERFISH_DATA_DIR` in op uw gewenste pad voordat u de daemon start. Als u systemd of launchd gebruikt, moet u de servicedefinitie bijwerken (zie [Platformnotities](/nl-NL/support/guides/platform-notes)).

### Het installatieprogramma zegt dat het niet naar `/usr/local/bin` kan schrijven

Het installatieprogramma probeert eerst `/usr/local/bin`. Als dit root-toegang vereist, valt het terug op `~/.local/bin`. Als u de systeembrede locatie wilt, voer het opnieuw uit met `sudo`:

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | sudo bash
```

### Hoe verwijder ik Triggerfish?

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.sh | bash
```

Dit stopt de daemon, verwijdert de servicedefinitie (systemd-unit of launchd-plist), verwijdert het binaire bestand en verwijdert de volledige map `~/.triggerfish/` inclusief alle gegevens.

---

## Configuratie

### Hoe wijzig ik de LLM-provider?

Bewerk `triggerfish.yaml` of gebruik de CLI:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
```

De daemon herstart automatisch na configuratiewijzigingen.

### Waar komen API-sleutels?

API-sleutels worden opgeslagen in uw OS-sleutelhanger (macOS Keychain, Linux Secret Service of een versleuteld bestand op Windows/Docker). Zet nooit onbewerkte API-sleutels in `triggerfish.yaml`. Gebruik de `secret:`-referentiesyntaxis:

```yaml
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

Sla de werkelijke sleutel op:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Wat betekent `secret:` in mijn configuratie?

Waarden met het prefix `secret:` zijn verwijzingen naar uw OS-sleutelhanger. Bij het opstarten lost Triggerfish elke verwijzing op en vervangt deze in het geheugen door de werkelijke geheimwaarde. Het onbewerkte geheim verschijnt nooit in `triggerfish.yaml` op schijf. Zie [Geheimen en inloggegevens](/nl-NL/support/troubleshooting/secrets) voor details per platform over backends.

### Wat is SPINE.md?

`SPINE.md` is het identiteitsbestand van uw agent. Het definieert de naam, missie, persoonlijkheid en gedragsrichtlijnen van de agent. Beschouw het als de systeempromptbasis. De installatiewizard (`triggerfish dive`) genereert er een voor u, maar u kunt het vrij bewerken.

### Wat is TRIGGER.md?

`TRIGGER.md` definieert het proactieve gedrag van uw agent: wat hij moet controleren, monitoren en uitvoeren tijdens geplande trigger-wakeups. Zonder een `TRIGGER.md` worden triggers nog steeds geactiveerd, maar heeft de agent geen instructies voor wat te doen.

### Hoe voeg ik een nieuw kanaal toe?

```bash
triggerfish config add-channel telegram
```

Dit start een interactieve prompt die u begeleidt door de vereiste velden (bot-token, eigenaar-ID, classificatieniveau). U kunt ook `triggerfish.yaml` rechtstreeks bewerken onder het gedeelte `channels:`.

### Ik heb mijn configuratie gewijzigd maar er is niets gebeurd

De daemon moet herstarten om wijzigingen op te pakken. Als u `triggerfish config set` heeft gebruikt, biedt het aan om automatisch te herstarten. Als u het YAML-bestand handmatig heeft bewerkt, herstart met:

```bash
triggerfish stop && triggerfish start
```

---

## Kanalen

### Waarom reageert mijn bot niet op berichten?

Begin met controleren:

1. **Draait de daemon?** Voer `triggerfish status` uit
2. **Is het kanaal verbonden?** Controleer de logboeken: `triggerfish logs`
3. **Is het bot-token geldig?** De meeste kanalen mislukken stilzwijgend met ongeldige tokens
4. **Is de eigenaar-ID correct?** Als u niet wordt herkend als eigenaar, kan de bot reacties beperken

Zie de [Kanalen probleemoplossing](/nl-NL/support/troubleshooting/channels)-handleiding voor kanaalspecifieke checklists.

### Wat is de eigenaar-ID en waarom is het belangrijk?

De eigenaar-ID vertelt Triggerfish welke gebruiker op een bepaald kanaal u bent (de beheerder). Niet-eigenaargebruikers krijgen beperkte tool-toegang en kunnen onderworpen zijn aan classificatielimieten. Als u de eigenaar-ID leeg laat, varieert het gedrag per kanaal. Sommige kanalen (zoals WhatsApp) behandelen iedereen als eigenaar, wat een beveiligingsrisico is.

### Kan ik meerdere kanalen tegelijk gebruiken?

Ja. Configureer zoveel kanalen als u wilt in `triggerfish.yaml`. Elk kanaal onderhoudt zijn eigen sessies en classificatieniveau. De router verwerkt berichtlevering over alle verbonden kanalen.

### Wat zijn de berichtgroottelimieten?

| Kanaal    | Limiet            | Gedrag                       |
|-----------|-------------------|------------------------------|
| Telegram  | 4.096 tekens      | Automatisch gesplitst        |
| Discord   | 2.000 tekens      | Automatisch gesplitst        |
| Slack     | 40.000 tekens     | Afgekapt (niet gesplitst)    |
| WhatsApp  | 4.096 tekens      | Afgekapt                     |
| E-mail    | Geen harde limiet | Volledig bericht verzonden   |
| WebChat   | Geen harde limiet | Volledig bericht verzonden   |

### Waarom worden Slack-berichten afgekapt?

Slack heeft een limiet van 40.000 tekens. Anders dan Telegram en Discord kapt Triggerfish Slack-berichten af in plaats van ze op te splitsen in meerdere berichten. Zeer lange reacties (zoals grote code-uitvoer) kunnen inhoud verliezen aan het einde.

---

## Beveiliging en classificatie

### Wat zijn de classificatieniveaus?

Vier niveaus, van minst naar meest gevoelig:

1. **PUBLIC** — Geen beperkingen op gegevensstroom
2. **INTERNAL** — Standaard operationele gegevens
3. **CONFIDENTIAL** — Gevoelige gegevens (inloggegevens, persoonlijke informatie, financiële gegevens)
4. **RESTRICTED** — Hoogste gevoeligheid (gereguleerde gegevens, nalevingskritiek)

Gegevens kunnen alleen stromen van lagere niveaus naar gelijke of hogere niveaus. CONFIDENTIAL-gegevens kunnen nooit een PUBLIC-kanaal bereiken. Dit is de "no write-down"-regel en kan niet worden overschreden.

### Wat betekent "sessietaint"?

Elke sessie begint bij PUBLIC. Wanneer de agent toegang heeft tot geclassificeerde gegevens (leest een CONFIDENTIAL-bestand, bevraagt een RESTRICTED-database), escaleert de sessietaint dienovereenkomstig. Taint gaat alleen omhoog, nooit omlaag. Een sessie besmet met CONFIDENTIAL kan zijn uitvoer niet sturen naar een PUBLIC-kanaal.

### Waarom krijg ik "write-down geblokkeerd"-fouten?

Uw sessie is besmet met een classificatieniveau hoger dan de bestemming. Als u bijvoorbeeld CONFIDENTIAL-gegevens hebt benaderd en vervolgens resultaten probeerde te sturen naar een PUBLIC WebChat-kanaal, blokkeert de beleidsengine dit.

Dit werkt zoals bedoeld. Om het op te lossen, kunt u:
- Een nieuwe sessie starten (nieuw gesprek)
- Een kanaal gebruiken dat is geclassificeerd op of boven het taint-niveau van uw sessie

### Kan ik classificatiehandhaving uitschakelen?

Nee. Het classificatiesysteem is een kern beveiligingsinvariant. Het draait als deterministieke code onder de LLM-laag en kan niet worden omzeild, uitgeschakeld of beïnvloed door de agent. Dit is ontworpsmatig.

---

## LLM-providers

### Welke providers worden ondersteund?

Anthropic, OpenAI, Google Gemini, Fireworks, OpenRouter, ZenMux, Z.AI en lokale modellen via Ollama of LM Studio.

### Hoe werkt failover?

Configureer een `failover`-lijst in `triggerfish.yaml`:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Als de primaire provider mislukt, probeert Triggerfish elke terugvaloptie in volgorde. Het gedeelte `failover_config` bepaalt het aantal pogingen, de vertraging en welke foutomstandigheden failover activeren.

### Mijn provider retourneert 401 / 403 fouten

Uw API-sleutel is ongeldig of verlopen. Sla hem opnieuw op:

```bash
triggerfish config set-secret provider:<name>:apiKey <uw-sleutel>
```

Herstart daarna de daemon. Zie [LLM-provider probleemoplossing](/nl-NL/support/troubleshooting/providers) voor provider-specifieke begeleiding.

### Kan ik verschillende modellen gebruiken voor verschillende classificatieniveaus?

Ja. Gebruik de `classification_models`-configuratie:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local
      model: llama-3.3-70b
    CONFIDENTIAL:
      provider: anthropic
      model: claude-sonnet-4-20250514
```

Sessies besmet met een specifiek niveau gebruiken het bijbehorende model. Niveaus zonder expliciete overschrijvingen vallen terug op het primaire model.

---

## Docker

### Hoe voer ik Triggerfish uit in Docker?

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/deploy/docker/install.sh | bash
```

Dit downloadt het Docker-wrapperscript en het compose-bestand, haalt de afbeelding op en voert de installatiewizard uit.

### Waar worden gegevens opgeslagen in Docker?

Alle persistente gegevens bevinden zich in een Docker benoemd volume (`triggerfish-data`) gemonteerd op `/data` in de container. Dit omvat configuratie, geheimen, de SQLite-database, logboeken, skills en agentwerkruimten.

### Hoe werken geheimen in Docker?

Docker-containers hebben geen toegang tot de hostbesturingssysteem-sleutelhanger. Triggerfish gebruikt in plaats daarvan een versleuteld bestandsopslag: `secrets.json` (versleutelde waarden) en `secrets.key` (AES-256-versleutelingssleutel), beide opgeslagen in het `/data`-volume. Behandel het volume als gevoelig.

### De container kan mijn configuratiebestand niet vinden

Zorg ervoor dat u het correct heeft gemount:

```bash
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
```

Als de container start zonder configuratiebestand, wordt een helpbericht afgedrukt en afgesloten.

### Hoe update ik de Docker-afbeelding?

```bash
triggerfish update    # If using the wrapper script
# or
docker compose pull && docker compose up -d
```

---

## Skills en The Reef

### Wat is een skill?

Een skill is een map met een `SKILL.md`-bestand dat de agent nieuwe mogelijkheden, context of gedragsrichtlijnen geeft. Skills kunnen tooltefinities, code, sjablonen en instructies bevatten.

### Wat is The Reef?

The Reef is de skill-marktplaats van Triggerfish. U kunt skills ontdekken, installeren en publiceren via:

```bash
triggerfish skill search "web scraping"
triggerfish skill install reef://data-extraction
```

### Waarom werd mijn skill geblokkeerd door de beveiligingsscanner?

Elke skill wordt gescand vóór installatie. De scanner controleert op verdachte patronen, overmatige machtigingen en classificatieplafondschendingen. Als het plafond van een skill lager is dan uw huidige sessietaint, wordt activering geblokkeerd om write-down te voorkomen.

### Wat is een classificatieplafond op een skill?

Skills declareren een maximaal classificatieniveau waarop ze mogen werken. Een skill met `classification_ceiling: INTERNAL` kan niet worden geactiveerd in een sessie besmet met CONFIDENTIAL of hoger. Dit voorkomt dat skills gegevens bereiken boven hun machtigingsdrempel.

---

## Triggers en planning

### Wat zijn triggers?

Triggers zijn periodieke agent-wakeups voor proactief gedrag. U definieert wat de agent moet controleren in `TRIGGER.md`, en Triggerfish wekt het op een schema. De agent bekijkt zijn instructies, neemt actie (een agenda controleren, een service monitoren, een herinnering sturen) en gaat terug naar slaap.

### Hoe verschillen triggers van cron-taken?

Cron-taken voeren een vaste taak uit op een schema. Triggers wekken de agent met zijn volledige context (geheugen, tools, kanaaltoegang) en laten hem beslissen wat te doen op basis van `TRIGGER.md`-instructies. Cron is mechanisch; triggers zijn agentisch.

### Wat zijn stille uren?

De instelling `quiet_hours` in `scheduler.trigger` voorkomt dat triggers worden geactiveerd tijdens opgegeven uren:

```yaml
scheduler:
  trigger:
    interval: "30m"
    quiet_hours: "22:00-07:00"
```

### Hoe werken webhooks?

Externe services kunnen POST sturen naar het webhook-eindpunt van Triggerfish om agentacties te activeren. Elke webhookbron vereist HMAC-ondertekening voor authenticatie en bevat detectie van replay-aanvallen.

---

## Agentteams

### Wat zijn agentteams?

Agentteams zijn permanente groepen van samenwerkende agents die samenwerken aan complexe taken. Elk teamlid is een afzonderlijke agentsessie met zijn eigen rol, gesprekscontext en tools. Één lid is aangewezen als leidende agent en coördineert het werk. Zie [Agentteams](/nl-NL/features/agent-teams) voor volledige documentatie.

### Hoe verschillen teams van sub-agents?

Sub-agents zijn vuur-en-vergeet: u delegeert een enkele taak en wacht op het resultaat. Teams zijn persistent — leden communiceren met elkaar via `sessions_send`, de leidende agent coördineert werk en het team draait autonoom totdat het wordt ontbonden of een time-out bereikt. Gebruik sub-agents voor gerichte delegatie; gebruik teams voor complexe samenwerking met meerdere rollen.

### Vereisen agentteams een betaald abonnement?

Agentteams vereisen het **Power**-abonnement ($149/maand) bij gebruik van Triggerfish Gateway. Open-source gebruikers met eigen API-sleutels hebben volledige toegang — elk teamlid verbruikt inferentie van uw geconfigureerde LLM-provider.

### Waarom mislukte mijn team-leidende agent onmiddellijk?

De meest voorkomende oorzaak is een verkeerd geconfigureerde LLM-provider. Elk teamlid spawnt zijn eigen agentsessie die een werkende LLM-verbinding nodig heeft. Controleer `triggerfish logs` op providerfouten rond het moment van teamaanmaak. Zie [Agentteams probleemoplossing](/nl-NL/support/troubleshooting/security#agentteams) voor meer details.

### Kunnen teamleden verschillende modellen gebruiken?

Ja. Elke liddefinitie accepteert een optioneel `model`-veld. Als dit wordt weggelaten, erft het lid het model van de aanmakende agent. Hiermee kunt u dure modellen toewijzen aan complexe rollen en goedkopere modellen aan eenvoudige rollen.

### Hoe lang kan een team draaien?

Standaard hebben teams een levensduur van 1 uur (`max_lifetime_seconds: 3600`). Wanneer de limiet wordt bereikt, krijgt de leidende agent een waarschuwing van 60 seconden om definitieve uitvoer te produceren, waarna het team automatisch wordt ontbonden. U kunt een langere levensduur configureren bij het aanmaken.

### Wat gebeurt er als een teamlid crasht?

De levenscyclusmonitor detecteert ledenfouten binnen 30 seconden. Mislukte leden worden gemarkeerd als `failed` en de leidende agent wordt meegedeeld om door te gaan met de resterende leden of het team te ontbinden. Als de leidende agent zelf mislukt, wordt het team gepauzeerd en wordt de aanmakende sessie meegedeeld.

---

## Overig

### Is Triggerfish open source?

Ja, Apache 2.0-gelicentieerd. De volledige broncode, inclusief alle beveiligingskritieke componenten, is beschikbaar voor audit op [GitHub](https://github.com/greghavens/triggerfish).

### Maakt Triggerfish verbinding met externe servers?

Nee. Triggerfish maakt geen uitgaande verbindingen, behalve naar de services die u expliciet configureert (LLM-providers, kanaal-API's, integraties). Er zijn geen telemetrie, analyses of updatecontroles, tenzij u `triggerfish update` uitvoert.

### Kan ik meerdere agents uitvoeren?

Ja. Het configuratiegedeelte `agents` definieert meerdere agents, elk met hun eigen naam, model, kanaalkoppelingen, toolsets en classificatieplafonds. Het routeringsysteem stuurt berichten naar de juiste agent.

### Wat is de gateway?

De gateway is het interne WebSocket-besturingsvlak van Triggerfish. Het beheert sessies, routeert berichten tussen kanalen en de agent, verzendt tools en handhaaft beleid. De CLI-chatinterface maakt verbinding met de gateway om met uw agent te communiceren.

### Welke poorten gebruikt Triggerfish?

| Poort | Doel                       | Binding              |
|-------|----------------------------|----------------------|
| 18789 | Gateway WebSocket          | Alleen localhost     |
| 18790 | Tidepool A2UI              | Alleen localhost     |
| 8765  | WebChat (indien ingeschakeld) | Configureerbaar   |
| 8443  | WhatsApp-webhook (indien ingeschakeld) | Configureerbaar |

Alle standaardpoorten binden aan localhost. Geen van hen is blootgesteld aan het netwerk, tenzij u dit expliciet configureert of een reverse proxy gebruikt.
