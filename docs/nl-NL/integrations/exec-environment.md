# Agent-uitvoeringsomgeving

De Agent-uitvoeringsomgeving is de zelfontwikelingsmogelijkheid van Triggerfish — een volwaardige codewerkruimte waar de agent code kan schrijven, uitvoeren, uitvoer en fouten observeren, problemen oplossen en itereren totdat iets werkt. Dit is wat de agent in staat stelt integraties te bouwen, ideeën te testen en nieuwe tools zelfstandig te maken.

## Niet de pluginsandbox

De uitvoeringsomgeving is fundamenteel anders dan de [Pluginsandbox](./plugins). Het begrijpen van het onderscheid is belangrijk:

- De **Pluginsandbox** beschermt het systeem **TEGEN** niet-vertrouwde code van derden
- De **Uitvoeringsomgeving** stelt de agent in staat **OM** zijn eigen code te schrijven, uitvoeren en debuggen

De pluginsandbox is defensief. De uitvoeringsomgeving is productief. Ze dienen tegenovergestelde doelen en hebben verschillende beveiligingsprofielen.

| Aspect               | Pluginsandbox                          | Agent-uitvoeringsomgeving            |
| -------------------- | -------------------------------------- | ------------------------------------ |
| **Doel**             | Systeem beschermen TEGEN niet-vertrouwde code | Agent in staat stellen dingen TE bouwen |
| **Bestandssysteem**  | Geen (volledig gesandboxed)            | Alleen werkruimtemap                 |
| **Netwerk**          | Alleen gedeclareerde eindpunten        | Door beleid bestuurde toestaan/weigeren-lijsten |
| **Pakketinstallatie** | Niet toegestaan                       | Toegestaan (npm, pip, deno add)      |
| **Uitvoeringstijd**  | Strikte timeout                        | Royale timeout (configureerbaar)     |
| **Iteratie**         | Eenmalige uitvoering                   | Onbeperkte schrijf/uitvoer/repareer-lussen |
| **Persistentie**     | Tijdelijk                              | Werkruimte blijft bestaan over sessies |

## De feedbacklus

Het kernkwaliteitsonderscheid. Dit is hetzelfde patroon dat tools zoals Claude Code effectief maakt — een strakke schrijf/uitvoer/repareer-cyclus waarbij de agent precies ziet wat een menselijke ontwikkelaar zou zien.

### Stap 1: Schrijven

De agent maakt of wijzigt bestanden in zijn werkruimte met `write_file`. De werkruimte is een echte bestandssysteemmap die is beperkt tot de huidige agent.

### Stap 2: Uitvoeren

De agent voert de code uit via `run_command` en ontvangt de volledige stdout, stderr en exitcode. Geen uitvoer wordt verborgen of samengevat. De agent ziet precies wat u in een terminal zou zien.

### Stap 3: Observeren

De agent leest de volledige uitvoer. Als er fouten zijn opgetreden, ziet hij de volledige stack-trace, foutmeldingen en diagnostische uitvoer. Als tests zijn mislukt, ziet hij welke tests zijn mislukt en waarom.

### Stap 4: Repareren

De agent bewerkt de code op basis van wat hij heeft geobserveerd, met behulp van `write_file` of `edit_file` om specifieke bestanden bij te werken.

### Stap 5: Herhalen

De agent voert opnieuw uit. Deze lus gaat door totdat de code werkt — tests slagen, correcte uitvoer produceert, of het gestelde doel bereikt.

### Stap 6: Vastzetten

Eenmaal werkend kan de agent zijn werk opslaan als een [skill](./skills) (SKILL.md + ondersteunende bestanden), het registreren als een integratie, aansluiten op een cron-taak, of beschikbaar stellen als tool.

::: tip De vastzetstap is wat de uitvoeringsomgeving meer maakt dan een kladblok. Werkende code verdwijnt niet zomaar — de agent kan het verpakken in een herbruikbare skill die op schema draait, op triggers reageert, of op aanvraag wordt aangeroepen. :::

## Beschikbare tools

| Tool             | Beschrijving                                                | Uitvoer                                    |
| ---------------- | ----------------------------------------------------------- | ------------------------------------------ |
| `write_file`     | Een bestand schrijven of overschrijven in de werkruimte     | Bestandspad, geschreven bytes              |
| `read_file`      | Bestandsinhoud lezen uit de werkruimte                      | Bestandsinhoud als string                  |
| `edit_file`      | Gerichte bewerkingen toepassen op een bestand               | Bijgewerkte bestandsinhoud                 |
| `run_command`    | Een shell-opdracht uitvoeren in de werkruimte               | stdout, stderr, exitcode, duur             |
| `list_directory` | Bestanden in de werkruimte weergeven (optioneel recursief)  | Bestandslijst met groottes                 |
| `search_files`   | Bestandsinhoud doorzoeken (grep-achtig)                     | Overeenkomende regels met bestand:regelreferenties |

## Werkruimtestructuur

Elke agent krijgt een geïsoleerde werkruimtemap die blijft bestaan over sessies:

```
~/.triggerfish/workspace/
  <agent-id>/                     # Per-agent workspace
    scratch/                      # Temporary working files
    integrations/                 # Integration code being developed
      notion-sync/
        index.ts
        index_test.ts
        package.json
      salesforce-report/
        main.py
        test_main.py
    skills/                       # Skills being authored
      morning-briefing/
        SKILL.md
        briefing.ts
    .exec_history                 # Execution log for audit
  background/
    <session-id>/                 # Temporary workspace for background tasks
```

Werkruimten zijn geïsoleerd tussen agents. Één agent heeft geen toegang tot de werkruimte van een andere agent. Achtergrondtaken (cron-taken, triggers) krijgen hun eigen tijdelijke werkruimte die beperkt is tot de sessie.

## Integratieontwijkingsflow

Wanneer u de agent vraagt een nieuwe integratie te bouwen (bijv. "verbind met mijn Notion en synchroniseer taken"), volgt de agent een natuurlijke ontwikkelworkflow:

1. **Verkennen** — Gebruikt `run_command` om API-eindpunten te testen, authenticatie te controleren, responsvormen te begrijpen
2. **Scaffolden** — Schrijft integratiecode met `write_file`, maakt een testbestand ernaast
3. **Testen** — Voert tests uit met `run_command`, ziet mislukkingen, itereert
4. **Afhankelijkheden installeren** — Gebruikt `run_command` om vereiste pakketten toe te voegen (npm, pip, deno add)
5. **Itereren** — Schrijf, uitvoer, repareer-lus totdat tests slagen en de integratie end-to-end werkt
6. **Vastzetten** — Opgeslagen als een skill (schrijft SKILL.md met metadata) of aangesloten op een cron-taak
7. **Goedkeuring** — Door de agent gemaakte skill gaat de `PENDING_APPROVAL`-status in; u beoordeelt en keurt goed

## Taal- en runtime-ondersteuning

De uitvoeringsomgeving draait op het hostsysteem (niet in WASM), met toegang tot meerdere runtimes:

| Runtime | Beschikbaar via                         | Gebruikssituatie                    |
| ------- | --------------------------------------- | ----------------------------------- |
| Deno    | Directe uitvoering                      | TypeScript/JavaScript (eersteklas)  |
| Node.js | `run_command node`                      | Toegang tot npm-ecosysteem          |
| Python  | `run_command python`                    | Data science, ML, scripting         |
| Shell   | `run_command sh` / `run_command bash`   | Systeemautomatisering, verbindingsscripts |

De agent kan beschikbare runtimes detecteren en de beste kiezen voor de taak. Pakketinstallatie werkt via de standaard toolchain voor elke runtime.

## Beveiligingsgrenzen

De uitvoeringsomgeving is toleranter dan de pluginsandbox, maar toch bij elke stap door beleid gecontroleerd.

### Beleidsintegratie

- Elke `run_command`-aanroep activeert de `PRE_TOOL_CALL`-hook met de opdracht als context
- Toestaan/weigeren-lijst voor opdrachten wordt gecontroleerd vóór uitvoering
- Uitvoer wordt vastgelegd en doorgegeven via de `POST_TOOL_RESPONSE`-hook
- Netwerkeindpunten die tijdens uitvoering worden benaderd, worden bijgehouden via afkomst
- Als code toegang heeft tot geclassificeerde gegevens (bijv. leest van een CRM-API), escaleert de sessietaint
- Uitvoeringsgeschiedenis wordt geregistreerd in `.exec_history` voor audit

### Harde grenzen

Deze grenzen worden nooit overschreden, ongeacht de configuratie:

- Kan niet buiten de werkruimtemap schrijven
- Kan geen opdrachten op de weigerlijst uitvoeren (`rm -rf /`, `sudo`, enz.)
- Kan geen werkruimten van andere agents benaderen
- Alle netwerkaanroepen worden beheerd door beleidshooks
- Alle uitvoer wordt geclassificeerd en draagt bij aan sessietaint
- Resourcelimieten worden gehandhaafd: schijfruimte, CPU-tijd per uitvoering, geheugen

::: warning BEVEILIGING Elke opdracht die de agent uitvoert, doorloopt de `PRE_TOOL_CALL`-hook. De beleidsengine controleert hem aan de hand van de opdrachtentoestaan/weigeren-lijst voordat de uitvoering begint. Gevaarlijke opdrachten worden deterministisch geblokkeerd — de LLM kan deze beslissing niet beïnvloeden. :::

### Enterprise-besturingselementen

Enterprise-beheerders hebben aanvullende besturingselementen over de uitvoeringsomgeving:

- **Uitvoering volledig uitschakelen** voor specifieke agents of rollen
- **Beschikbare runtimes beperken** (bijv. alleen Deno toestaan, Python en shell blokkeren)
- **Resourcelimieten instellen** per agent (schijfquota, CPU-tijd, geheugenlimiet)
- **Goedkeuring vereisen** voor alle uitvoerbewerkingen boven een classificatiedrempel
- **Aangepaste opdrachtweigerlijst** naast de standaardlijst met gevaarlijke opdrachten
