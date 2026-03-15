# Agentteams

Triggerfish-agents kunnen persistente teams van samenwerkende agents spawnen die samenwerken aan complexe taken. Elk teamlid krijgt zijn eigen sessie, rol, gesprekscontext en tools. Één lid wordt aangewezen als de **leider** en coördineert het werk.

Teams zijn het beste voor open-einde taken die baat hebben bij gespecialiseerde rollen die parallel werken: onderzoek + analyse + schrijven, architectuur + implementatie + beoordeling, of elke taak waarbij verschillende perspectieven moeten itereren op elkaars werk.

::: info Beschikbaarheid
Agentteams vereisen het **Power**-plan (€149/maand) bij gebruik van Triggerfish Gateway. Open-source gebruikers die hun eigen API-sleutels draaien hebben volledige toegang tot agentteams — elk teamlid verbruikt inferentie van uw geconfigureerde provider.
:::

## Tools

### `team_create`

Een persistent team van agents aanmaken dat samenwerkt aan een taak. Definieer ledenrollen, tools en modellen. Precies één lid moet de leider zijn.

| Parameter                | Type   | Vereist | Beschrijving                                                              |
| ------------------------ | ------ | ------- | ------------------------------------------------------------------------- |
| `name`                   | string | ja      | Leesbare teamnaam                                                         |
| `task`                   | string | ja      | Het teamdoel (verzonden naar de leider als initiële instructies)          |
| `members`                | array  | ja      | Teamleddefinities (zie hieronder)                                         |
| `idle_timeout_seconds`   | number | nee     | Per-lid inactieve time-out. Standaard: 300 (5 minuten)                    |
| `max_lifetime_seconds`   | number | nee     | Maximale teamlevensduur. Standaard: 3600 (1 uur)                          |
| `classification_ceiling` | string | nee     | Teambreed classificatieplafond (bijv. `CONFIDENTIAL`)                     |

**Leddefinitie:**

| Veld                     | Type    | Vereist | Beschrijving                                                    |
| ------------------------ | ------- | ------- | --------------------------------------------------------------- |
| `role`                   | string  | ja      | Unieke rolidentificatie (bijv. `researcher`, `reviewer`)        |
| `description`            | string  | ja      | Wat dit lid doet (geïnjecteerd in systeemprompt)                |
| `is_lead`                | boolean | ja      | Of dit lid de teamleider is                                     |
| `model`                  | string  | nee     | Modeloverschrijving voor dit lid                                |
| `classification_ceiling` | string  | nee     | Per-lid classificatieplafond                                    |
| `initial_task`           | string  | nee     | Initiële instructies (leider standaard naar teamtaak)           |

**Validatieregels:**

- Het team moet precies één lid hebben met `is_lead: true`
- Alle rollen moeten uniek en niet-leeg zijn
- Lid-classificatieplafonds kunnen het teamplafond niet overschrijden
- `name` en `task` moeten niet-leeg zijn

### `team_status`

De huidige staat van een actief team controleren.

| Parameter | Type   | Vereist | Beschrijving |
| --------- | ------ | ------- | ------------ |
| `team_id` | string | ja      | Team-ID      |

Geeft de teamstatus, geaggregeerd taint-niveau en per-lid details terug inclusief het huidige taint-niveau, status en tijdstempel van laatste activiteit van elk lid.

### `team_message`

Een bericht sturen naar een specifiek teamlid. Handig voor het geven van aanvullende context, werk omleiden of voortgangsupdates opvragen.

| Parameter | Type   | Vereist | Beschrijving                                                 |
| --------- | ------ | ------- | ------------------------------------------------------------ |
| `team_id` | string | ja      | Team-ID                                                      |
| `role`    | string | nee     | Doellidenrol (standaard naar leider)                         |
| `message` | string | ja      | Berichtinhoud                                                |

Het team moet de status `running` hebben en het doellid moet `active` of `idle` zijn.

### `team_disband`

Een team afsluiten en alle ledensessies beëindigen.

| Parameter | Type   | Vereist | Beschrijving                               |
| --------- | ------ | ------- | ------------------------------------------ |
| `team_id` | string | ja      | Team-ID                                    |
| `reason`  | string | nee     | Waarom het team wordt ontbonden            |

Alleen de sessie die het team heeft aangemaakt of het leiderlid kan het team ontbinden.

## Hoe teams werken

### Aanmaken

Wanneer de agent `team_create` aanroept, doet Triggerfish het volgende:

1. Valideert de teamdefinitie (rollen, leidersaantal, classificatieplafonds)
2. Spawnt een geïsoleerde agentsessie voor elk lid via de orchestratorfabriek
3. Injecteert een **teamroster-prompt** in de systeemprompt van elk lid, met beschrijving van hun rol, teamleden en samenwerkingsinstructies
4. Stuurt de initiële taak naar de leider (of aangepaste `initial_task` per lid)
5. Start een levenscyclusmonitor die de teamgezondheid elke 30 seconden controleert

Elke ledenssessie is volledig geïsoleerd met zijn eigen gesprekscontext, taint-tracking en tooltoegang.

### Samenwerking

Teamleden communiceren met elkaar via `sessions_send`. De aanmakende agent hoeft geen berichten tussen leden te doorgeven. De typische stroom:

1. De leider ontvangt het teamdoel
2. De leider decomponeert de taak en stuurt opdrachten naar leden via `sessions_send`
3. Leden werken autonoom, roepen tools aan en itereren
4. Leden sturen resultaten terug naar de leider (of direct naar een ander lid)
5. De leider synthetiseert resultaten en beslist wanneer het werk klaar is
6. De leider roept `team_disband` aan om het team af te sluiten

Berichten tussen teamleden worden direct bezorgd via de orchestrator — elk bericht triggert een volledige agentturn in de sessie van de ontvanger.

### Status

Gebruik `team_status` om voortgang op elk moment te controleren. Het antwoord bevat:

- **Teamstatus:** `running`, `paused`, `completed`, `disbanded` of `timed_out`
- **Geaggregeerde taint:** Het hoogste classificatieniveau over alle leden heen
- **Per-lid details:** Rol, status (`active`, `idle`, `completed`, `failed`), huidig taint-niveau en tijdstempel van laatste activiteit

### Ontbinden

Teams kunnen worden ontbonden door:

- De aanmakende sessie die `team_disband` aanroept
- Het leiderlid dat `team_disband` aanroept
- De levenscyclusmonitor die automatisch ontbindt nadat de levensduurlimiet verloopt
- De levenscyclusmonitor die detecteert dat alle leden inactief zijn

Wanneer een team wordt ontbonden, worden alle actieve ledensessies beëindigd en worden resources opgeruimd.

## Teamrollen

### Leider

Het leiderlid coördineert het team. Bij aanmaken:

- Ontvangt de `task` van het team als initiële instructies (tenzij overschreven door `initial_task`)
- Krijgt systeempromptinstructies voor het verdelen van werk, opdrachten toewijzen en beslissen wanneer het doel is bereikt
- Is gemachtigd het team te ontbinden

Er is precies één leider per team.

### Leden

Niet-leidende leden zijn specialisten. Bij aanmaken:

- Ontvangen hun `initial_task` als opgegeven, anders inactief totdat de leider hen werk stuurt
- Krijgen systeempromptinstructies voor het sturen van voltooid werk naar de leider of de volgende geschikte teamgenoot
- Kunnen het team niet ontbinden

## Levenscyclusbewaking

Teams hebben automatische levenscyclusbewaking die elke 30 seconden wordt uitgevoerd.

### Inactieve time-out

Elk lid heeft een inactieve time-out (standaard: 5 minuten). Wanneer een lid inactief is:

1. **Eerste drempel (`idle_timeout_seconds`):** Het lid ontvangt een duwbericht met het verzoek resultaten te sturen als hun werk klaar is
2. **Dubbele drempel (2x `idle_timeout_seconds`):** Het lid wordt beëindigd en de leider wordt gemeld

### Levensduur-time-out

Teams hebben een maximale levensduur (standaard: 1 uur). Wanneer de limiet is bereikt:

1. De leider ontvangt een waarschuwingsbericht met 60 seconden om einduitvoer te produceren
2. Na de respijtperiode wordt het team automatisch ontbonden

### Gezondheidscontroles

De monitor controleert sessiestatus elke 30 seconden:

- **Leidermislukking:** Als de leidersessie niet meer bereikbaar is, wordt het team gepauzeerd en de aanmakende sessie gemeld
- **Ledenmislukking:** Als een ledensessie verdwenen is, wordt het gemarkeerd als `failed` en de leider gemeld om door te gaan met de resterende leden
- **Allemaal inactief:** Als alle leden `completed` of `failed` zijn, wordt de aanmakende sessie gemeld om nieuwe instructies in te voegen of te ontbinden

## Classificatie en taint

Teamledensessies volgen dezelfde classificatieregels als alle andere sessies:

- Elk lid begint bij `PUBLIC`-taint en escaleert naarmate het geclassificeerde gegevens benadert
- **Classificatieplafonds** kunnen per-team of per-lid worden ingesteld om te beperken welke gegevens leden kunnen benaderen
- **Write-down-handhaving** is van toepassing op alle communicatie tussen leden. Een lid besmet bij `CONFIDENTIAL` kan geen gegevens sturen naar een lid bij `PUBLIC`
- De **geaggregeerde taint** (hoogste taint over alle leden heen) wordt gerapporteerd in `team_status` zodat de aanmakende sessie de algehele classificatieblootstelling van het team kan bijhouden

::: danger BEVEILIGING Lid-classificatieplafonds kunnen het teamplafond niet overschrijden. Als het teamplafond `INTERNAL` is, kan geen enkel lid worden geconfigureerd met een `CONFIDENTIAL`-plafond. Dit wordt gevalideerd bij aanmaken. :::

## Teams versus sub-agents

| Aspect          | Sub-agent (`subagent`)                          | Team (`team_create`)                                              |
| --------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| **Levensduur**  | Één taak, geeft resultaat terug en sluit af     | Persistent totdat ontbonden of time-out                           |
| **Leden**       | Één agent                                       | Meerdere agents met afzonderlijke rollen                          |
| **Interactie**  | Fire-and-forget vanuit bovenliggende agent      | Leden communiceren vrij via `sessions_send`                       |
| **Coördinatie** | Bovenliggende agent wacht op resultaat          | Leider coördineert, bovenliggende agent kan inchecken via `team_status` |
| **Gebruiksscenario** | Gerichte eenstapsdelegatie              | Complexe multi-rol samenwerking                                   |

**Gebruik sub-agents** wanneer u een enkele agent een gerichte taak wilt laten uitvoeren en een resultaat wilt teruggeven. **Gebruik teams** wanneer de taak baat heeft bij meerdere gespecialiseerde perspectieven die op elkaars werk itereren.

::: tip Teams zijn autonoom zodra aangemaakt. De aanmakende agent kan status controleren en berichten sturen, maar hoeft niet micromanagen. De leider verwerkt coördinatie. :::
