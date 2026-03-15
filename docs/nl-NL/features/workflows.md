---
title: Workflows
description: Automatiseer meerstapstaken met de ingebouwde CNCF Serverless Workflow DSL-engine van Triggerfish.
---

# Workflows

Triggerfish bevat een ingebouwde uitvoeringsengine voor de
[CNCF Serverless Workflow DSL 1.0](https://github.com/serverlessworkflow/specification).
Met workflows kunt u deterministische, meerstapsautomatiseringen in YAML definiëren die **zonder de LLM in de lus** worden uitgevoerd. De agent maakt en start workflows, maar de engine verzorgt de feitelijke taakverzending, vertakking, herhaling en gegevensstroom.

## Wanneer workflows te gebruiken

**Gebruik workflows** voor herhaalbare, deterministische reeksen waarbij u de stappen van tevoren kent: gegevens ophalen van een API, transformeren, opslaan in geheugen, een melding verzenden. Dezelfde invoer produceert altijd dezelfde uitvoer.

**Gebruik de agent direct** voor open redenering, verkenning of taken waarbij de volgende stap afhankelijk is van beoordelingsvermogen: een onderwerp onderzoeken, code schrijven, een probleem oplossen.

Een goede vuistregel: als u de agent herhaaldelijk dezelfde meerstapsreeks laat uitvoeren, maak er dan een workflow van.

::: info Beschikbaarheid
Workflows zijn beschikbaar op alle abonnementen. Gebruikers van de open-source versie met eigen API-sleutels hebben volledige toegang tot de workflow-engine — elke `triggerfish:llm`- of `triggerfish:agent`-aanroep binnen een workflow verbruikt inferentie van uw geconfigureerde provider.
:::

## Tools

### `workflow_save`

Een workflowdefinitie parsen, valideren en opslaan. De workflow wordt opgeslagen op het classificatieniveau van de huidige sessie.

| Parameter     | Type   | Vereist | Beschrijving                          |
| ------------- | ------ | ------- | ------------------------------------- |
| `name`        | string | ja      | Naam voor de workflow                 |
| `yaml`        | string | ja      | YAML-workflowdefinitie                |
| `description` | string | nee     | Wat de workflow doet                  |

### `workflow_run`

Een workflow uitvoeren op naam of vanuit inline YAML. Geeft de uitvoeringsuitvoer en -status terug.

| Parameter | Type   | Vereist | Beschrijving                                              |
| --------- | ------ | ------- | --------------------------------------------------------- |
| `name`    | string | nee     | Naam van een opgeslagen workflow om uit te voeren         |
| `yaml`    | string | nee     | Inline YAML-definitie (wanneer geen opgeslagen wordt gebruikt) |
| `input`   | string | nee     | JSON-string met invoergegevens voor de workflow           |

`name` of `yaml` is vereist.

### `workflow_list`

Alle opgeslagen workflows weergeven die toegankelijk zijn op het huidige classificatieniveau. Vereist geen parameters.

### `workflow_get`

Een opgeslagen workflowdefinitie ophalen op naam.

| Parameter | Type   | Vereist | Beschrijving                       |
| --------- | ------ | ------- | ---------------------------------- |
| `name`    | string | ja      | Naam van de op te halen workflow   |

### `workflow_delete`

Een opgeslagen workflow verwijderen op naam. De workflow moet toegankelijk zijn op het classificatieniveau van de huidige sessie.

| Parameter | Type   | Vereist | Beschrijving                          |
| --------- | ------ | ------- | ------------------------------------- |
| `name`    | string | ja      | Naam van de te verwijderen workflow   |

### `workflow_history`

Eerdere workflowuitvoeringsresultaten bekijken, optioneel gefilterd op workflownaam.

| Parameter       | Type   | Vereist | Beschrijving                                  |
| --------------- | ------ | ------- | --------------------------------------------- |
| `workflow_name` | string | nee     | Resultaten filteren op workflownaam           |
| `limit`         | string | nee     | Maximum aantal resultaten (standaard 10)      |

## Taaktypen

Workflows zijn samengesteld uit taken in een `do:`-blok. Elke taak is een benoemde vermelding met een typespecifiek lichaam. Triggerfish ondersteunt 8 taaktypen.

### `call` — Externe aanroepen

Verzenden naar HTTP-eindpunten of Triggerfish-services.

```yaml
- fetch_issue:
    call: http
    with:
      endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
      method: GET
      headers:
        Authorization: "Bearer ${ .github_token }"
```

Het `call`-veld bepaalt het verzendingsdoel. Zie [Aanroepondersteuning](#aanroepondersteuning) voor de volledige mapping.

### `run` — Shell, script of subworkflow

Een shell-opdracht, een inline script of een andere opgeslagen workflow uitvoeren.

**Shell-opdracht:**

```yaml
- list_files:
    run:
      shell:
        command: "ls -la /tmp/workspace"
```

**Subworkflow:**

```yaml
- cleanup:
    run:
      workflow:
        name: cleanup-temp-files
        input:
          directory: "${ .workspace }"
```

::: warning
Shell- en scriptuitvoering vereist dat de vlag `allowShellExecution` is ingeschakeld in de werkcontext van de workflowtool. Als dit is uitgeschakeld, mislukken `run`-taken met `shell`- of `script`-doelen.
:::

### `set` — Datacontextmutaties

Waarden toewijzen aan de datacontext van de workflow. Ondersteunt expressies.

```yaml
- prepare_prompt:
    set:
      summary_prompt: "Summarize the following GitHub issue: ${ .fetch_issue.title } — ${ .fetch_issue.body }"
      issue_url: "https://github.com/${ .repo }/issues/${ .issue_number }"
```

### `switch` — Voorwaardelijke vertakking

Vertakken op basis van voorwaarden. Elke case heeft een `when`-expressie en een `then`-stroomrichtlijn. Een case zonder `when` fungeert als standaard.

```yaml
- check_priority:
    switch:
      - high_priority:
          when: "${ .fetch_issue.labels }"
          then: notify_team
      - default:
          then: continue
```

### `for` — Iteratie

Herhalen over een verzameling, waarbij een genest `do:`-blok voor elk item wordt uitgevoerd.

```yaml
- process_items:
    for:
      each: item
      in: "${ .items }"
      at: index
    do:
      - log_item:
          set:
            current: "${ .item }"
```

Het `each`-veld benoemt de lusvariabele, `in` verwijst naar de verzameling, en het optionele `at`-veld geeft de huidige index.

### `raise` — Stoppen met fout

Uitvoering stoppen met een gestructureerde fout.

```yaml
- fail_if_missing:
    if: "${ .result == null }"
    raise:
      error:
        status: 404
        type: "not-found"
        title: "Resource not found"
        detail: "The requested item does not exist"
```

### `emit` — Gebeurtenissen registreren

Een workflowgebeurtenis registreren. Gebeurtenissen worden vastgelegd in het uitvoeringsresultaat en kunnen worden bekeken via `workflow_history`.

```yaml
- log_completion:
    emit:
      event:
        type: "issue.summarized"
        source: "workflow/summarize-issue"
        data:
          issue_number: "${ .issue_number }"
          summary_length: "${ .summary.length }"
```

### `wait` — Slapen

Uitvoering pauzeren voor een ISO 8601-duur.

```yaml
- rate_limit_pause:
    wait: PT2S
```

## Aanroepondersteuning

Het `call`-veld in een aanroeptaak bepaalt welke Triggerfish-tool wordt aangeroepen.

| Aanroeptype              | Triggerfish-tool        | Vereiste `with:`-velden                        |
| ------------------------ | ----------------------- | ---------------------------------------------- |
| `http`                   | `web_fetch`             | `endpoint` (of `url`), `method`                |
| `triggerfish:llm`        | `llm_task`              | `prompt` (of `task`)                           |
| `triggerfish:agent`      | `subagent`              | `prompt` (of `task`)                           |
| `triggerfish:memory`     | `memory_*`              | `operation` + operatiespecifieke velden        |
| `triggerfish:web_search` | `web_search`            | `query`                                        |
| `triggerfish:web_fetch`  | `web_fetch`             | `url`                                          |
| `triggerfish:mcp`        | `mcp__<server>__<tool>` | `server`, `tool`, `arguments`                  |
| `triggerfish:message`    | `send_message`          | `channel`, `text`                              |

**Geheugenbewerkingen:** Het aanroeptype `triggerfish:memory` vereist een `operation`-veld ingesteld op `save`, `search`, `get`, `list` of `delete`. De overige `with:`-velden worden direct doorgegeven aan de bijbehorende geheugentool.

```yaml
- save_summary:
    call: triggerfish:memory
    with:
      operation: save
      content: "${ .summary }"
      tags: ["github", "issue-summary"]
```

**MCP-aanroepen:** Het aanroeptype `triggerfish:mcp` routeert naar elke verbonden MCP-servertool. Geef de `server`-naam, `tool`-naam en het `arguments`-object op.

```yaml
- run_lint:
    call: triggerfish:mcp
    with:
      server: eslint
      tool: lint-files
      arguments:
        paths: ["src/"]
```

## Expressies

Workflowexpressies gebruiken de `${ }`-syntaxis met puntpadresolutie tegen de datacontext van de workflow.

```yaml
# Simple value reference
url: "${ .config.api_url }"

# Array indexing
first_item: "${ .results[0].name }"

# String interpolation (multiple expressions in one string)
message: "Found ${ .count } issues in ${ .repo }"

# Comparison (returns boolean)
if: "${ .status == 'open' }"

# Arithmetic
total: "${ .price * .quantity }"
```

**Ondersteunde operatoren:**

- Vergelijking: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Rekenkundig: `+`, `-`, `*`, `/`, `%`

**Letterlijke waarden:** String (`"value"` of `'value'`), getal (`42`, `3.14`), booleaans (`true`, `false`), null (`null`).

Wanneer een `${ }`-expressie de volledige waarde is, blijft het ruwe type behouden (getal, booleaans, object). Wanneer gemengd met tekst is het resultaat altijd een string.

## Volledig voorbeeld

Deze workflow haalt een GitHub-issue op, vat het samen met de LLM, slaat de samenvatting op in geheugen en verstuurt een melding.

```yaml
document:
  dsl: "1.0"
  namespace: examples
  name: summarize-github-issue
  version: "1.0.0"
  description: Fetch a GitHub issue, summarize it, and notify the team.
classification_ceiling: INTERNAL
do:
  - fetch_issue:
      call: http
      with:
        endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
        method: GET
        headers:
          Authorization: "Bearer ${ .github_token }"
          Accept: application/vnd.github+json
  - prepare_context:
      set:
        issue_title: "${ .fetch_issue.title }"
        issue_body: "${ .fetch_issue.body }"
  - summarize:
      call: triggerfish:llm
      with:
        task: "Summarize this GitHub issue in 2-3 sentences:\n\nTitle: ${ .issue_title }\n\nBody: ${ .issue_body }"
  - save_to_memory:
      call: triggerfish:memory
      with:
        operation: save
        content: "Issue #${ .issue_number } (${ .issue_title }): ${ .summarize }"
        tags: ["github", "issue-summary", "${ .repo }"]
  - notify:
      call: triggerfish:message
      with:
        channel: telegram
        text: "Issue #${ .issue_number } summarized: ${ .summarize }"
```

**Uitvoeren:**

```
workflow_run with name: "summarize-github-issue" and input:
  {"repo": "myorg/myrepo", "issue_number": 42, "github_token": "ghp_..."}
```

## Invoer- en uitvoertransformaties

Taken kunnen hun invoer transformeren vóór uitvoering en hun uitvoer vóór het opslaan van resultaten.

```yaml
- fetch_data:
    call: http
    with:
      endpoint: "${ .api_url }"
    input:
      from: "${ .config }"
    output:
      from:
        items: "${ .fetch_data.data.results }"
        total: "${ .fetch_data.data.count }"
```

- **`input.from`** — Expressie of objectmapping die de invoercontext van de taak vervangt vóór uitvoering.
- **`output.from`** — Expressie of objectmapping die het taakresultaat hervormt vóór opslag in de datacontext.

## Stroombesturing

Elke taak kan een `then`-richtlijn bevatten die bepaalt wat er daarna gebeurt:

- **`continue`** (standaard) — ga door naar de volgende taak in de reeks
- **`end`** — stop de workflow onmiddellijk (status: voltooid)
- **Benoemde taak** — spring naar een specifieke taak op naam

```yaml
- validate:
    switch:
      - invalid:
          when: "${ .input.email == null }"
          then: handle_error
      - valid:
          then: continue
- process:
    call: triggerfish:llm
    with:
      task: "Process ${ .input.email }"
    then: end
- handle_error:
    raise:
      error:
        status: 400
        type: "validation-error"
        title: "Missing email"
```

## Voorwaardelijke uitvoering

Elke taak kan een `if`-veld bevatten. De taak wordt overgeslagen wanneer de voorwaarde als onwaar wordt beoordeeld.

```yaml
- send_alert:
    if: "${ .severity == 'critical' }"
    call: triggerfish:message
    with:
      channel: telegram
      text: "CRITICAL: ${ .alert_message }"
```

## Subworkflows

Een `run`-taak met een `workflow`-doel voert een andere opgeslagen workflow uit. De subworkflow draait met zijn eigen context en geeft zijn uitvoer terug aan de bovenliggende workflow.

```yaml
- enrich_data:
    run:
      workflow:
        name: data-enrichment-pipeline
        input:
          raw_data: "${ .fetched_data }"
```

Subworkflows kunnen tot **5 niveaus diep** worden genest. Het overschrijden van deze limiet produceert een fout en stopt de uitvoering.

## Classificatie en beveiliging

Workflows nemen deel aan hetzelfde classificatiesysteem als alle andere Triggerfish-gegevens.

**Opslagclassificatie.** Wanneer u een workflow opslaat met `workflow_save`, wordt deze opgeslagen op het taint-niveau van de huidige sessie. Een workflow die is opgeslagen tijdens een `CONFIDENTIAL`-sessie kan alleen worden geladen door sessies op `CONFIDENTIAL` of hoger.

**Classificatieplafond.** Workflows kunnen een `classification_ceiling` declareren in hun YAML. Vóór elke taakuitvoering controleert de engine of de huidige taint van de sessie het plafond niet overschrijdt. Als de sessietaint tijdens de uitvoering het plafond overstijgt (bijv. door toegang tot geclassificeerde gegevens via een toolaanroep), stopt de workflow met een plafondoverschrijdingsfout.

```yaml
classification_ceiling: INTERNAL
```

Geldige waarden: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

**Uitvoeringsgeschiedenis.** Uitvoeringsresultaten worden opgeslagen met de classificatie van de sessie op het moment van voltooiing. `workflow_history` filtert resultaten op `canFlowTo`, zodat u alleen uitvoeringen ziet die op of onder uw huidige sessietaint liggen.

::: danger BEVEILIGING
Voor het verwijderen van een workflow moet de workflow toegankelijk zijn op het classificatieniveau van uw huidige sessie. U kunt een workflow die is opgeslagen op `CONFIDENTIAL`-niveau niet verwijderen vanuit een `PUBLIC`-sessie. De `workflow_delete`-tool laadt de workflow eerst en retourneert "niet gevonden" als de classificatiecontrole mislukt.
:::

## Zelfherstel

Workflows kunnen optioneel beschikken over een autonome herstelagent die de uitvoering in realtime bewaakt, fouten diagnosticeert en oplossingen voorstelt. Wanneer zelfherstel is ingeschakeld, wordt een leidende agent naast de workflowuitvoering gespawnd. Deze observeert elke stapgebeurtenis, triageert fouten en coördineert specialistenteams om problemen op te lossen.

### Zelfherstel inschakelen

Voeg een `self_healing`-blok toe aan de `metadata.triggerfish`-sectie van de workflow:

```yaml
document:
  dsl: "1.0"
  namespace: ops
  name: data-pipeline
metadata:
  triggerfish:
    self_healing:
      enabled: true
      retry_budget: 3
      approval_required: true
      pause_on_intervention: blocking_only
do:
  - fetch-data:
      call: http
      with:
        endpoint: "https://api.example.com/data"
      metadata:
        description: "Fetch raw invoice data from billing API"
        expects: "API returns JSON array of invoice objects"
        produces: "Array of {id, amount, status, date} objects"
```

Wanneer `enabled: true` is ingesteld, **moet** elke stap drie metadatavelden bevatten:

| Veld          | Beschrijving                                             |
| ------------- | -------------------------------------------------------- |
| `description` | Wat de stap doet en waarom hij bestaat                   |
| `expects`     | Invoervorm of voorwaarden die de stap nodig heeft        |
| `produces`    | Uitvoervorm die de stap genereert                        |

De parser weigert workflows waarbij een stap deze velden mist.

### Configuratieopties

| Optie                     | Type    | Standaard             | Beschrijving |
| ------------------------- | ------- | --------------------- | ------------ |
| `enabled`                 | boolean | —                     | Vereist. Schakelt de herstelagent in. |
| `retry_budget`            | number  | `3`                   | Maximum aantal interventiepogingen vóór escalatie als onoplosbaar. |
| `approval_required`       | boolean | `true`                | Of voorgestelde workflowcorrecties menselijke goedkeuring vereisen. |
| `pause_on_intervention`   | string  | `"blocking_only"`     | Wanneer stroomafwaartse taken worden gepauzeerd: `always`, `never` of `blocking_only`. |
| `pause_timeout_seconds`   | number  | `300`                 | Seconden te wachten tijdens een pauze voordat het time-outbeleid activeert. |
| `pause_timeout_policy`    | string  | `"escalate_and_halt"` | Wat er bij time-out gebeurt: `escalate_and_halt`, `escalate_and_skip` of `escalate_and_fail`. |
| `notify_on`               | array   | `[]`                  | Gebeurtenissen die meldingen activeren: `intervention`, `escalation`, `approval_required`. |

### Hoe het werkt

1. **Observatie.** De herstelleidende agent ontvangt een realtime stroom van stapgebeurtenissen (gestart, voltooid, mislukt, overgeslagen) terwijl de workflow wordt uitgevoerd.

2. **Triage.** Wanneer een stap mislukt, triageert de leidende agent de fout in een van vijf categorieën:

   | Categorie             | Betekenis                                                       |
   | --------------------- | --------------------------------------------------------------- |
   | `transient_retry`     | Tijdelijk probleem (netwerkfout, snelheidslimiet, 503)          |
   | `runtime_workaround`  | Onbekende fout voor het eerst, mogelijk te omzeilen             |
   | `structural_fix`      | Terugkerende fout die een wijziging in de workflowdefinitie vereist |
   | `plugin_gap`          | Authenticatie-/inloggegevensprobleem waarvoor een nieuwe integratie nodig is |
   | `unresolvable`        | Retrybudget uitgeput of fundamenteel defect                     |

3. **Specialistenteams.** Op basis van de triagebeoordeling spawnt de leidende agent een team van specialistenagents (diagnosticus, retry-coördinator, definitiereparateur, pluginauteur, enz.) om het probleem te onderzoeken en op te lossen.

4. **Versievoorstellen.** Wanneer een structurele correctie nodig is, stelt het team een nieuwe workflowversie voor. Als `approval_required` is ingesteld op true, wacht het voorstel op menselijke beoordeling via `workflow_version_approve` of `workflow_version_reject`.

5. **Gerichte pauze.** Wanneer `pause_on_intervention` is ingeschakeld, worden alleen stroomafwaartse taken gepauzeerd — onafhankelijke takken blijven gewoon draaien.

### Hersteltools

Vier aanvullende tools zijn beschikbaar voor het beheren van herstelstatus:

| Tool                       | Beschrijving                                           |
| -------------------------- | ------------------------------------------------------ |
| `workflow_version_list`    | Voorgestelde/goedgekeurde/afgewezen versies weergeven  |
| `workflow_version_approve` | Een voorgestelde versie goedkeuren                     |
| `workflow_version_reject`  | Een voorgestelde versie afwijzen met reden             |
| `workflow_healing_status`  | Huidige herstelstatus voor een workflowuitvoering      |

### Beveiliging

- De herstelagent **kan zijn eigen `self_healing`-configuratie niet wijzigen**. Voorgestelde versies die de configuratie aanpassen worden geweigerd.
- De leidende agent en alle teamleden erven het taint-niveau van de workflow en escaleren gelijklopend.
- Alle agentacties doorlopen de standaard beleidshook-keten — geen uitzonderingen.
- Voorgestelde versies worden opgeslagen op het classificatieniveau van de workflow.
