# Planmodus en taaktracering

Triggerfish biedt twee aanvullende tools voor gestructureerd werk: **planmodus** voor complexe implementatieplanning en **todo-tracering** voor taakbeheer over sessies heen.

## Planmodus

Planmodus beperkt de agent tot alleen-lezen verkenning en gestructureerde planning vóór het aanbrengen van wijzigingen. Dit voorkomt dat de agent naar implementatie springt voordat het het probleem begrijpt.

### Tools

#### `plan_enter`

Planmodus betreden. Blokkeert schrijfbewerkingen (`write_file`, `cron_create`, `cron_delete`) totdat het plan is goedgekeurd.

| Parameter | Type   | Vereist | Beschrijving                                                     |
| --------- | ------ | ------- | ---------------------------------------------------------------- |
| `goal`    | string | ja      | Wat de agent van plan is te bouwen/wijzigen                      |
| `scope`   | string | nee     | Verkenning beperken tot specifieke mappen of modules             |

#### `plan_exit`

Planmodus verlaten en het implementatieplan presenteren voor gebruikersgoedkeuring. Begint uitvoering **niet** automatisch.

| Parameter | Type   | Vereist | Beschrijving                                                                         |
| --------- | ------ | ------- | ------------------------------------------------------------------------------------ |
| `plan`    | object | ja      | Het implementatieplan (samenvatting, aanpak, stappen, risico's, bestanden, tests)    |

Het planobject bevat:

- `summary` — Wat het plan bereikt
- `approach` — Hoe het zal worden gedaan
- `alternatives_considered` — Welke andere benaderingen zijn geëvalueerd
- `steps` — Geordende lijst van implementatiestappen, elk met bestanden, afhankelijkheden en verificatie
- `risks` — Bekende risico's en mitigaties
- `files_to_create`, `files_to_modify`, `tests_to_write`
- `estimated_complexity`

#### `plan_status`

Geeft de huidige planmodusstatus terug: actieve modus, doel en planvoortgang.

#### `plan_approve`

Het uitstaande plan goedkeuren en uitvoering beginnen. Aangeroepen wanneer de gebruiker goedkeurt.

#### `plan_reject`

Het uitstaande plan afwijzen en terugkeren naar normale modus.

#### `plan_step_complete`

Een planstap markeren als voltooid tijdens uitvoering.

| Parameter             | Type   | Vereist | Beschrijving                               |
| --------------------- | ------ | ------- | ------------------------------------------ |
| `step_id`             | number | ja      | Het te markeren stap-ID                    |
| `verification_result` | string | ja      | Uitvoer van de verificatieopdracht         |

#### `plan_complete`

Het hele plan markeren als voltooid.

| Parameter    | Type   | Vereist | Beschrijving                              |
| ------------ | ------ | ------- | ----------------------------------------- |
| `summary`    | string | ja      | Wat er is bereikt                         |
| `deviations` | array  | nee     | Wijzigingen ten opzichte van het originele plan |

#### `plan_modify`

Een wijziging aanvragen in een goedgekeurde planstap. Vereist gebruikersgoedkeuring.

| Parameter          | Type   | Vereist | Beschrijving                           |
| ------------------ | ------ | ------- | -------------------------------------- |
| `step_id`          | number | ja      | Welke stap moet worden gewijzigd       |
| `reason`           | string | ja      | Waarom de wijziging nodig is           |
| `new_description`  | string | ja      | Bijgewerkte stapbeschrijving           |
| `new_files`        | array  | nee     | Bijgewerkte bestandslijst              |
| `new_verification` | string | nee     | Bijgewerkte verificatieopdracht        |

### Workflow

```
1. Gebruiker vraagt om iets complexs
2. Agent roept plan_enter({ goal: "..." }) aan
3. Agent verkent codebase (alleen-lezen tools)
4. Agent roept plan_exit({ plan: { ... } }) aan
5. Gebruiker bekijkt het plan
6. Gebruiker keurt goed → agent roept plan_approve aan
   (of wijst af → agent roept plan_reject aan)
7. Agent voert stap voor stap uit, roept plan_step_complete aan na elke stap
8. Agent roept plan_complete aan wanneer klaar
```

### Wanneer planmodus te gebruiken

De agent betreedt planmodus voor complexe taken: functies bouwen, systemen refactoren, multi-bestand wijzigingen implementeren. Voor eenvoudige taken (een typefout corrigeren, een variabele hernoemen) slaat het planmodus over en handelt het direct.

## Todo-tracering

De agent heeft een persistent todo-lijst voor het bijhouden van meerstapswerk over sessies heen.

### Tools

#### `todo_read`

De huidige todo-lijst lezen. Geeft alle items terug met hun ID, inhoud, status, prioriteit en tijdstempels.

#### `todo_write`

De volledige todo-lijst vervangen. Dit is een volledige vervanging, geen gedeeltelijke update.

| Parameter | Type  | Vereist | Beschrijving                         |
| --------- | ----- | ------- | ------------------------------------ |
| `todos`   | array | ja      | Volledige lijst van todo-items       |

Elk todo-item heeft:

| Veld         | Type   | Waarden                                       |
| ------------ | ------ | --------------------------------------------- |
| `id`         | string | Unieke identificatie                          |
| `content`    | string | Taakbeschrijving                              |
| `status`     | string | `pending`, `in_progress`, `completed`         |
| `priority`   | string | `high`, `medium`, `low`                       |
| `created_at` | string | ISO-tijdstempel                               |
| `updated_at` | string | ISO-tijdstempel                               |

### Gedrag

- Todo's zijn per-agent bereikt (niet per-sessie) — ze blijven bewaard over sessies, trigger-wakeups en herstarten heen
- De agent gebruikt todo's alleen voor echte complexe taken (3+ afzonderlijke stappen)
- Één taak is tegelijk `in_progress`; voltooide items worden onmiddellijk gemarkeerd
- Wanneer de agent een nieuwe lijst schrijft die eerder opgeslagen items weglaat, worden die items automatisch bewaard als `completed`
- Wanneer alle items `completed` zijn, worden oude items niet bewaard (schone lei)

### Weergave

Todo's worden weergegeven in zowel de CLI als Tidepool:

- **CLI** — Gestylede ANSI-box met statuspictogrammen: `✓` (voltooid, doorgestreept), `▶` (bezig, vet), `○` (uitstaand)
- **Tidepool** — HTML-lijst met CSS-klassen voor elke status
