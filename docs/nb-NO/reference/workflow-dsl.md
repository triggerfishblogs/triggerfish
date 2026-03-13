---
title: Workflow DSL-referanse
description: Fullstendig referanse for CNCF Serverless Workflow DSL 1.0 slik det er implementert i Triggerfish.
---

# Workflow DSL-referanse

Fullstendig referanse for CNCF Serverless Workflow DSL 1.0 slik det er
implementert i Triggerfishs arbeids flytsmotor. For brukerveiledning og
eksempler, se [Arbeidsflyter](/nb-NO/features/workflows).

## Dokumentstruktur

Alle arbeidsflyt-YAML-er må ha et toppnivå `document`-felt og en `do`-blokk.

```yaml
document:
  dsl: "1.0"
  namespace: my-namespace
  name: my-workflow
  version: "1.0.0"            # valgfri
  description: "What it does"  # valgfri
classification_ceiling: INTERNAL  # valgfri
input:                            # valgfri
  from: "${ . }"
output:                           # valgfri
  from:
    result: "${ .final_step }"
timeout:                          # valgfri
  after: PT5M
do:
  - task_name:
      # oppgavedefinisjon
```

### Dokumentmetadata

| Felt          | Type   | Påkrevd | Beskrivelse                                       |
| ------------- | ------ | ------- | ------------------------------------------------- |
| `dsl`         | string | Ja      | DSL-versjon. Må være `"1.0"`                      |
| `namespace`   | string | Ja      | Logisk gruppering (f.eks. `ops`, `reports`)       |
| `name`        | string | Ja      | Unikt arbeidsflytnavn innenfor navnerommet        |
| `version`     | string | Nei     | Semantisk versjonsstreng                          |
| `description` | string | Nei     | Menneskelig-lesbar beskrivelse                    |

### Toppnivåfelter

| Felt                     | Type         | Påkrevd | Beskrivelse                                          |
| ------------------------ | ------------ | ------- | ---------------------------------------------------- |
| `document`               | object       | Ja      | Dokumentmetadata (se ovenfor)                        |
| `do`                     | array        | Ja      | Ordnet liste over oppgaveoppføringer                 |
| `classification_ceiling` | string       | Nei     | Maksimalt tillatt session taint under kjøring        |
| `input`                  | transform    | Nei     | Transformasjon anvendt på arbeidsflyts inndata       |
| `output`                 | transform    | Nei     | Transformasjon anvendt på arbeidsflyts utdata        |
| `timeout`                | object       | Nei     | Arbeidsflyt-nivå tidsavbrudd (`after: <ISO 8601>`)  |
| `metadata`               | object       | Nei     | Vilkårlig nøkkelverdi-metadata                       |

---

## Oppgaveoppføringsformat

Hver oppføring i `do`-blokken er et enkelt-nøkkel-objekt. Nøkkelen er
oppgavenavnet, verdien er oppgavedefinisjonen.

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

Oppgavenavn må være unike innenfor samme `do`-blokk. Oppgaveresultatet lagres
i datakonteksten under oppgavenavnet.

---

## Vanlige oppgavefelter

Alle oppgavetyper deler disse valgfrie feltene:

| Felt       | Type      | Beskrivelse                                                  |
| ---------- | --------- | ------------------------------------------------------------ |
| `if`       | string    | Uttrykksbetingelse. Oppgaven hoppes over når falsk.          |
| `input`    | transform | Transformasjon anvendt før oppgavekjøring                    |
| `output`   | transform | Transformasjon anvendt etter oppgavekjøring                  |
| `timeout`  | object    | Oppgave-tidsavbrudd: `after: <ISO 8601-varighet>`            |
| `then`     | string    | Flytdirektiv: `continue`, `end` eller et oppgavenavn        |
| `metadata` | object    | Vilkårlig nøkkelverdi-metadata. Når selvhelbredelse er aktivert, kreves `description`, `expects`, `produces`. |

---

## Selvhelbredelseskonfigurasjon

`metadata.triggerfish.self_healing`-blokken aktiverer en autonom helbredelsesagent
for arbeids flyten. Se [Selvhelbredelse](/nb-NO/features/workflows#selvhelbredelse)
for en fullstendig veiledning.

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

| Felt                    | Type    | Påkrevd | Standard              | Beskrivelse |
| ----------------------- | ------- | ------- | --------------------- | ----------- |
| `enabled`               | boolean | Ja      | —                     | Aktiver helbredelsesagenten |
| `retry_budget`          | number  | Nei     | `3`                   | Maks intervensjonsfor søk |
| `approval_required`     | boolean | Nei     | `true`                | Krev menneskelig godkjenning for reparasjoner |
| `pause_on_intervention` | string  | Nei     | `"blocking_only"`     | `always` \| `never` \| `blocking_only` |
| `pause_timeout_seconds` | number  | Nei     | `300`                 | Sekunder før tidsavbruddspolicy utløses |
| `pause_timeout_policy`  | string  | Nei     | `"escalate_and_halt"` | `escalate_and_halt` \| `escalate_and_skip` \| `escalate_and_fail` |
| `notify_on`             | array   | Nei     | `[]`                  | `intervention` \| `escalation` \| `approval_required` |

### Trinnsmetadata (påkrevd når selvhelbredelse er aktivert)

Når `self_healing.enabled` er `true`, må hvert trinn inkludere disse
metadatafeltene. Parseren avviser arbeidsflyter der noen av dem mangler.

| Felt          | Type   | Beskrivelse                                  |
| ------------- | ------ | -------------------------------------------- |
| `description` | string | Hva trinnet gjør og hvorfor                  |
| `expects`     | string | Inndataform eller forutsetninger som trengs  |
| `produces`    | string | Utdataform som genereres                     |

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

## Oppgavetyper

### `call`

Distribuer til et HTTP-endepunkt eller Triggerfish-tjeneste.

| Felt   | Type   | Påkrevd | Beskrivelse                                       |
| ------ | ------ | ------- | ------------------------------------------------- |
| `call` | string | Ja      | Kalltype (se distribusjonstabell nedenfor)        |
| `with` | object | Nei     | Argumenter sendt til målverktøyet                 |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

Kjør en shell-kommando, innebygd skript eller sub-arbeidsflyt. `run`-feltet
må inneholde nøyaktig én av `shell`, `script` eller `workflow`.

**Shell:**

| Felt                   | Type   | Påkrevd | Beskrivelse               |
| ---------------------- | ------ | ------- | ------------------------- |
| `run.shell.command`    | string | Ja      | Shell-kommando å kjøre    |
| `run.shell.arguments`  | object | Nei     | Navngitte argumenter      |
| `run.shell.environment`| object | Nei     | Miljøvariabler            |

**Skript:**

| Felt                   | Type   | Påkrevd | Beskrivelse              |
| ---------------------- | ------ | ------- | ------------------------ |
| `run.script.language`  | string | Ja      | Skriptspråk              |
| `run.script.code`      | string | Ja      | Innebygd skriptkode      |
| `run.script.arguments` | object | Nei     | Navngitte argumenter     |

**Sub-arbeidsflyt:**

| Felt                   | Type   | Påkrevd | Beskrivelse                           |
| ---------------------- | ------ | ------- | ------------------------------------- |
| `run.workflow.name`    | string | Ja      | Navn på den lagrede arbeids flyten    |
| `run.workflow.version` | string | Nei     | Versjonsrestrikasjon                  |
| `run.workflow.input`   | object | Nei     | Inndata for sub-arbeids flyten        |

### `set`

Tilordne verdier til datakonteksten.

| Felt  | Type   | Påkrevd | Beskrivelse                                           |
| ----- | ------ | ------- | ----------------------------------------------------- |
| `set` | object | Ja      | Nøkkelverdi-par å tilordne. Verdier kan være uttrykk. |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

Betinget forgrening. `switch`-feltet er en array av tilfelle-oppføringer. Hvert
tilfelle er et enkelt-nøkkel-objekt der nøkkelen er tilfelle-navnet.

| Tilfelle-felt | Type   | Påkrevd | Beskrivelse                                          |
| ------------- | ------ | ------- | ---------------------------------------------------- |
| `when`        | string | Nei     | Uttrykksbetingelse. Utelat for standardtilfelle.     |
| `then`        | string | Ja      | Flytdirektiv: `continue`, `end` eller oppgavenavn   |

Tilfeller evalueres i rekkefølge. Det første tilfellet med sann `when` (eller
uten `when`) velges.

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

Iterer over en samling.

| Felt       | Type   | Påkrevd | Beskrivelse                                      |
| ---------- | ------ | ------- | ------------------------------------------------ |
| `for.each` | string | Ja      | Variabelnavn for gjeldende element               |
| `for.in`   | string | Ja      | Uttrykk som refererer til samlingen              |
| `for.at`   | string | Nei     | Variabelnavn for gjeldende indeks                |
| `do`       | array  | Ja      | Nestet oppgaveliste kjørt for hver iterasjon     |

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

Stopp arbeids flyten med en strukturert feil.

| Felt                 | Type   | Påkrevd | Beskrivelse              |
| -------------------- | ------ | ------- | ------------------------ |
| `raise.error.status` | number | Ja      | HTTP-stil statuskode     |
| `raise.error.type`   | string | Ja      | Feiltype-URI/streng      |
| `raise.error.title`  | string | Ja      | Menneskelig-lesbar tittel|
| `raise.error.detail` | string | Nei     | Detaljert feilmelding    |

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

Registrer en arbeidsflythendelse. Hendelser lagres i kjøringsresultatet.

| Felt                 | Type   | Påkrevd | Beskrivelse              |
| -------------------- | ------ | ------- | ------------------------ |
| `emit.event.type`    | string | Ja      | Hendelsestypeidentifikator|
| `emit.event.source`  | string | Nei     | Hendelseskilde-URI       |
| `emit.event.data`    | object | Nei     | Hendelsesnyttelast       |

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

Sett kjøring på pause i en varighet.

| Felt   | Type   | Påkrevd | Beskrivelse                           |
| ------ | ------ | ------- | ------------------------------------- |
| `wait` | string | Ja      | ISO 8601-varighet (f.eks. `PT5S`)     |

Vanlige varigheter: `PT1S` (1 sekund), `PT30S` (30 sekunder), `PT1M` (1 minutt),
`PT5M` (5 minutter).

---

## Kalldistribusjonstabell

Kartlegger `call`-feltverdien til Triggerfish-verktøyet som faktisk kalles.

| `call`-verdi           | Verktøy som kalles | Påkrevde `with:`-felter                                        |
| ---------------------- | ------------------ | -------------------------------------------------------------- |
| `http`                 | `web_fetch`        | `endpoint` eller `url`; valgfri `method`, `headers`, `body`   |
| `triggerfish:llm`      | `llm_task`         | `prompt` eller `task`; valgfri `tools`, `max_iterations`       |
| `triggerfish:agent`    | `subagent`         | `prompt` eller `task`; valgfri `tools`, `agent`                |
| `triggerfish:memory`   | `memory_*`         | `operation` (`save`/`search`/`get`/`list`/`delete`) + operasjonsfelter |
| `triggerfish:web_search` | `web_search`     | `query`; valgfri `max_results`                                 |
| `triggerfish:web_fetch`  | `web_fetch`      | `url`; valgfri `method`, `headers`, `body`                     |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`; valgfri `arguments`                   |
| `triggerfish:message`  | `send_message`     | `channel`, `text`; valgfri `recipient`                         |

Ustøttede CNCF-kalltyper (`grpc`, `openapi`, `asyncapi`) returnerer en feil.

---

## Uttrykkssyntaks

Uttrykk er avgrenset av `${ }` og løses mot arbeidsflyts datakontekst.

### Punktsti-løsning

| Syntaks                 | Beskrivelse                         | Eksempelresultat     |
| ----------------------- | ----------------------------------- | -------------------- |
| `${ . }`                | Hele datakonteksten                 | `{...}`              |
| `${ .key }`             | Toppnivånøkkel                      | `"verdi"`            |
| `${ .a.b.c }`           | Nestet nøkkel                       | `"dyp verdi"`        |
| `${ .items[0] }`        | Array-indeks                        | `{...første element...}` |
| `${ .items[0].name }`   | Array-indeks deretter nøkkel        | `"første"`           |

Den ledende punkten (eller `$.`) forankrer stien ved kontekstroten. Stier som
løses til `undefined` produserer en tom streng ved interpolasjon, eller
`undefined` når brukt som en selvstendig verdi.

### Operatorer

| Type       | Operatorer                       | Eksempel                       |
| ---------- | -------------------------------- | ------------------------------ |
| Sammenligning | `==`, `!=`, `>`, `<`, `>=`, `<=` | `${ .count > 0 }`         |
| Aritmetikk | `+`, `-`, `*`, `/`, `%`          | `${ .price * .quantity }`      |

Sammenligningsuttrykk returnerer `true` eller `false`. Aritmetiske uttrykk
returnerer et tall (`undefined` hvis en av operandene ikke er numerisk eller
ved deling med null).

### Literaler

| Type    | Eksempler                |
| ------- | ------------------------ |
| Streng  | `"hei"`, `'hei'`         |
| Tall    | `42`, `3.14`, `-1`       |
| Boolean | `true`, `false`          |
| Null    | `null`                   |

### Interpolasjonsmodi

**Enkelt uttrykk (rå verdi):** Når hele strengen er ett `${ }`-uttrykk,
returneres den rå typede verdien (tall, boolean, objekt, array).

```yaml
count: "${ .items.length }"  # returnerer et tall, ikke en streng
```

**Blandet / flere uttrykk (streng):** Når `${ }`-uttrykk er blandet med tekst
eller det er flere uttrykk, er resultatet alltid en streng.

```yaml
message: "Found ${ .count } items in ${ .category }"  # returnerer en streng
```

### Sannhetsverdi

For `if:`-betingelser og `switch` `when:`-uttrykk evalueres verdier ved hjelp
av JavaScript-stil sannhetsverdi:

| Verdi                                                        | Sant? |
| ------------------------------------------------------------ | ----- |
| `true`                                                       | Ja    |
| Ikke-null tall                                               | Ja    |
| Ikke-tom streng                                              | Ja    |
| Ikke-tom array                                               | Ja    |
| Objekt                                                       | Ja    |
| `false`, `0`, `""`, `null`, `undefined`, tom array           | Nei   |

---

## Inn-/utdatatransformasjoner

Transformasjoner omformer data som flyter inn og ut av oppgaver.

### `input`

Anvendt før oppgavekjøring. Erstatter oppgavens visning av datakonteksten.

```yaml
- step:
    call: http
    input:
      from: "${ .config }"       # oppgaven ser bare config-objektet
    with:
      endpoint: "${ .api_url }"  # løst mot config-objektet
```

**`from` som streng:** Uttrykk som erstatter hele inndatakonteksten.

**`from` som objekt:** Kartlegger nye nøkler til uttrykk:

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

Anvendt etter oppgavekjøring. Omformer resultatet før det lagres i konteksten
under oppgavenavnet.

```yaml
- fetch:
    call: http
    output:
      from:
        items: "${ .fetch.data.results }"
        count: "${ .fetch.data.total }"
```

---

## Flytdirektiver

`then`-feltet på enhver oppgave kontrollerer kjøringsflyt etter at oppgaven
er fullført.

| Verdi         | Atferd                                                          |
| ------------- | --------------------------------------------------------------- |
| `continue`    | Gå til neste oppgave i sekvensen (standard)                     |
| `end`         | Stopp arbeids flyten. Status: `completed`.                      |
| `<oppgavenavn>`| Hopp til den navngitte oppgaven. Oppgaven må finnes i samme `do`-blokk. |

Switch-tilfeller bruker også flytdirektiver i `then`-feltet.

---

## Klassifiseringstak

Valgfritt felt som begrenser maksimalt session taint under kjøring.

```yaml
classification_ceiling: INTERNAL
```

| Verdi          | Betydning                                                |
| -------------- | -------------------------------------------------------- |
| `PUBLIC`       | Arbeids flyten stopper hvis klassifisert data aksesseres |
| `INTERNAL`     | Tillater `PUBLIC`- og `INTERNAL`-data                   |
| `CONFIDENTIAL` | Tillater opptil `CONFIDENTIAL`-data                     |
| `RESTRICTED`   | Tillater alle klassifiseringsnivåer                     |
| *(utelatt)*    | Ingen tak håndheves                                     |

Taket sjekkes før hver oppgave. Hvis session taint har eskalert forbi taket
(f.eks. fordi en tidligere oppgave aksesserte klassifisert data), stopper arbeids
flyten med status `failed` og feil `Workflow classification ceiling breached`.

---

## Lagring

### Arbeidsflytsdefinisjoner

Lagret med nøkkelprefiks `workflows:{navn}`. Hver lagret post inneholder:

| Felt             | Type   | Beskrivelse                                     |
| ---------------- | ------ | ----------------------------------------------- |
| `name`           | string | Arbeidsflytnavn                                 |
| `yaml`           | string | Rå YAML-definisjon                              |
| `classification` | string | Klassifiseringsnivå på tidspunktet for lagring  |
| `savedAt`        | string | ISO 8601-tidsstempel                            |
| `description`    | string | Valgfri beskrivelse                             |

### Kjøringshistorikk

Lagret med nøkkelprefiks `workflow-runs:{runId}`. Hver kjøringspost inneholder:

| Felt             | Type   | Beskrivelse                                          |
| ---------------- | ------ | ---------------------------------------------------- |
| `runId`          | string | UUID for denne kjøringen                             |
| `workflowName`   | string | Navn på arbeids flyten som ble kjørt                 |
| `status`         | string | `completed`, `failed` eller `cancelled`              |
| `output`         | object | Endelig datakontekst (interne nøkler filtrert)       |
| `events`         | array  | Hendelser sendt under kjøring                        |
| `error`          | string | Feilmelding (hvis status er `failed`)                |
| `startedAt`      | string | ISO 8601-tidsstempel                                 |
| `completedAt`    | string | ISO 8601-tidsstempel                                 |
| `taskCount`      | number | Antall oppgaver i arbeids flyten                     |
| `classification` | string | Session taint ved fullføring                         |

---

## Grenser

| Grense                     | Verdi | Beskrivelse                                       |
| -------------------------- | ----- | ------------------------------------------------- |
| Maks dybde for sub-arbeidsflyt | 5 | Maksimalt nesting av `run.workflow`-kall           |
| Standard grense for kjøringshistorikk | 10 | Standard `limit` for `workflow_history`   |

---

## Kjøringsstatuser

| Status      | Beskrivelse                                                   |
| ----------- | ------------------------------------------------------------- |
| `pending`   | Arbeids flyten er opprettet men ikke startet                  |
| `running`   | Arbeids flyten kjøres for øyeblikket                         |
| `completed` | Alle oppgaver fullført uten problemer (eller `then: end`)     |
| `failed`    | En oppgave feilet, en `raise` ble truffet, eller tak brutt    |
| `cancelled` | Kjøring ble avbrutt eksternt                                  |
