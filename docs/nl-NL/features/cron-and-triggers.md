# Cron en triggers

Triggerfish-agents zijn niet beperkt tot reactieve vraag-en-antwoord. Het cron- en triggersysteem maakt proactief gedrag mogelijk: geplande taken, periodieke inchecks, ochtendoverzichten, achtergrondmonitoring en autonome multi-stap workflows.

## Cron-taken

Cron-taken zijn geplande taken met vaste instructies, een bezorgkanaal en een classificatieplafond. Ze gebruiken standaard cron-expressiesyntaxis.

### Configuratie

Definieer cron-taken in `triggerfish.yaml` of laat de agent ze bij runtime beheren via de cron-tool:

```yaml
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # dagelijks om 7 uur
        task: "Bereid ochtendoverzicht voor met agenda,
          ongelezen e-mails en weer"
        channel: telegram # Waar bezorgen
        classification: INTERNAL # Max taint voor deze taak

      - id: pipeline-check
        schedule: "0 */4 * * *" # elke 4 uur
        task: "Controleer Salesforce-pijplijn op wijzigingen"
        channel: slack
        classification: CONFIDENTIAL
```

### Hoe het werkt

1. De **CronManager** parseert standaard cron-expressies en houdt een persistent taakregister bij dat herstarten overleeft.
2. Wanneer een taak afloopt, maakt de **OrchestratorFactory** een geïsoleerde orchestrator en sessie specifiek voor die uitvoering aan.
3. De taak draait in een **achtergrond-sessieworkspace** met zijn eigen taint-tracking.
4. Uitvoer wordt bezorgd aan het geconfigureerde kanaal, onderhevig aan de classificatieregels van dat kanaal.
5. Uitvoeringsgeschiedenis wordt vastgelegd voor audit.

### Door agent beheerde cron

De agent kan zijn eigen cron-taken aanmaken en beheren via de `cron`-tool:

| Actie          | Beschrijving              | Beveiliging                                               |
| -------------- | ------------------------- | --------------------------------------------------------- |
| `cron.list`    | Alle geplande taken weergeven | Alleen eigenaar                                       |
| `cron.create`  | Een nieuwe taak plannen   | Alleen eigenaar, classificatieplafond afgedwongen         |
| `cron.delete`  | Een geplande taak verwijderen | Alleen eigenaar                                       |
| `cron.history` | Eerdere uitvoeringen bekijken | Auditspoor bewaard                                    |

::: warning Aanmaken van cron-taken vereist eigenaarauthenticatie. De agent kan geen taken plannen namens externe gebruikers of het geconfigureerde classificatieplafond overschrijden. :::

### CLI-cronbeheer

Cron-taken kunnen ook direct vanaf de opdrachtregel worden beheerd:

```bash
triggerfish cron add "0 9 * * *" ochtendoverzicht
triggerfish cron add "0 */4 * * *" pijplijn controleren --classification=CONFIDENTIAL
triggerfish cron list
triggerfish cron history <taak-id>
triggerfish cron delete <taak-id>
```

De `--classification`-vlag stelt het classificatieplafond in voor de taak. Geldige niveaus zijn `PUBLIC`, `INTERNAL`, `CONFIDENTIAL` en `RESTRICTED`. Indien weggelaten, standaard `INTERNAL`.

## Triggersysteem

Triggers zijn periodieke "inchecks" waarbij de agent wakker wordt om te evalueren of proactieve actie nodig is. In tegenstelling tot cron-taken met vaste taken, geven triggers de agent de vrijheid om te beslissen wat aandacht nodig heeft.

### TRIGGER.md

`TRIGGER.md` definieert wat de agent moet controleren tijdens elke wakeup. Het bevindt zich op `~/.triggerfish/config/TRIGGER.md` en is een vrijevorm markdown-bestand waar u monitoringprioriteiten, escalatieregels en proactief gedrag opgeeft.

Als `TRIGGER.md` afwezig is, gebruikt de agent zijn algemene kennis om te beslissen wat aandacht nodig heeft.

**Voorbeeld TRIGGER.md:**

```markdown
# TRIGGER.md -- Wat te controleren bij elke wakeup

## Prioriteitscontroles

- Ongelezen berichten over alle kanalen ouder dan 1 uur
- Agendaconflicten in de komende 24 uur
- Achterstallige taken in Linear of Jira

## Monitoring

- GitHub: PR's die wachten op mijn beoordeling
- E-mail: alles van VIP-contacten (markeer voor onmiddellijke melding)
- Slack: vermeldingen in het #incidenten-kanaal

## Proactief

- Als het ochtend is (7-9 uur), bereid dagelijks overzicht voor
- Als het vrijdagmiddag is, maak wekelijkse samenvatting
```

### Triggerconfiguratie

Triggertiming en -beperkingen worden ingesteld in `triggerfish.yaml`:

```yaml
scheduler:
  trigger:
    enabled: true # Stel in op false om triggers uit te schakelen (standaard: true)
    interval_minutes: 30 # Elke 30 minuten controleren (standaard: 30)
    # Stel in op 0 om triggers uit te schakelen zonder configuratie te verwijderen
    classification_ceiling: CONFIDENTIAL # Max taint-plafond (standaard: CONFIDENTIAL)
    quiet_hours:
      start: 22 # Niet wekken tussen 22:00 ...
      end: 7 # ... en 7:00
```

| Instelling                              | Beschrijving                                                                                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                               | Of periodieke trigger-wakeups actief zijn. Stel in op `false` om uit te schakelen.                                                           |
| `interval_minutes`                      | Hoe vaak (in minuten) de agent wakker wordt om triggers te controleren. Standaard: `30`. Stel in op `0` om triggers uit te schakelen zonder het configuratieblok te verwijderen. |
| `classification_ceiling`                | Maximaal classificatieniveau dat de triggersessie kan bereiken. Standaard: `CONFIDENTIAL`.                                                    |
| `quiet_hours.start` / `quiet_hours.end` | Uurbereik (24-uursklok) gedurende welke triggers worden onderdrukt.                                                                           |

::: tip Om triggers tijdelijk uit te schakelen, stelt u `interval_minutes: 0` in. Dit is equivalent aan `enabled: false` en laat u uw andere triggerinstellingen intact zodat u eenvoudig opnieuw kunt inschakelen. :::

### Triggeruitvoering

Elke trigger-wakeup volgt deze volgorde:

1. De scheduler loopt af op het geconfigureerde interval.
2. Een nieuwe achtergrond-sessie wordt gespawnd met `PUBLIC`-taint.
3. De agent leest `TRIGGER.md` voor zijn monitoringinstructies.
4. De agent evalueert elke controle met behulp van beschikbare tools en MCP-servers.
5. Als actie nodig is, handelt de agent — meldingen sturen, taken aanmaken of samenvattingen bezorgen.
6. De taint van de sessie kan escaleren naarmate geclassificeerde gegevens worden benaderd, maar kan het geconfigureerde plafond niet overschrijden.
7. De sessie wordt gearchiveerd na voltooiing.

::: tip Triggers en cron-taken vullen elkaar aan. Gebruik cron voor taken die op exacte tijden moeten draaien ongeacht omstandigheden (ochtendoverzicht om 7 uur). Gebruik triggers voor monitoring die oordeel vereist (controleer elke 30 minuten of er iets mijn aandacht nodig heeft). :::

## Trigger-contexttool

De agent kan triggerresultaten in zijn huidige gesprek laden met behulp van de `trigger_add_to_context`-tool. Dit is handig wanneer een gebruiker vraagt naar iets dat werd gecontroleerd tijdens de laatste trigger-wakeup.

### Gebruik

| Parameter | Standaard     | Beschrijving                                                                                                       |
| --------- | ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `source`  | `"trigger"`   | Welke triggeruitvoer te laden: `"trigger"` (periodiek), `"cron:<taak-id>"` of `"webhook:<bron>"`                  |

De tool laadt het meest recente uitvoeringsresultaat voor de opgegeven bron en voegt het toe aan de gesprekscontext.

### Write-down-handhaving

Triggercontextinjectie respecteert de no-write-down-regel:

- Als de classificatie van de trigger de sessie-taint **overschrijdt**, **escaleert** de sessie-taint om overeen te komen
- Als de sessie-taint de classificatie van de trigger **overschrijdt**, is de injectie **toegestaan** — lager-geclassificeerde gegevens kunnen altijd in een hoger-geclassificeerde sessie stromen (normaal `canFlowTo`-gedrag). De sessie-taint blijft ongewijzigd.

::: info Een CONFIDENTIAL-sessie kan een PUBLIC-triggerresultaat laden zonder problemen — gegevens stromen omhoog. Het omgekeerde (CONFIDENTIAL-triggergegevens injecteren in een sessie met een PUBLIC-plafond) zou de sessie-taint escaleren naar CONFIDENTIAL. :::

### Persistentie

Triggerresultaten worden opgeslagen via `StorageProvider` met sleutels in het formaat `trigger:last:<bron>`. Alleen het meest recente resultaat per bron wordt bewaard.

## Beveiligingsintegratie

Alle geplande uitvoering integreert met het kernbeveiligingsmodel:

- **Geïsoleerde sessies** — Elke cron-taak en trigger-wakeup draait in zijn eigen gespawnde sessie met onafhankelijke taint-tracking.
- **Classificatieplafond** — Achtergrondtaken kunnen hun geconfigureerde classificatieniveau niet overschrijden, zelfs als de tools die ze aanroepen hoger-geclassificeerde gegevens teruggeven.
- **Beleidshooks** — Alle acties binnen geplande taken doorlopen dezelfde handhavingshooks als interactieve sessies (PRE_TOOL_CALL, POST_TOOL_RESPONSE, PRE_OUTPUT).
- **Kanaalclassificatie** — Uitvoerbezorging respecteert het classificatieniveau van het doelkanaal. Een `CONFIDENTIAL`-resultaat kan niet naar een `PUBLIC`-kanaal worden verzonden.
- **Auditspoor** — Elke geplande uitvoering wordt vastgelegd met volledige context: taak-ID, sessie-ID, taint-geschiedenis, ondernomen acties en bezorgingsstatus.
- **Persistentie** — Cron-taken worden opgeslagen via `StorageProvider` (naamruimte: `cron:`) en overleven gateway-herstarten.
