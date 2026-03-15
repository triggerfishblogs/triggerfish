---
title: Workflow DSL-referentie
description: Volledige referentie voor de CNCF Serverless Workflow DSL 1.0 zoals geïmplementeerd in Triggerfish.
---

# Workflow DSL-referentie

Volledige referentie voor de CNCF Serverless Workflow DSL 1.0 zoals geïmplementeerd in de workflow-engine van Triggerfish. Zie voor een gebruikshandleiding en voorbeelden [Workflows](/nl-NL/features/workflows).

## Documentstructuur

Elke workflow-YAML moet een `document`-veld op het hoogste niveau en een `do`-blok hebben.

```yaml
document:
  dsl: "1.0"
  namespace: my-namespace
  name: my-workflow
  version: "1.0.0"            # optional
  description: "What it does"  # optional
classification_ceiling: INTERNAL  # optional
input:                            # optional
  from: "${ . }"
output:                           # optional
  from:
    result: "${ .final_step }"
timeout:                          # optional
  after: PT5M
do:
  - task_name:
      # task definition
```

### Documentmetadata

| Veld          | Type   | Vereist | Beschrijving                                   |
| ------------- | ------ | ------- | ---------------------------------------------- |
| `dsl`         | string | ja      | DSL-versie. Moet `"1.0"` zijn                  |
| `namespace`   | string | ja      | Logische groepering (bijv. `ops`, `reports`)   |
| `name`        | string | ja      | Unieke workflownaam binnen de namespace        |
| `version`     | string | nee     | Semantische versietekenreeks                   |
| `description` | string | nee     | Leesbare beschrijving                          |

### Velden op het hoogste niveau

| Veld                      | Type         | Vereist | Beschrijving                                        |
| ------------------------- | ------------ | ------- | --------------------------------------------------- |
| `document`                | object       | ja      | Documentmetadata (zie hierboven)                    |
| `do`                      | array        | ja      | Geordende lijst van taakvermeldingen                |
| `classification_ceiling`  | string       | nee     | Maximale toegestane sessietaint tijdens uitvoering  |
| `input`                   | transformatie | nee    | Transformatie toegepast op workflowinvoer           |
| `output`                  | transformatie | nee    | Transformatie toegepast op workflowuitvoer          |
| `timeout`                 | object       | nee     | Time-out op workflowniveau (`after: <ISO 8601>`)    |
| `metadata`                | object       | nee     | Willekeurige sleutel-waarde-metadata                |

---

## Taakvermeldingsformaat

Elke vermelding in het `do`-blok is een object met één sleutel. De sleutel is de taaknaam, de waarde is de taakdefinitie.

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

Taaknamen moeten uniek zijn binnen hetzelfde `do`-blok. Het taakresultaat wordt opgeslagen in de datacontext onder de taaknaam.

---

## Gemeenschappelijke taakvelden

Alle taaktypen delen deze optionele velden:

| Veld       | Type         | Beschrijving                                                   |
| ---------- | ------------ | -------------------------------------------------------------- |
| `if`       | string       | Expressievoorwaarde. Taak wordt overgeslagen als onwaar.       |
| `input`    | transformatie | Transformatie toegepast vóór taakuitvoering                   |
| `output`   | transformatie | Transformatie toegepast na taakuitvoering                     |
| `timeout`  | object       | Taak-time-out: `after: <ISO 8601-duur>`                        |
| `then`     | string       | Stroomrichtlijn: `continue`, `end` of een taaknaam            |
| `metadata` | object       | Willekeurige sleutel-waarde-metadata. Wanneer zelfherstel is ingeschakeld, vereist `description`, `expects`, `produces`. |

---

## Zelfherstelconfiguratie

Het `metadata.triggerfish.self_healing`-blok schakelt een autonome herstelagent voor de workflow in. Zie [Zelfherstel](/nl-NL/features/workflows#zelfherstel) voor een volledige handleiding.

```yaml
metadata:
  triggerfish:
    self_healing:
      enabled: true
      retry_budget: 3
      approval_required: true
      pause_on_intervention: blocking_only
      pause_timeout_seconds: 300
      pause_timeout_policy: escalate_and_halt
      notify_on: [intervention, escalation, approval_required]
```

| Veld                    | Type    | Vereist | Standaard             | Beschrijving |
| ----------------------- | ------- | ------- | --------------------- | ------------ |
| `enabled`               | boolean | ja      | —                     | De herstelagent inschakelen |
| `retry_budget`          | number  | nee     | `3`                   | Max interventiepogingen |
| `approval_required`     | boolean | nee     | `true`                | Menselijke goedkeuring vereisen voor fixes |
| `pause_on_intervention` | string  | nee     | `"blocking_only"`     | `always` \| `never` \| `blocking_only` |
| `pause_timeout_seconds` | number  | nee     | `300`                 | Seconden vóór time-outbeleid activeert |
| `pause_timeout_policy`  | string  | nee     | `"escalate_and_halt"` | `escalate_and_halt` \| `escalate_and_skip` \| `escalate_and_fail` |
| `notify_on`             | array   | nee     | `[]`                  | `intervention` \| `escalation` \| `approval_required` |

### Stapmetadata (vereist wanneer zelfherstel is ingeschakeld)

Wanneer `self_healing.enabled` `true` is, moet elke taak deze metadatavelden bevatten. De parser weigert workflows waarbij een van deze velden ontbreekt.

| Veld          | Type   | Beschrijving                                   |
| ------------- | ------ | ---------------------------------------------- |
| `description` | string | Wat de stap doet en waarom                     |
| `expects`     | string | Invoervorm of benodigde voorwaarden            |
| `produces`    | string | Gegenereerde uitvoervorm                       |

```yaml
- fetch-invoices:
    call: http
    with:
      endpoint: "https://api.example.com/invoices"
    metadata:
      description: "Fetch open invoices from billing API"
      expects: "API available, returns JSON array"
      produces: "Array of {id, amount, status} objects"
```

---

## Taaktypen

### `call`

Verzenden naar een HTTP-eindpunt of Triggerfish-service.

| Veld   | Type   | Vereist | Beschrijving                                        |
| ------ | ------ | ------- | --------------------------------------------------- |
| `call` | string | ja      | Aanroeptype (zie verzendtabel hieronder)             |
| `with` | object | nee     | Argumenten doorgegeven aan de doeltool              |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

Een shell-opdracht, inline script of subworkflow uitvoeren. Het `run`-veld moet precies één van `shell`, `script` of `workflow` bevatten.

**Shell:**

| Veld                   | Type   | Vereist | Beschrijving              |
| ---------------------- | ------ | ------- | ------------------------- |
| `run.shell.command`    | string | ja      | Uit te voeren shell-opdracht |
| `run.shell.arguments`  | object | nee     | Benoemde argumenten       |
| `run.shell.environment`| object | nee     | Omgevingsvariabelen       |

**Script:**

| Veld                   | Type   | Vereist | Beschrijving              |
| ---------------------- | ------ | ------- | ------------------------- |
| `run.script.language`  | string | ja      | Scripttaal                |
| `run.script.code`      | string | ja      | Inline scriptcode         |
| `run.script.arguments` | object | nee     | Benoemde argumenten       |

**Subworkflow:**

| Veld                   | Type   | Vereist | Beschrijving                    |
| ---------------------- | ------ | ------- | ------------------------------- |
| `run.workflow.name`    | string | ja      | Naam van de opgeslagen workflow  |
| `run.workflow.version` | string | nee     | Versiebeperking                 |
| `run.workflow.input`   | object | nee     | Invoergegevens voor subworkflow  |

### `set`

Waarden toewijzen aan de datacontext.

| Veld  | Type   | Vereist | Beschrijving                                          |
| ----- | ------ | ------- | ----------------------------------------------------- |
| `set` | object | ja      | Sleutel-waardeparen om toe te wijzen. Waarden kunnen expressies zijn. |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

Voorwaardelijke vertakking. Het `switch`-veld is een array van case-vermeldingen. Elke case is een object met één sleutel waarbij de sleutel de casenaam is.

| Caseveld | Type   | Vereist | Beschrijving                                         |
| -------- | ------ | ------- | ---------------------------------------------------- |
| `when`   | string | nee     | Expressievoorwaarde. Weglaten voor standaardcase.    |
| `then`   | string | ja      | Stroomrichtlijn: `continue`, `end` of taaknaam       |

Cases worden in volgorde geëvalueerd. De eerste case met een ware `when` (of zonder `when`) wordt genomen.

```yaml
- route:
    switch:
      - high:
          when: "${ .priority > 7 }"
          then: alert_team
      - low:
          then: log_only
```

### `for`

Itereren over een verzameling.

| Veld       | Type   | Vereist | Beschrijving                                    |
| ---------- | ------ | ------- | ----------------------------------------------- |
| `for.each` | string | ja      | Variabelenaam voor het huidige item             |
| `for.in`   | string | ja      | Expressie die verwijst naar de verzameling      |
| `for.at`   | string | nee     | Variabelenaam voor de huidige index             |
| `do`       | array  | ja      | Geneste takenlijst uitgevoerd voor elke iteratie |

```yaml
- process_all:
    for:
      each: item
      in: "${ .items }"
      at: idx
    do:
      - handle:
          call: triggerfish:llm
          with:
            task: "Process item ${ .idx }: ${ .item.name }"
```

### `raise`

De workflow stoppen met een gestructureerde fout.

| Veld                 | Type   | Vereist | Beschrijving            |
| -------------------- | ------ | ------- | ----------------------- |
| `raise.error.status` | number | ja      | HTTP-stijl statuscode   |
| `raise.error.type`   | string | ja      | Fouttype URI/string     |
| `raise.error.title`  | string | ja      | Leesbare titel          |
| `raise.error.detail` | string | nee     | Gedetailleerde foutmelding |

```yaml
- abort:
    raise:
      error:
        status: 422
        type: "validation-error"
        title: "Invalid input"
        detail: "Field 'email' is required"
```

### `emit`

Een workflowgebeurtenis registreren. Gebeurtenissen worden opgeslagen in het uitvoeringsresultaat.

| Veld                 | Type   | Vereist | Beschrijving                |
| -------------------- | ------ | ------- | --------------------------- |
| `emit.event.type`    | string | ja      | Gebeurtenistypeidentificatie |
| `emit.event.source`  | string | nee     | Gebeurtenisbron URI         |
| `emit.event.data`    | object | nee     | Gebeurtenispayload          |

```yaml
- record:
    emit:
      event:
        type: "step.completed"
        source: "workflow/pipeline"
        data:
          step: "transform"
          duration_ms: 1200
```

### `wait`

Uitvoering pauzeren voor een duur.

| Veld   | Type   | Vereist | Beschrijving                          |
| ------ | ------ | ------- | ------------------------------------- |
| `wait` | string | ja      | ISO 8601-duur (bijv. `PT5S`)          |

Veel voorkomende duurwaarden: `PT1S` (1 seconde), `PT30S` (30 seconden), `PT1M` (1 minuut), `PT5M` (5 minuten).

---

## Aanroepverzendtabel

Mapt de `call`-veldwaarde naar de Triggerfish-tool die daadwerkelijk wordt aangeroepen.

| `call`-waarde           | Aangedipte tool          | Vereiste `with:`-velden                        |
| ----------------------- | ------------------------ | ---------------------------------------------- |
| `http`                  | `web_fetch`              | `endpoint` of `url`; optioneel `method`, `headers`, `body` |
| `triggerfish:llm`       | `llm_task`               | `prompt` of `task`; optioneel `tools`, `max_iterations` |
| `triggerfish:agent`     | `subagent`               | `prompt` of `task`; optioneel `tools`, `agent` |
| `triggerfish:memory`    | `memory_*`               | `operation` (`save`/`search`/`get`/`list`/`delete`) + bewerkingsvelden |
| `triggerfish:web_search`| `web_search`             | `query`; optioneel `max_results`               |
| `triggerfish:web_fetch` | `web_fetch`              | `url`; optioneel `method`, `headers`, `body`   |
| `triggerfish:mcp`       | `mcp__<server>__<tool>`  | `server`, `tool`; optioneel `arguments`        |
| `triggerfish:message`   | `send_message`           | `channel`, `text`; optioneel `recipient`       |

Niet-ondersteunde CNCF-aanroeptypen (`grpc`, `openapi`, `asyncapi`) retourneren een fout.

---

## Expressiesyntaxis

Expressies worden begrensd door `${ }` en worden opgelost tegen de workflowdatacontext.

### Puntpadresolutie

| Syntaxis                | Beschrijving                       | Voorbeeldresultaat     |
| ----------------------- | ---------------------------------- | ---------------------- |
| `${ . }`                | Volledige datacontext              | `{...}`                |
| `${ .key }`             | Sleutel op het hoogste niveau      | `"value"`              |
| `${ .a.b.c }`           | Geneste sleutel                    | `"deep value"`         |
| `${ .items[0] }`        | Array-index                        | `{...first item...}`   |
| `${ .items[0].name }`   | Array-index dan sleutel            | `"first"`              |

De voorloopstip (of `$.`) verankert het pad aan de contextroot. Paden die worden opgelost naar `undefined` produceren een lege tekenreeks bij interpolatie, of `undefined` als zelfstandige waarde.

### Operatoren

| Type         | Operatoren                   | Voorbeeld                      |
| ------------ | ---------------------------- | ------------------------------ |
| Vergelijking | `==`, `!=`, `>`, `<`, `>=`, `<=` | `${ .count > 0 }`          |
| Rekenkundig  | `+`, `-`, `*`, `/`, `%`      | `${ .price * .quantity }`      |

Vergelijkingsexpressies retourneren `true` of `false`. Rekenkundige expressies retourneren een getal (`undefined` als een operand niet numeriek is of deling door nul).

### Letterlijke waarden

| Type        | Voorbeelden              |
| ----------- | ------------------------ |
| String      | `"hello"`, `'hello'`     |
| Getal       | `42`, `3.14`, `-1`       |
| Booleaans   | `true`, `false`          |
| Null        | `null`                   |

### Interpolatiemodi

**Enkele expressie (ruwe waarde):** Wanneer de gehele tekenreeks één `${ }`-expressie is, wordt de onbewerkte getypte waarde geretourneerd (getal, booleaans, object, array).

```yaml
count: "${ .items.length }"  # returns a number, not a string
```

**Gemengd / meerdere expressies (string):** Wanneer `${ }`-expressies worden gemengd met tekst of er meerdere expressies zijn, is het resultaat altijd een tekenreeks.

```yaml
message: "Found ${ .count } items in ${ .category }"  # returns a string
```

### Waarheidswaarde

Voor `if:`-voorwaarden en `switch` `when:`-expressies worden waarden geëvalueerd met JavaScript-stijl waarheidswaarde:

| Waarde                                                         | Waar? |
| -------------------------------------------------------------- | ----- |
| `true`                                                         | ja    |
| Niet-nul getal                                                 | ja    |
| Niet-lege tekenreeks                                           | ja    |
| Niet-lege array                                                | ja    |
| Object                                                         | ja    |
| `false`, `0`, `""`, `null`, `undefined`, lege array            | nee   |

---

## Invoer-/uitvoertransformaties

Transformaties vormen gegevens die in en uit taken stromen.

### `input`

Toegepast vóór taakuitvoering. Vervangt de weergave van de taak van de datacontext.

```yaml
- step:
    call: http
    input:
      from: "${ .config }"       # task sees only the config object
    with:
      endpoint: "${ .api_url }"  # resolved against the config object
```

**`from` als string:** Expressie die de volledige invoercontext vervangt.

**`from` als object:** Mapt nieuwe sleutels naar expressies:

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

Toegepast na taakuitvoering. Vormt het resultaat opnieuw voordat het wordt opgeslagen in de context onder de taaknaam.

```yaml
- fetch:
    call: http
    output:
      from:
        items: "${ .fetch.data.results }"
        count: "${ .fetch.data.total }"
```

---

## Stroomrichtlijnen

Het `then`-veld op elke taak bepaalt de uitvoeringsstroom nadat de taak is voltooid.

| Waarde         | Gedrag                                                                       |
| -------------- | ---------------------------------------------------------------------------- |
| `continue`     | Ga door naar de volgende taak in de reeks (standaard)                        |
| `end`          | Stop de workflow. Status: `completed`.                                       |
| `<taaknaam>`   | Spring naar de benoemde taak. De taak moet bestaan in hetzelfde `do`-blok.   |

Switch-cases gebruiken ook stroomrichtlijnen in hun `then`-veld.

---

## Classificatieplafond

Optioneel veld dat de maximale sessietaint tijdens uitvoering beperkt.

```yaml
classification_ceiling: INTERNAL
```

| Waarde         | Betekenis                                             |
| -------------- | ----------------------------------------------------- |
| `PUBLIC`       | Workflow stopt als geclassificeerde gegevens worden benaderd |
| `INTERNAL`     | Staat `PUBLIC`- en `INTERNAL`-gegevens toe            |
| `CONFIDENTIAL` | Staat tot `CONFIDENTIAL`-gegevens toe                 |
| `RESTRICTED`   | Staat alle classificatieniveaus toe                   |
| *(weggelaten)* | Geen plafond gehandhaafd                              |

Het plafond wordt vóór elke taak gecontroleerd. Als de sessietaint het plafond heeft overschreden (bijv. omdat een vorige taak geclassificeerde gegevens heeft benaderd), stopt de workflow met status `failed` en fout `Workflow classification ceiling breached`.

---

## Opslag

### Workflowdefinities

Opgeslagen met sleutelprefix `workflows:{name}`. Elke opgeslagen record bevat:

| Veld             | Type   | Beschrijving                                    |
| ---------------- | ------ | ----------------------------------------------- |
| `name`           | string | Workflownaam                                    |
| `yaml`           | string | Ruwe YAML-definitie                             |
| `classification` | string | Classificatieniveau op het moment van opslaan   |
| `savedAt`        | string | ISO 8601-tijdstempel                            |
| `description`    | string | Optionele beschrijving                          |

### Uitvoeringsgeschiedenis

Opgeslagen met sleutelprefix `workflow-runs:{runId}`. Elk uitvoeringsrecord bevat:

| Veld             | Type   | Beschrijving                                         |
| ---------------- | ------ | ---------------------------------------------------- |
| `runId`          | string | UUID voor deze uitvoering                            |
| `workflowName`   | string | Naam van de uitgevoerde workflow                     |
| `status`         | string | `completed`, `failed` of `cancelled`                 |
| `output`         | object | Definitieve datacontext (interne sleutels gefilterd) |
| `events`         | array  | Tijdens uitvoering uitgegeven gebeurtenissen         |
| `error`          | string | Foutmelding (als status `failed` is)                 |
| `startedAt`      | string | ISO 8601-tijdstempel                                 |
| `completedAt`    | string | ISO 8601-tijdstempel                                 |
| `taskCount`      | number | Aantal taken in de workflow                          |
| `classification` | string | Sessietaint bij voltooiing                           |

---

## Limieten

| Limiet                          | Waarde | Beschrijving                                   |
| ------------------------------- | ------ | ---------------------------------------------- |
| Max. diepte subworkflow         | 5      | Maximale nesting van `run.workflow`-aanroepen  |
| Standaardlimiet uitvoeringsgeschiedenis | 10 | Standaard `limit` voor `workflow_history`   |

---

## Uitvoeringsstatussen

| Status      | Beschrijving                                                    |
| ----------- | --------------------------------------------------------------- |
| `pending`   | Workflow is aangemaakt maar nog niet gestart                    |
| `running`   | Workflow wordt momenteel uitgevoerd                             |
| `completed` | Alle taken zijn succesvol voltooid (of `then: end`)             |
| `failed`    | Een taak is mislukt, een `raise` is bereikt, of plafond is overschreden |
| `cancelled` | Uitvoering is extern geannuleerd                               |
