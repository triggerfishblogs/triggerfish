# Snel starten

Deze gids begeleidt u door uw eerste 5 minuten met Triggerfish — van het uitvoeren van de installatiewizard tot het hebben van een werkende AI-agent waarmee u kunt chatten.

## De installatiewizard uitvoeren

Als u het installatieprogramma met één opdracht heeft gebruikt, is de wizard al uitgevoerd tijdens de installatie. Om de wizard opnieuw uit te voeren of opnieuw te beginnen:

```bash
triggerfish dive
```

De wizard doorloopt acht stappen:

### Stap 1: Kies uw LLM-aanbieder

```
Stap 1/8: Kies uw LLM-aanbieder
  > Triggerfish Gateway — geen API-sleutels nodig
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Lokaal (Ollama)
    OpenRouter
```

Selecteer een aanbieder en voer uw inloggegevens in. Triggerfish ondersteunt meerdere aanbieders met automatische failover. **Triggerfish Gateway** is de eenvoudigste optie — abonneer u op een [Pro- of Power-abonnement](/nl-NL/pricing), en uw agent verbindt met beheerde LLM- en zoekinfrastructuur zonder API-sleutels te configureren.

### Stap 2: Geef uw agent een naam

```
Stap 2/8: Geef uw agent een naam en stel de persoonlijkheid in
  Agent-naam: Reef
  Missie (één zin): Help me georganiseerd en geïnformeerd te blijven
  Toon: > Professioneel  Informeel  Bondig  Aangepast
```

Dit genereert uw `SPINE.md`-bestand — de basis van de systeemprompt van uw agent. U kunt het op elk moment bewerken via `~/.triggerfish/SPINE.md`.

### Stap 3: Verbind een kanaal

```
Stap 3/8: Verbind uw eerste kanaal
  > CLI (al beschikbaar)
    WebChat
    Telegram (voer bottoken in)
    Nu overslaan
```

Kies een berichtenplatform of sla deze stap over om te beginnen met alleen de CLI. U kunt later kanalen toevoegen in uw `triggerfish.yaml`.

### Stap 4: Optionele plugins

```
Stap 4/8: Installeer optionele plugins
  > Obsidian
    Overslaan
```

Verbind optionele integraties zoals Obsidian voor notities.

### Stap 5: Verbind Google Workspace (optioneel)

Verbind uw Google-account voor Gmail, Agenda, Taken, Drive en Sheets via OAuth2. U kunt dit overslaan en later verbinden met `triggerfish connect google`.

### Stap 6: Verbind GitHub (optioneel)

Verbind GitHub door een persoonlijk toegangstoken te plakken. Geeft de agent tools voor repositories, PR's, issues en Actions. U kunt dit overslaan en later verbinden met `triggerfish connect github`.

### Stap 7: Stel webzoeken in

Kies een zoekmachine (Brave Search of zelf-gehoste SearXNG) voor uw agent, of sla dit nu over.

### Stap 8: Start de daemon

```
Stap 8/8: Installeren als daemon?
  > Ja (starten bij inloggen, draait op achtergrond)
    Nee (alleen handmatig starten)
```

Kies Ja om uw agent te laten draaien wanneer uw machine is ingeschakeld.

## Begin met chatten

Na het voltooien van de wizard kunt u onmiddellijk beginnen met chatten via de CLI:

```bash
triggerfish chat
```

Of, als u een berichtenkanaal heeft verbonden, stuur uw agent daar een bericht.

### Voorbeeldgesprek

```
U: Waarmee kunt u mij helpen?

Reef: Ik kan u met een breed scala aan taken helpen. Dit zijn enkele
dingen waarvoor ik ben ingesteld:

  - Vragen beantwoorden en gesprekken voeren
  - Uw agenda en planning beheren
  - E-mails en berichten samenvatten
  - Documenten schrijven en bewerken
  - Code uitvoeren in een sandbox-omgeving
  - Op het web zoeken naar informatie
  - Terugkerende taken automatiseren met cron-jobs

Waar wilt u mee beginnen?

U: Stel elke dag om 7 uur een ochtendoverzicht in

Reef: Ik heb een cron-job aangemaakt voor uw ochtendoverzicht:

  Schema: Elke dag om 7:00 uur
  Taak: Overzicht opstellen met agenda-evenementen, ongelezen e-mails
        en weersvoorspelling
  Bezorging: CLI (voeg een kanaal toe in de configuratie om het via
             Telegram/Slack te ontvangen)

U ontvangt uw eerste overzicht morgenochtend. U kunt cron-jobs
beheren met /cron list.
```

## Uw installatie verifiëren

Voer de gezondheidscontrole uit om te controleren of alles werkt:

```bash
triggerfish patrol
```

```
Triggerfish gezondheidscontrole

  Gateway actief (PID 12345, uptime 2m)
  LLM-aanbieder verbonden (Anthropic, Claude Sonnet 4.5)
  1 kanaal actief (CLI)
  Beleidsengine geladen (4 regels)
  3 skills geïnstalleerd (3 gebundeld)

Algemeen: GEZOND
```

## Wat u hierna kunt doen

- **Pas uw agent aan** — bewerk `~/.triggerfish/SPINE.md` om de persoonlijkheid en mogelijkheden van uw agent te verfijnen. Zie [SPINE en Triggers](./spine-and-triggers).
- **Voeg meer kanalen toe** — verbind Telegram, Slack, Discord of WhatsApp in uw `triggerfish.yaml`. Zie [Configuratie](./configuration).
- **Verbind integraties** — `triggerfish connect google` voor Google Workspace, `triggerfish connect github` voor GitHub. Zie [Integraties](/nl-NL/integrations/).
- **Stel proactief gedrag in** — maak een `~/.triggerfish/TRIGGER.md` om uw agent te vertellen wat hij moet bewaken. Zie [SPINE en Triggers](./spine-and-triggers).
- **Verken opdrachten** — leer alle beschikbare CLI- en in-chat-opdrachten kennen. Zie [CLI-opdrachten](./commands).
