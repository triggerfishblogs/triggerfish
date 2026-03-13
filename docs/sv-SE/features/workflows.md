---
title: Arbetsflöden
description: Automatisera flerstegsuppgifter med den inbyggda CNCF Serverless Workflow DSL-motorn i Triggerfish.
---

# Arbetsflöden

Triggerfish inkluderar en inbyggd exekveringsmotor för [CNCF Serverless Workflow DSL 1.0](https://github.com/serverlessworkflow/specification). Arbetsflöden låter dig definiera deterministiska, flerstegsautomatiseringar i YAML som körs **utan LLM:en i loopen** under exekvering. Agenten skapar och utlöser arbetsflöden, men motorn hanterar faktisk uppgiftsutskick, förgrening, loopning och dataflöde.

## När man ska använda arbetsflöden

**Använd arbetsflöden** för upprepningsbara, deterministiska sekvenser där du känner till stegen i förväg: hämta data från ett API, transformera det, spara till minnet, skicka en notifiering. Samma indata producerar alltid samma utdata.

**Använd agenten direkt** för öppet resonerande, utforskning eller uppgifter där nästa steg beror på bedömning: undersöka ett ämne, skriva kod, felsöka ett problem.

En bra tumregel: om du finner dig be agenten göra samma flerestegsssekvens upprepade gånger, gör det till ett arbetsflöde.

::: info Tillgänglighet
Arbetsflöden är tillgängliga på alla planer. Användare med öppen källkod som kör egna API-nycklar har full åtkomst till arbetsflödesmotorn — varje `triggerfish:llm`- eller `triggerfish:agent`-anrop inom ett arbetsflöde konsumerar inferens från din konfigurerade leverantör.
:::

## Verktyg

### `workflow_save`

Tolka, validera och lagra en arbetsflödesdefinition. Arbetsflödet sparas vid den aktuella sessionens klassificeringsnivå.

| Parameter     | Typ    | Obligatorisk | Beskrivning                         |
| ------------- | ------ | ------------ | ----------------------------------- |
| `name`        | string | Ja           | Namn för arbetsflödet               |
| `yaml`        | string | Ja           | YAML-arbetsflödesdefinition         |
| `description` | string | Nej          | Vad arbetsflödet gör                |

### `workflow_run`

Kör ett arbetsflöde med namn eller från inline-YAML. Returnerar exekveringsutdata och status.

| Parameter | Typ    | Obligatorisk | Beskrivning                                                    |
| --------- | ------ | ------------ | -------------------------------------------------------------- |
| `name`    | string | Nej          | Namn på ett sparat arbetsflöde att köra                        |
| `yaml`    | string | Nej          | Inline-YAML-definition (när inte ett sparat används)           |
| `input`   | string | Nej          | JSON-sträng av indata för arbetsflödet                         |

Antingen `name` eller `yaml` krävs.

### `workflow_list`

Lista alla sparade arbetsflöden tillgängliga vid den aktuella klassificeringsnivån. Tar inga parametrar.

### `workflow_get`

Hämta en sparad arbetsflödesdefinition med namn.

| Parameter | Typ    | Obligatorisk | Beskrivning                           |
| --------- | ------ | ------------ | ------------------------------------- |
| `name`    | string | Ja           | Namn på arbetsflödet att hämta        |

### `workflow_delete`

Ta bort ett sparat arbetsflöde med namn. Arbetsflödet måste vara tillgängligt vid den aktuella sessionens klassificeringsnivå.

| Parameter | Typ    | Obligatorisk | Beskrivning                          |
| --------- | ------ | ------------ | ------------------------------------ |
| `name`    | string | Ja           | Namn på arbetsflödet att ta bort     |

### `workflow_history`

Visa tidigare arbetsflödesexekveringsresultat, valfritt filtrerade efter arbetsflödesnamn.

| Parameter       | Typ    | Obligatorisk | Beskrivning                                   |
| --------------- | ------ | ------------ | --------------------------------------------- |
| `workflow_name` | string | Nej          | Filtrera resultat efter arbetsflödesnamn       |
| `limit`         | string | Nej          | Maximalt antal resultat (standard 10)          |

## Uppgiftstyper

Arbetsflöden består av uppgifter i ett `do:`-block. Varje uppgift är en namngiven post med ett typspecifikt innehåll. Triggerfish stöder 8 uppgiftstyper.

### `call` — Externa anrop

Utskick till HTTP-endpoints eller Triggerfish-tjänster.

```yaml
- fetch_issue:
    call: http
    with:
      endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
      method: GET
      headers:
        Authorization: "Bearer ${ .github_token }"
```

Fältet `call` avgör utskickets mål. Se [Anropsutskick](#anropsutskick) för fullständig mappning.

### `run` — Shell, skript eller underarbetsflöde

Kör ett shell-kommando, ett inline-skript eller ett annat sparat arbetsflöde.

**Shell-kommando:**

```yaml
- list_files:
    run:
      shell:
        command: "ls -la /tmp/workspace"
```

**Underarbetsflöde:**

```yaml
- cleanup:
    run:
      workflow:
        name: cleanup-temp-files
        input:
          directory: "${ .workspace }"
```

::: warning
Shell- och skriptexekvering kräver att flaggan `allowShellExecution` är aktiverad i arbetsflödets verktygskontext. Om inaktiverad misslyckas run-uppgifter med `shell`- eller `script`-mål.
:::

### `set` — Datakontextmutationer

Tilldela värden till arbetsflödets datakontext. Stöder uttryck.

```yaml
- prepare_prompt:
    set:
      summary_prompt: "Sammanfatta följande GitHub-ärende: ${ .fetch_issue.title } — ${ .fetch_issue.body }"
      issue_url: "https://github.com/${ .repo }/issues/${ .issue_number }"
```

### `switch` — Villkorad förgrening

Förgrena baserat på villkor. Varje fall har ett `when`-uttryck och ett `then`-flödesdirektiv. Ett fall utan `when` fungerar som standard.

```yaml
- check_priority:
    switch:
      - high_priority:
          when: "${ .fetch_issue.labels }"
          then: notify_team
      - default:
          then: continue
```

### `for` — Iteration

Loopa över en samling och köra ett kapslat `do:`-block för varje post.

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

Fältet `each` namnger loopvariabeln, `in` refererar samlingen och det valfria `at`-fältet ger det aktuella indexet.

### `raise` — Avbryt med fel

Stoppa exekvering med ett strukturerat fel.

```yaml
- fail_if_missing:
    if: "${ .result == null }"
    raise:
      error:
        status: 404
        type: "not-found"
        title: "Resurs hittades inte"
        detail: "Det begärda objektet finns inte"
```

### `emit` — Registrera händelser

Registrera en arbetsflödeshändelse. Händelser fångas i körresultatet och kan granskas via `workflow_history`.

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

### `wait` — Vila

Pausa exekvering under en ISO 8601-varaktighet.

```yaml
- rate_limit_pause:
    wait: PT2S
```

## Anropsutskick

Fältet `call` i en anropsuppgift avgör vilket Triggerfish-verktyg som anropas.

| Anropstyp              | Triggerfish-verktyg     | Obligatoriska `with:`-fält                 |
| ---------------------- | ----------------------- | ------------------------------------------ |
| `http`                 | `web_fetch`             | `endpoint` (eller `url`), `method`         |
| `triggerfish:llm`      | `llm_task`              | `prompt` (eller `task`)                    |
| `triggerfish:agent`    | `subagent`              | `prompt` (eller `task`)                    |
| `triggerfish:memory`   | `memory_*`              | `operation` + operationsspecifika fält     |
| `triggerfish:web_search` | `web_search`          | `query`                                    |
| `triggerfish:web_fetch`  | `web_fetch`           | `url`                                      |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`, `arguments`              |
| `triggerfish:message`  | `send_message`          | `channel`, `text`                          |

**Minnesoperationer:** Anropstypen `triggerfish:memory` kräver ett `operation`-fält satt till en av `save`, `search`, `get`, `list` eller `delete`. Återstående `with:`-fält skickas direkt till det motsvarande minnesverktyget.

```yaml
- save_summary:
    call: triggerfish:memory
    with:
      operation: save
      content: "${ .summary }"
      tags: ["github", "issue-summary"]
```

**MCP-anrop:** Anropstypen `triggerfish:mcp` dirigerar till vilket som helst anslutet MCP-serververktyg. Ange `server`-namnen, `tool`-namnen och `arguments`-objektet.

```yaml
- run_lint:
    call: triggerfish:mcp
    with:
      server: eslint
      tool: lint-files
      arguments:
        paths: ["src/"]
```

## Uttryck

Arbetsflödesuttryck använder `${ }`-syntax med punkt-vägsupplösning mot arbetsflödets datakontext.

```yaml
# Enkel värdereferens
url: "${ .config.api_url }"

# Arrayindexering
first_item: "${ .results[0].name }"

# Stränginterpolering (flera uttryck i en sträng)
message: "Hittade ${ .count } ärenden i ${ .repo }"

# Jämförelse (returnerar booleskt)
if: "${ .status == 'open' }"

# Aritmetik
total: "${ .price * .quantity }"
```

**Stödda operatorer:**

- Jämförelse: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Aritmetik: `+`, `-`, `*`, `/`, `%`

**Literaler:** Sträng (`"värde"` eller `'värde'`), tal (`42`, `3.14`), booleskt (`true`, `false`), null (`null`).

När ett `${ }`-uttryck är hela värdet bevaras råtypen (tal, booleskt, objekt). När det blandas med text är resultatet alltid en sträng.

## Komplett exempel

Det här arbetsflödet hämtar ett GitHub-ärende, sammanfattar det med LLM:en, sparar sammanfattningen till minnet och skickar en notifiering.

```yaml
document:
  dsl: "1.0"
  namespace: examples
  name: summarize-github-issue
  version: "1.0.0"
  description: Hämta ett GitHub-ärende, sammanfatta det och meddela teamet.
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
        task: "Sammanfatta det här GitHub-ärendet i 2-3 meningar:\n\nTitel: ${ .issue_title }\n\nInneåll: ${ .issue_body }"
  - save_to_memory:
      call: triggerfish:memory
      with:
        operation: save
        content: "Ärende #${ .issue_number } (${ .issue_title }): ${ .summarize }"
        tags: ["github", "issue-summary", "${ .repo }"]
  - notify:
      call: triggerfish:message
      with:
        channel: telegram
        text: "Ärende #${ .issue_number } sammanfattat: ${ .summarize }"
```

**Kör det:**

```
workflow_run with name: "summarize-github-issue" and input:
  {"repo": "myorg/myrepo", "issue_number": 42, "github_token": "ghp_..."}
```

## Indata- och utdatatransformationer

Uppgifter kan transformera sin indata före exekvering och sin utdata innan resultat lagras.

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

- **`input.from`** — Uttryck eller objektmappning som ersätter uppgiftens inkontext före exekvering.
- **`output.from`** — Uttryck eller objektmappning som omformar uppgiftsresultatet innan det lagras i datakontexten.

## Flödeskontroll

Varje uppgift kan inkludera ett `then`-direktiv som styr vad som händer härnäst:

- **`continue`** (standard) — gå vidare till nästa uppgift i sekvensen
- **`end`** — stoppa arbetsflödet omedelbart (status: slutfört)
- **Namngiven uppgift** — hoppa till en specifik uppgift med namn

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
      task: "Bearbeta ${ .input.email }"
    then: end
- handle_error:
    raise:
      error:
        status: 400
        type: "validation-error"
        title: "E-post saknas"
```

## Villkorad exekvering

Vilken uppgift som helst kan inkludera ett `if`-fält. Uppgiften hoppas över när villkoret utvärderas till falskt.

```yaml
- send_alert:
    if: "${ .severity == 'critical' }"
    call: triggerfish:message
    with:
      channel: telegram
      text: "KRITISK: ${ .alert_message }"
```

## Underarbetsflöden

En `run`-uppgift med ett `workflow`-mål kör ett annat sparat arbetsflöde. Underarbetsflödet körs med sin egen kontext och returnerar sin utdata till föräldern.

```yaml
- enrich_data:
    run:
      workflow:
        name: data-enrichment-pipeline
        input:
          raw_data: "${ .fetched_data }"
```

Underarbetsflöden kan nestlas upp till **5 nivåer djupt**. Om den här gränsen överskrids uppstår ett fel och exekveringen stoppas.

## Klassificering och säkerhet

Arbetsflöden deltar i samma klassificeringssystem som alla andra Triggerfish-data.

**Lagringsklassificering.** När du sparar ett arbetsflöde med `workflow_save` lagras det vid den aktuella sessionens taint-nivå. Ett arbetsflöde sparat under en `CONFIDENTIAL`-session kan bara laddas av sessioner vid `CONFIDENTIAL` eller högre.

**Klassificeringstak.** Arbetsflöden kan deklarera ett `classification_ceiling` i sin YAML. Före varje uppgiftexekvering kontrollerar motorn att sessionens aktuella taint inte överstiger taket. Om sessions-tainten eskalerar förbi taket under exekvering (t.ex. genom att komma åt klassificerad data via ett verkygsanrop) stoppas arbetsflödet med ett takbrottsfel.

```yaml
classification_ceiling: INTERNAL
```

Giltiga värden: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

**Körhistorik.** Exekveringsresultat lagras med sessionens klassificering vid slutförandetidpunkten. `workflow_history` filtrerar resultat efter `canFlowTo`, så du ser bara körningar som är vid eller under din aktuella sessions-taint.

::: danger SÄKERHET
Arbetsflödesborttagning kräver att arbetsflödet är tillgängligt vid din aktuella sessionens klassificeringsnivå. Du kan inte ta bort ett arbetsflöde lagrat vid `CONFIDENTIAL` från en `PUBLIC`-session. Verktyget `workflow_delete` laddar arbetsflödet först och returnerar "hittades inte" om klassificeringskontrollen misslyckas.
:::

## Självläkning

Arbetsflöden kan valfritt ha en autonom läkningsagent som bevakar exekvering i realtid, diagnostiserar fel och föreslår korrigeringar. När självläkning är aktiverat skapas en ledaragent parallellt med arbetsflödeskörningen. Den observerar varje stegshändelse, triagerar fel och koordinerar specialistteam för att lösa problem.

### Aktivera självläkning

Lägg till ett `self_healing`-block i arbetsflödets `metadata.triggerfish`-sektion:

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
        description: "Hämta råfakturedata från billing-API"
        expects: "API returnerar JSON-array av fakturaobjekt"
        produces: "Array av {id, amount, status, date}-objekt"
```

När `enabled: true` **måste** varje steg inkludera tre metadatafält:

| Fält          | Beskrivning                                          |
| ------------- | ---------------------------------------------------- |
| `description` | Vad steget gör och varför det finns                  |
| `expects`     | Indataform eller förvillkor steget behöver           |
| `produces`    | Utdataform steget genererar                          |

Tolken avvisar arbetsflöden där något steg saknar dessa fält.

### Konfigurationsalternativ

| Alternativ                | Typ     | Standard             | Beskrivning |
| ------------------------- | ------- | -------------------- | ----------- |
| `enabled`                 | boolean | —                    | Obligatorisk. Aktiverar läkningsagenten. |
| `retry_budget`            | number  | `3`                  | Maximalt antal interventionsförsök innan eskalering. |
| `approval_required`       | boolean | `true`               | Om föreslagna arbetsflödeskorrigeringar kräver mänskligt godkännande. |
| `pause_on_intervention`   | string  | `"blocking_only"`    | När nedströmsuppgifter pausas: `always`, `never` eller `blocking_only`. |
| `pause_timeout_seconds`   | number  | `300`                | Sekunder att vänta under en paus. |
| `pause_timeout_policy`    | string  | `"escalate_and_halt"`| Vad som händer vid timeout: `escalate_and_halt`, `escalate_and_skip` eller `escalate_and_fail`. |
| `notify_on`               | array   | `[]`                 | Händelser som utlöser notifieringar: `intervention`, `escalation`, `approval_required`. |

### Hur det fungerar

1. **Observation.** Läkningsledaragenten tar emot en realtidsström av stegshändelser (startad, slutförd, misslyckad, hoppat över) när arbetsflödet körs.

2. **Triagering.** När ett steg misslyckas triagerar ledaren felet i en av fem kategorier:

   | Kategori              | Betydelse                                                |
   | --------------------- | -------------------------------------------------------- |
   | `transient_retry`     | Tillfälligt problem (nätverksfel, hastighetsgräns, 503)  |
   | `runtime_workaround`  | Okänt fel första gången, kan kringgås                    |
   | `structural_fix`      | Återkommande fel som behöver en arbetsflödesändring      |
   | `plugin_gap`          | Auth/autentiseringsproblem som kräver en ny integration  |
   | `unresolvable`        | Återförsöksbudgeten uttömd eller fundamentalt trasigt    |

3. **Specialistteam.** Baserat på triagekategorin skapar ledaren ett team av specialistagenter (diagnostiker, återförsökskoordinator, definitionsreparatör, plugin-författare, etc.) för att undersöka och lösa problemet.

4. **Versionsförslag.** När en strukturell korrigeringsring behövs föreslår teamet en ny arbetsflödesversion. Om `approval_required` är sant väntar förslaget på mänsklig granskning via `workflow_version_approve` eller `workflow_version_reject`.

5. **Scopad paus.** När `pause_on_intervention` är aktiverat pausas bara nedströmsuppgifter — oberoende grenar fortsätter köra.

### Läkningsverktyg

Fyra ytterligare verktyg finns tillgängliga för att hantera läkningstillstånd:

| Verktyg                    | Beskrivning                                       |
| -------------------------- | ------------------------------------------------- |
| `workflow_version_list`    | Lista föreslagna/godkända/avvisade versioner      |
| `workflow_version_approve` | Godkänn en föreslagen version                     |
| `workflow_version_reject`  | Avvisa en föreslagen version med anledning        |
| `workflow_healing_status`  | Aktuell läkningsstatus för en arbetsflödeskörning |

### Säkerhet

- Läkningsagenten **kan inte ändra sin egen `self_healing`-konfiguration**. Föreslagna versioner som ändrar konfigurationsblocket avvisas.
- Ledaragenten och alla teammedlemmar ärver arbetsflödets taint-nivå och eskalerar i låssteget.
- Alla agentåtgärder passerar genom standardpolicykrokkedjan — inga kringgående.
- Föreslagna versioner lagras vid arbetsflödets klassificeringsnivå.
