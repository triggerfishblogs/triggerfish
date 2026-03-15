---
title: Arbeidsflyter
description: Automatiser flertrinnoppgaver med CNCF Serverless Workflow DSL-motoren innebygd i Triggerfish.
---

# Arbeidsflyter

Triggerfish inkluderer en innebygd kjøringsmotor for
[CNCF Serverless Workflow DSL 1.0](https://github.com/serverlessworkflow/specification).
Arbeidsflyter lar deg definere deterministiske, flertrinnautomatiseringer i YAML
som kjøres **uten LLM-en i løkken** under kjøring. Agenten oppretter og utløser
arbeidsflyter, men motoren håndterer den faktiske oppgavedistribusjon, forgrening,
løkking og dataflyt.

## Når man bruker arbeidsflyter

**Bruk arbeidsflyter** for gjentakbare, deterministiske sekvenser der du kjenner
trinnene på forhånd: hent data fra en API, transformer det, lagre i minnet, send
et varsel. Den samme inndataen produserer alltid den samme utdataen.

**Bruk agenten direkte** for åpent resonnering, utforskning eller oppgaver der
neste trinn avhenger av skjønn: undersøke et emne, skrive kode, feilsøke et
problem.

En god tommelfingerregel: hvis du ofte ber agenten gjøre den samme
flertrinnssekvensen, gjør det om til en arbeidsflyt.

::: info Tilgjengelighet
Arbeidsflyter er tilgjengelige på alle planer. Åpen kildekode-brukere som kjører
egne API-nøkler har full tilgang til arbeidsflytmotoren — hvert `triggerfish:llm`-
eller `triggerfish:agent`-kall innenfor en arbeidsflyt forbruker inferens fra den
konfigurerte leverandøren din.
:::

## Verktøy

### `workflow_save`

Analyser, valider og lagre en arbeidsflysdefinisjon. Arbeids flyten lagres på
gjeldende sesjons klassifiseringsnivå.

| Parameter     | Type   | Påkrevd | Beskrivelse                          |
| ------------- | ------ | ------- | ------------------------------------ |
| `name`        | string | Ja      | Navn for arbeids flyten              |
| `yaml`        | string | Ja      | YAML-arbeidsflysdefinisjon           |
| `description` | string | Nei     | Hva arbeids flyten gjør              |

### `workflow_run`

Kjør en arbeidsflyt etter navn eller fra innebygd YAML. Returnerer kjøringsutdata
og status.

| Parameter | Type   | Påkrevd | Beskrivelse                                                    |
| --------- | ------ | ------- | -------------------------------------------------------------- |
| `name`    | string | Nei     | Navn på en lagret arbeidsflyt som skal kjøres                  |
| `yaml`    | string | Nei     | Innebygd YAML-definisjon (når du ikke bruker en lagret)        |
| `input`   | string | Nei     | JSON-streng med inndata for arbeids flyten                     |

Én av `name` eller `yaml` er påkrevd.

### `workflow_list`

List alle lagrede arbeidsflyter tilgjengelige på gjeldende klassifiseringsnivå.
Tar ingen parametere.

### `workflow_get`

Hent en lagret arbeidsflysdefinisjon etter navn.

| Parameter | Type   | Påkrevd | Beskrivelse                               |
| --------- | ------ | ------- | ----------------------------------------- |
| `name`    | string | Ja      | Navn på arbeids flyten som skal hentes    |

### `workflow_delete`

Slett en lagret arbeidsflyt etter navn. Arbeids flyten må være tilgjengelig på
gjeldende sesjons klassifiseringsnivå.

| Parameter | Type   | Påkrevd | Beskrivelse                               |
| --------- | ------ | ------- | ----------------------------------------- |
| `name`    | string | Ja      | Navn på arbeids flyten som skal slettes   |

### `workflow_history`

Vis tidligere arbeidsflytkjøringsresultater, eventuelt filtrert etter
arbeidsflytnavn.

| Parameter       | Type   | Påkrevd | Beskrivelse                                          |
| --------------- | ------ | ------- | ---------------------------------------------------- |
| `workflow_name` | string | Nei     | Filtrer resultater etter arbeidsflytnavn             |
| `limit`         | string | Nei     | Maksimalt antall resultater (standard 10)            |

## Oppgavetyper

Arbeidsflyter er sammensatt av oppgaver i en `do:`-blokk. Hver oppgave er en
navngitt oppføring med en typespesifikk kropp. Triggerfish støtter 8 oppgavetyper.

### `call` — Eksterne kall

Distribuer til HTTP-endepunkter eller Triggerfish-tjenester.

```yaml
- fetch_issue:
    call: http
    with:
      endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
      method: GET
      headers:
        Authorization: "Bearer ${ .github_token }"
```

`call`-feltet bestemmer distribusjonsmålet. Se
[Kalldistribusjon](#kalldistribusjon) for fullstendig kartlegging.

### `run` — Shell, skript eller sub-arbeidsflyt

Kjør en shell-kommando, et innebygd skript eller en annen lagret arbeidsflyt.

**Shell-kommando:**

```yaml
- list_files:
    run:
      shell:
        command: "ls -la /tmp/workspace"
```

**Sub-arbeidsflyt:**

```yaml
- cleanup:
    run:
      workflow:
        name: cleanup-temp-files
        input:
          directory: "${ .workspace }"
```

::: warning
Shell- og skriptkjøring krever at `allowShellExecution`-flagget er aktivert i
arbeidsflyktverktøy-konteksten. Hvis deaktivert, vil kjøringsoppgaver med `shell`-
eller `script`-mål mislykkes.
:::

### `set` — Datakontekstmutasjoner

Tilordne verdier til arbeids flytens datakontekst. Støtter uttrykk.

```yaml
- prepare_prompt:
    set:
      summary_prompt: "Summarize the following GitHub issue: ${ .fetch_issue.title } — ${ .fetch_issue.body }"
      issue_url: "https://github.com/${ .repo }/issues/${ .issue_number }"
```

### `switch` — Betinget forgrening

Forgrening basert på betingelser. Hvert tilfelle har et `when`-uttrykk og et
`then`-flytstyringsdirekiv. Et tilfelle uten `when` fungerer som standard.

```yaml
- check_priority:
    switch:
      - high_priority:
          when: "${ .fetch_issue.labels }"
          then: notify_team
      - default:
          then: continue
```

### `for` — Iterasjon

Loop over en samling, kjør en nestet `do:`-blokk for hvert element.

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

`each`-feltet navngir løkkevariabelen, `in` refererer til samlingen, og det
valgfrie `at`-feltet gir gjeldende indeks.

### `raise` — Stopp med feil

Stopp kjøring med en strukturert feil.

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

### `emit` — Registrer hendelser

Registrer en arbeidsflythendelse. Hendelser fanges i kjøringsresultatet og kan
gjennomgås via `workflow_history`.

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

### `wait` — Pause

Sett kjøring på pause i en ISO 8601-varighet.

```yaml
- rate_limit_pause:
    wait: PT2S
```

## Kalldistribusjon

`call`-feltet i en kalloppgave bestemmer hvilket Triggerfish-verktøy som kalles.

| Kalltype                 | Triggerfish-verktøy     | Påkrevde `with:`-felter                |
| ------------------------ | ----------------------- | -------------------------------------- |
| `http`                   | `web_fetch`             | `endpoint` (eller `url`), `method`     |
| `triggerfish:llm`        | `llm_task`              | `prompt` (eller `task`)                |
| `triggerfish:agent`      | `subagent`              | `prompt` (eller `task`)                |
| `triggerfish:memory`     | `memory_*`              | `operation` + operasjonsspesifikke felter|
| `triggerfish:web_search` | `web_search`            | `query`                                |
| `triggerfish:web_fetch`  | `web_fetch`             | `url`                                  |
| `triggerfish:mcp`        | `mcp__<server>__<tool>` | `server`, `tool`, `arguments`          |
| `triggerfish:message`    | `send_message`          | `channel`, `text`                      |

**Minneoperasjoner:** `triggerfish:memory`-kalltypen krever et `operation`-felt
satt til én av `save`, `search`, `get`, `list` eller `delete`. De gjenværende
`with:`-feltene sendes direkte til det tilsvarende minneverktøyet.

```yaml
- save_summary:
    call: triggerfish:memory
    with:
      operation: save
      content: "${ .summary }"
      tags: ["github", "issue-summary"]
```

**MCP-kall:** `triggerfish:mcp`-kalltypen ruter til et tilkoblet MCP-serververktøy.
Angi `server`-navn, `tool`-navn og `arguments`-objekt.

```yaml
- run_lint:
    call: triggerfish:mcp
    with:
      server: eslint
      tool: lint-files
      arguments:
        paths: ["src/"]
```

## Uttrykk

Arbeidsflytuttrykk bruker `${ }`-syntaks med punktsti-løsning mot arbeidsflyts
datakontekst.

```yaml
# Enkel verdihenvisning
url: "${ .config.api_url }"

# Arrayindeksering
first_item: "${ .results[0].name }"

# Strenginterpolasjon (flere uttrykk i én streng)
message: "Found ${ .count } issues in ${ .repo }"

# Sammenligning (returnerer boolean)
if: "${ .status == 'open' }"

# Aritmetikk
total: "${ .price * .quantity }"
```

**Støttede operatorer:**

- Sammenligning: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Aritmetikk: `+`, `-`, `*`, `/`, `%`

**Literaler:** Streng (`"verdi"` eller `'verdi'`), tall (`42`, `3.14`), boolean
(`true`, `false`), null (`null`).

Når et `${ }`-uttrykk er hele verdien, bevares den rå typen (tall, boolean,
objekt). Når blandet med tekst, er resultatet alltid en streng.

## Komplett eksempel

Denne arbeids flyten henter en GitHub-sak, oppsummerer den med LLM-en, lagrer
sammendraget i minnet og sender et varsel.

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

**Kjør det:**

```
workflow_run with name: "summarize-github-issue" and input:
  {"repo": "myorg/myrepo", "issue_number": 42, "github_token": "ghp_..."}
```

## Inn- og utdatatransformasjoner

Oppgaver kan transformere inndataene sine før kjøring og utdataene sine før de
lagrer resultater.

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

- **`input.from`** — Uttrykk eller objektkartlegging som erstatter oppgavens
  inndatakontekst før kjøring.
- **`output.from`** — Uttrykk eller objektkartlegging som omformer oppgaveresultatet
  før det lagres i datakonteksten.

## Flytkontroll

Alle oppgaver kan inkludere et `then`-direktiv som kontrollerer hva som skjer neste:

- **`continue`** (standard) — gå til neste oppgave i sekvensen
- **`end`** — stopp arbeids flyten umiddelbart (status: fullført)
- **Navngitt oppgave** — hopp til en spesifikk oppgave etter navn

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

## Betinget kjøring

Alle oppgaver kan inkludere et `if`-felt. Oppgaven hoppes over når betingelsen
evalueres til falsk.

```yaml
- send_alert:
    if: "${ .severity == 'critical' }"
    call: triggerfish:message
    with:
      channel: telegram
      text: "CRITICAL: ${ .alert_message }"
```

## Sub-arbeidsflyter

En `run`-oppgave med et `workflow`-mål kjører en annen lagret arbeidsflyt.
Sub-arbeids flyten kjøres med sin egen kontekst og returnerer utdataene til
foreldrearbeids flyten.

```yaml
- enrich_data:
    run:
      workflow:
        name: data-enrichment-pipeline
        input:
          raw_data: "${ .fetched_data }"
```

Sub-arbeidsflyter kan neste opptil **5 nivåer dypt**. Å overskride denne grensen
produserer en feil og stopper kjøringen.

## Klassifisering og sikkerhet

Arbeidsflyter deltar i det samme klassifiseringssystemet som alle andre
Triggerfish-data.

**Lagringsklassifisering.** Når du lagrer en arbeidsflyt med `workflow_save`,
lagres den på gjeldende sesjons taint-nivå. En arbeidsflyt lagret under en
`CONFIDENTIAL`-sesjon kan bare lastes av sesjoner på `CONFIDENTIAL` eller høyere.

**Klassifiseringstak.** Arbeidsflyter kan erklære et `classification_ceiling` i
sin YAML. Før hver oppgave kjøres, sjekker motoren at sesjonens gjeldende taint
ikke overstiger taket. Hvis session taint eskalerer forbi taket under kjøring
(f.eks. ved å aksessere klassifisert data via et verktøykall), stopper arbeids
flyten med en tak-brudd-feil.

```yaml
classification_ceiling: INTERNAL
```

Gyldige verdier: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

**Kjøringshistorikk.** Kjøringsresultater lagres med sesjonens klassifisering
på tidspunktet for fullføring. `workflow_history` filtrerer resultater etter
`canFlowTo`, slik at du bare ser kjøringer som er på eller under din gjeldende
session taint.

::: danger SIKKERHET
Sletting av arbeids flyt krever at arbeids flyten er tilgjengelig på din gjeldende
sesjons klassifiseringsnivå. Du kan ikke slette en arbeidsflyt lagret på `CONFIDENTIAL`
fra en `PUBLIC`-sesjon. `workflow_delete`-verktøyet laster arbeids flyten først
og returnerer «ikke funnet» hvis klassifiseringssjekken feiler.
:::

## Selvhelbredelse

Arbeidsflyter kan valgfritt ha en autonom helbredelsesagent som overvåker
kjøring i sanntid, diagnostiserer feil og foreslår reparasjoner. Når selvhelbredelse
er aktivert, spawnes en lederagent ved siden av arbeids flytkjøringen. Den
observerer alle trinns-hendelser, triasjer feil og koordinerer spesialistteam for
å løse problemer.

### Aktivere selvhelbredelse

Legg til en `self_healing`-blokk i arbeidsflyts `metadata.triggerfish`-seksjon:

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

Når `enabled: true` er satt, **må** hvert trinn inkludere tre metadatafelter:

| Felt          | Beskrivelse                                               |
| ------------- | --------------------------------------------------------- |
| `description` | Hva trinnet gjør og hvorfor det finnes                    |
| `expects`     | Inndataform eller forutsetninger trinnet trenger          |
| `produces`    | Utdataform trinnet genererer                              |

Parseren avviser arbeidsflyter der et trinn mangler disse feltene.

### Konfigurasjonsalternativer

| Alternativ                | Type    | Standard              | Beskrivelse |
| ------------------------- | ------- | --------------------- | ----------- |
| `enabled`                 | boolean | —                     | Påkrevd. Aktiverer helbredelsesagenten. |
| `retry_budget`            | number  | `3`                   | Maksimalt antall intervensjoner før eskalering som uløselig. |
| `approval_required`       | boolean | `true`                | Om foreslåtte arbeidsflytreparasjoner krever menneskelig godkjenning. |
| `pause_on_intervention`   | string  | `"blocking_only"`     | Når nedstrømsoppgaver settes på pause: `always`, `never` eller `blocking_only`. |
| `pause_timeout_seconds`   | number  | `300`                 | Sekunder å vente under en pause før tidsavbruddspolicyen utløses. |
| `pause_timeout_policy`    | string  | `"escalate_and_halt"` | Hva som skjer ved tidsavbrudd: `escalate_and_halt`, `escalate_and_skip` eller `escalate_and_fail`. |
| `notify_on`               | array   | `[]`                  | Hendelser som utløser varsler: `intervention`, `escalation`, `approval_required`. |

### Slik fungerer det

1. **Observasjon.** Helbredelseslederagenten mottar en sanntidsstrøm av
   trinns-hendelser (startet, fullført, feilet, hoppet over) mens arbeids flyten kjøres.

2. **Triage.** Når et trinn feiler, triasjer lederen feilen i én av fem kategorier:

   | Kategori              | Betydning                                              |
   | --------------------- | ------------------------------------------------------ |
   | `transient_retry`     | Midlertidig problem (nettverksfeil, hastighetsbegrensning, 503) |
   | `runtime_workaround`  | Ukjent feil første gang, kan kanskje omgås             |
   | `structural_fix`      | Gjentakende feil som krever endring av arbeidsflydefinisjonen |
   | `plugin_gap`          | Auth/legitimasjonsproblem som krever en ny integrasjon |
   | `unresolvable`        | Forsøksbudsjett oppbrukt eller grunnleggende ødelagt   |

3. **Spesialistteam.** Basert på triasje-kategorien spawner lederen et team av
   spesialistagenter (diagnostiker, forsøkskoordinator, definisjonsreparatør,
   plugin-forfatter, osv.) for å undersøke og løse problemet.

4. **Versjonsforslag.** Når en strukturell reparasjon er nødvendig, foreslår
   teamet en ny arbeidsflyversjon. Hvis `approval_required` er sant, venter
   forslaget på menneskelig gjennomgang via `workflow_version_approve` eller
   `workflow_version_reject`.

5. **Scoped pause.** Når `pause_on_intervention` er aktivert, settes bare
   nedstrømsoppgaver på pause — uavhengige grener fortsetter å kjøre.

### Helbredelsesverktøy

Fire ytterligere verktøy er tilgjengelige for å administrere helbredelsestilstand:

| Verktøy                    | Beskrivelse                                    |
| -------------------------- | ---------------------------------------------- |
| `workflow_version_list`    | List foreslåtte/godkjente/avviste versjoner    |
| `workflow_version_approve` | Godkjenn en foreslått versjon                  |
| `workflow_version_reject`  | Avvis en foreslått versjon med begrunnelse     |
| `workflow_healing_status`  | Gjeldende helbredelsestatus for en arbeids flytkjøring |

### Sikkerhet

- Helbredelsesagenten **kan ikke endre sin egen `self_healing`-konfig**. Foreslåtte
  versjoner som endrer konfigblokken avvises.
- Lederagenten og alle teammedlemmer arver arbeids flytens taint-nivå og eskalerer
  i takt.
- Alle agenthandlinger passerer gjennom standard policy-hook-kjeden — ingen omgåelser.
- Foreslåtte versjoner lagres på arbeidsflyts klassifiseringsnivå.
