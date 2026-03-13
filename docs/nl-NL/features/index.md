# Functieoverzicht

Naast het [beveiligingsmodel](/nl-NL/security/) en [kanaalondersteuning](/nl-NL/channels/) biedt Triggerfish mogelijkheden die uw AI-agent uitbreiden voorbij vraag-en-antwoord: geplande taken, persistent geheugen, webtoegang, spraakinvoer en multi-model failover.

## Proactief gedrag

### [Cron en triggers](./cron-and-triggers)

Plan terugkerende taken met standaard cron-expressies en definieer proactief monitoringgedrag via `TRIGGER.md`. Uw agent kan ochtendoverzichten leveren, pijplijnen controleren, ongelezen berichten bewaken en autonoom handelen op een configureerbaar schema — allemaal met classificatiehandhaving en geïsoleerde sessies.

### [Meldingen](./notifications)

Een meldingsbezorgingsservice die berichten stuurt via alle verbonden kanalen met prioriteitsniveaus, offline wachtrijen en deduplicatie. Vervangt ad-hoc meldingspatronen door een uniforme abstractie.

## Agenttools

### [Webzoeken en -ophalen](./web-search)

Zoek het web en haal paginainhoud op. De agent gebruikt `web_search` om informatie te vinden en `web_fetch` om webpagina's te lezen, met SSRF-preventie en beleidshandhaving op alle uitgaande verzoeken.

### [Persistent geheugen](./memory)

Geheugen over sessies heen met classificatiepoort. De agent slaat feiten, voorkeuren en context op over gesprekken heen. Geheugenclassificatie is geforceerd naar sessie-taint — het LLM kan het niveau niet kiezen.

### [Beeldanalyse en visie](./image-vision)

Plak afbeeldingen van uw klembord (Ctrl+V in CLI, browserplak in Tidepool) en analyseer afbeeldingsbestanden op schijf. Configureer een apart visiemodel om afbeeldingen automatisch te beschrijven wanneer het primaire model geen visie ondersteunt.

### [Codebase-verkenning](./explore)

Gestructureerd begrip van codebases via parallelle sub-agents. De `explore`-tool brengt mappenstructuren in kaart, detecteert codeerpatronen, traceert imports en analyseert git-geschiedenis — allemaal gelijktijdig.

### [Sessiebeheer](./sessions)

Inspecteer, communiceer met en spawn sessies. De agent kan achtergrondtaken delegeren, berichten over sessies sturen en via kanalen communiceren — allemaal onder write-down-handhaving.

### [Planmodus en taaktracering](./planning)

Gestructureerde planning vóór implementatie (planmodus) en persistente taaktracering (todos) over sessies heen. Planmodus beperkt de agent tot alleen-lezen verkenning totdat de gebruiker het plan goedkeurt.

### [Bestandssysteem en shell](./filesystem)

Lees, schrijf, zoek en voer opdrachten uit. De fundamentele tools voor bestandsbewerkingen, met werkruimtebegrenzing en opdrachtenlijsthandhaving.

### [Sub-agents en LLM-taken](./subagents)

Delegeer werk aan autonome sub-agents of voer geïsoleerde LLM-prompts uit voor samenvatting, classificatie en gerichte redenering zonder de hoofdconversatie te vervuilen.

### [Agentteams](./agent-teams)

Spawn persistente teams van samenwerkende agents met gespecialiseerde rollen. Een leider coördineert leden die autonoom communiceren via intersessieberichten. Inclusief levenscyclusbewaking met inactieve time-outs, levensduurlimieten en gezondheidscontroles. Best voor complexe taken die baat hebben bij meerdere perspectieven die op elkaars werk itereren.

## Rijke interactie

### [Stempijplijn](./voice)

Volledige spraakondersteuning met configureerbare STT- en TTS-providers. Gebruik Whisper voor lokale transcriptie, Deepgram of OpenAI voor cloud-STT, en ElevenLabs of OpenAI voor tekst-naar-spraak. Spraakinvoer doorloopt dezelfde classificatie- en beleidshandhaving als tekst.

### [Tide Pool / A2UI](./tidepool)

Een door de agent aangestuurde visuele werkruimte waar Triggerfish interactieve inhoud rendert — dashboards, grafieken, formulieren en codevoorbeelden. Het A2UI-protocol (Agent-to-UI) pusht realtime-updates van de agent naar verbonden clients.

## Multi-agent en multi-model

### [Multi-agent routing](./multi-agent)

Routeer verschillende kanalen, accounts of contacten naar afzonderlijke geïsoleerde agents, elk met zijn eigen SPINE.md, werkruimte, skills en classificatieplafond. Uw werk-Slack gaat naar één agent; uw persoonlijke WhatsApp gaat naar een ander.

### [LLM-providers en failover](./model-failover)

Verbind met Anthropic, OpenAI, Google, lokale modellen (Ollama) of OpenRouter. Configureer failover-ketens zodat uw agent automatisch terugvalt op een alternatieve provider wanneer een provider niet beschikbaar is. Elke agent kan een ander model gebruiken.

### [Snelheidsbegrenzing](./rate-limiting)

Schuifvenster-snelheidsbegrenzer die voorkomt dat API-limieten van LLM-providers worden bereikt. Houdt tokens-per-minuut en verzoeken-per-minuut bij, vertraagt aanroepen wanneer capaciteit is uitgeput en integreert met de failover-keten.

## Operationeel

### [Gestructureerde logging](./logging)

Uniforme gestructureerde logging met ernstniveaus, bestandsrotatie en dubbele uitvoer naar stderr en bestand. Componentgelabelde logregels, automatische 1 MB-rotatie en een `log_read`-tool voor toegang tot loggeschiedenis.

::: info Alle functies integreren met het kernbeveiligingsmodel. Cron-taken respecteren classificatieplafonds. Spraakinvoer draagt taint. Tide Pool-inhoud doorloopt de PRE_OUTPUT-hook. Multi-agent routing handhaaft sessie-isolatie. Geen enkele functie omzeilt de beleidslaag. :::
