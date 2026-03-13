---
title: Workflows
description: Automatisieren Sie mehrstufige Aufgaben mit der in Triggerfish integrierten CNCF Serverless Workflow DSL-Engine.
---

# Workflows

Triggerfish enthalt eine integrierte Ausfuhrungsengine fur die
[CNCF Serverless Workflow DSL 1.0](https://github.com/serverlessworkflow/specification).
Workflows ermoglichen es Ihnen, deterministische, mehrstufige Automatisierungen
in YAML zu definieren, die **ohne den LLM im Loop** wahrend der Ausfuhrung
laufen. Der Agent erstellt und lost Workflows aus, aber die Engine ubernimmt den
eigentlichen Aufgabenversand, die Verzweigung, Schleifen und den Datenfluss.

## Wann Sie Workflows verwenden sollten

**Verwenden Sie Workflows** fur wiederholbare, deterministische Sequenzen, bei
denen Sie die Schritte im Voraus kennen: Daten von einer API abrufen,
transformieren, im Speicher sichern, eine Benachrichtigung senden. Dieselbe
Eingabe erzeugt immer dieselbe Ausgabe.

**Verwenden Sie den Agenten direkt** fur offenes Denken, Erkundung oder Aufgaben,
bei denen der nachste Schritt von der Beurteilung abhangt: ein Thema
recherchieren, Code schreiben, ein Problem beheben.

Eine gute Faustregel: Wenn Sie feststellen, dass Sie den Agenten wiederholt
bitten, dieselbe mehrstufige Sequenz auszufuhren, machen Sie einen Workflow
daraus.

::: info Verfugbarkeit
Workflows sind in allen Planen verfugbar. Open-Source-Benutzer, die ihre eigenen
API Keys verwenden, haben vollen Zugriff auf die Workflow-Engine -- jeder
`triggerfish:llm`- oder `triggerfish:agent`-Aufruf innerhalb eines Workflows
verbraucht Inferenz von Ihrem konfigurierten Anbieter.
:::

## Werkzeuge

### `workflow_save`

Analysiert, validiert und speichert eine Workflow-Definition. Der Workflow wird
auf dem Klassifizierungslevel der aktuellen Sitzung gespeichert.

| Parameter     | Type   | Required | Beschreibung                           |
| ------------- | ------ | -------- | -------------------------------------- |
| `name`        | string | yes      | Name des Workflows                     |
| `yaml`        | string | yes      | YAML-Workflow-Definition               |
| `description` | string | no       | Was der Workflow tut                   |

### `workflow_run`

Fuhrt einen Workflow nach Name oder aus Inline-YAML aus. Gibt die
Ausfuhrungsausgabe und den Status zuruck.

| Parameter | Type   | Required | Beschreibung                                           |
| --------- | ------ | -------- | ------------------------------------------------------ |
| `name`    | string | no       | Name eines gespeicherten Workflows zur Ausfuhrung      |
| `yaml`    | string | no       | Inline-YAML-Definition (wenn kein gespeicherter verwendet wird) |
| `input`   | string | no       | JSON-String mit Eingabedaten fur den Workflow           |

Einer der Parameter `name` oder `yaml` ist erforderlich.

### `workflow_list`

Listet alle gespeicherten Workflows auf, die auf dem aktuellen
Klassifizierungslevel zuganglich sind. Akzeptiert keine Parameter.

### `workflow_get`

Ruft eine gespeicherte Workflow-Definition nach Name ab.

| Parameter | Type   | Required | Beschreibung                           |
| --------- | ------ | -------- | -------------------------------------- |
| `name`    | string | yes      | Name des abzurufenden Workflows        |

### `workflow_delete`

Loscht einen gespeicherten Workflow nach Name. Der Workflow muss auf dem
Klassifizierungslevel der aktuellen Sitzung zuganglich sein.

| Parameter | Type   | Required | Beschreibung                           |
| --------- | ------ | -------- | -------------------------------------- |
| `name`    | string | yes      | Name des zu loschenden Workflows       |

### `workflow_history`

Zeigt vergangene Workflow-Ausfuhrungsergebnisse an, optional gefiltert nach
Workflow-Name.

| Parameter       | Type   | Required | Beschreibung                                |
| --------------- | ------ | -------- | ------------------------------------------- |
| `workflow_name` | string | no       | Ergebnisse nach Workflow-Name filtern       |
| `limit`         | string | no       | Maximale Anzahl der Ergebnisse (Standard 10) |

## Aufgabentypen

Workflows bestehen aus Aufgaben in einem `do:`-Block. Jede Aufgabe ist ein
benannter Eintrag mit einem typspezifischen Korper. Triggerfish unterstutzt 8
Aufgabentypen.

### `call` — Externe Aufrufe

Versand an HTTP-Endpunkte oder Triggerfish-Dienste.

```yaml
- fetch_issue:
    call: http
    with:
      endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
      method: GET
      headers:
        Authorization: "Bearer ${ .github_token }"
```

Das Feld `call` bestimmt das Versandziel. Siehe
[Aufruf-Versand](#aufruf-versand) fur die vollstandige Zuordnung.

### `run` — Shell, Script oder Sub-Workflow

Fuhrt einen Shell-Befehl, ein Inline-Script oder einen anderen gespeicherten
Workflow aus.

**Shell-Befehl:**

```yaml
- list_files:
    run:
      shell:
        command: "ls -la /tmp/workspace"
```

**Sub-Workflow:**

```yaml
- cleanup:
    run:
      workflow:
        name: cleanup-temp-files
        input:
          directory: "${ .workspace }"
```

::: warning
Die Shell- und Script-Ausfuhrung erfordert, dass das Flag `allowShellExecution`
im Workflow-Werkzeugkontext aktiviert ist. Wenn deaktiviert, schlagen
Run-Aufgaben mit `shell`- oder `script`-Zielen fehl.
:::

### `set` — Datenkontextmutationen

Weist dem Datenkontext des Workflows Werte zu. Unterstutzt Ausdrucke.

```yaml
- prepare_prompt:
    set:
      summary_prompt: "Summarize the following GitHub issue: ${ .fetch_issue.title } — ${ .fetch_issue.body }"
      issue_url: "https://github.com/${ .repo }/issues/${ .issue_number }"
```

### `switch` — Bedingte Verzweigung

Verzweigt basierend auf Bedingungen. Jeder Fall hat einen `when`-Ausdruck und
eine `then`-Flussdirektive. Ein Fall ohne `when` dient als Standard.

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

Iteriert uber eine Sammlung und fuhrt fur jedes Element einen verschachtelten
`do:`-Block aus.

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

Das Feld `each` benennt die Schleifenvariable, `in` referenziert die Sammlung,
und das optionale Feld `at` liefert den aktuellen Index.

### `raise` — Mit Fehler anhalten

Stoppt die Ausfuhrung mit einem strukturierten Fehler.

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

### `emit` — Ereignisse aufzeichnen

Zeichnet ein Workflow-Ereignis auf. Ereignisse werden im Ausfuhrungsergebnis
erfasst und konnen uber `workflow_history` uberpruft werden.

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

Pausiert die Ausfuhrung fur eine ISO 8601-Dauer.

```yaml
- rate_limit_pause:
    wait: PT2S
```

## Aufruf-Versand

Das Feld `call` in einer Call-Aufgabe bestimmt, welches Triggerfish-Werkzeug
aufgerufen wird.

| Aufruftyp              | Triggerfish-Werkzeug | Erforderliche `with:`-Felder           |
| ---------------------- | -------------------- | -------------------------------------- |
| `http`                 | `web_fetch`          | `endpoint` (oder `url`), `method`      |
| `triggerfish:llm`      | `llm_task`           | `prompt` (oder `task`)                 |
| `triggerfish:agent`    | `subagent`           | `prompt` (oder `task`)                 |
| `triggerfish:memory`   | `memory_*`           | `operation` + operationsspezifische Felder |
| `triggerfish:web_search` | `web_search`       | `query`                                |
| `triggerfish:web_fetch`  | `web_fetch`        | `url`                                  |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`, `arguments`       |
| `triggerfish:message`  | `send_message`       | `channel`, `text`                      |

**Speicheroperationen:** Der Aufruftyp `triggerfish:memory` erfordert ein Feld
`operation`, das auf `save`, `search`, `get`, `list` oder `delete` gesetzt ist.
Die ubrigen `with:`-Felder werden direkt an das entsprechende Speicherwerkzeug
weitergeleitet.

```yaml
- save_summary:
    call: triggerfish:memory
    with:
      operation: save
      content: "${ .summary }"
      tags: ["github", "issue-summary"]
```

**MCP-Aufrufe:** Der Aufruftyp `triggerfish:mcp` leitet an jedes verbundene
MCP-Server-Werkzeug weiter. Geben Sie den `server`-Namen, den `tool`-Namen und
das `arguments`-Objekt an.

```yaml
- run_lint:
    call: triggerfish:mcp
    with:
      server: eslint
      tool: lint-files
      arguments:
        paths: ["src/"]
```

## Ausdrucke

Workflow-Ausdrucke verwenden die Syntax `${ }` mit Punkt-Pfad-Auflosung gegen
den Datenkontext des Workflows.

```yaml
# Einfache Wertreferenz
url: "${ .config.api_url }"

# Array-Indexierung
first_item: "${ .results[0].name }"

# String-Interpolation (mehrere Ausdrucke in einer Zeichenkette)
message: "Found ${ .count } issues in ${ .repo }"

# Vergleich (gibt Boolean zuruck)
if: "${ .status == 'open' }"

# Arithmetik
total: "${ .price * .quantity }"
```

**Unterstutzte Operatoren:**

- Vergleich: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Arithmetik: `+`, `-`, `*`, `/`, `%`

**Literale:** String (`"value"` oder `'value'`), Zahl (`42`, `3.14`), Boolean
(`true`, `false`), Null (`null`).

Wenn ein `${ }`-Ausdruck der gesamte Wert ist, wird der Rohtyp beibehalten
(Zahl, Boolean, Objekt). Bei Mischung mit Text ist das Ergebnis immer ein
String.

## Vollstandiges Beispiel

Dieser Workflow ruft eine GitHub-Issue ab, fasst sie mit dem LLM zusammen,
speichert die Zusammenfassung im Speicher und sendet eine Benachrichtigung.

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

**Ausfuhren:**

```
workflow_run with name: "summarize-github-issue" and input:
  {"repo": "myorg/myrepo", "issue_number": 42, "github_token": "ghp_..."}
```

## Eingabe- und Ausgabetransformationen

Aufgaben konnen ihre Eingabe vor der Ausfuhrung und ihre Ausgabe vor dem
Speichern der Ergebnisse transformieren.

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

- **`input.from`** — Ausdruck oder Objektzuordnung, die den Eingabekontext der
  Aufgabe vor der Ausfuhrung ersetzt.
- **`output.from`** — Ausdruck oder Objektzuordnung, die das Aufgabenergebnis
  vor dem Speichern im Datenkontext umformt.

## Flusssteuerung

Jede Aufgabe kann eine `then`-Direktive enthalten, die steuert, was als nachstes
passiert:

- **`continue`** (Standard) — fahrt mit der nachsten Aufgabe in der Sequenz fort
- **`end`** — stoppt den Workflow sofort (Status: completed)
- **Aufgabenname** — springt zu einer bestimmten Aufgabe nach Name

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

## Bedingte Ausfuhrung

Jede Aufgabe kann ein `if`-Feld enthalten. Die Aufgabe wird ubersprungen, wenn
die Bedingung als falsch ausgewertet wird.

```yaml
- send_alert:
    if: "${ .severity == 'critical' }"
    call: triggerfish:message
    with:
      channel: telegram
      text: "CRITICAL: ${ .alert_message }"
```

## Sub-Workflows

Eine `run`-Aufgabe mit einem `workflow`-Ziel fuhrt einen anderen gespeicherten
Workflow aus. Der Sub-Workflow lauft mit seinem eigenen Kontext und gibt seine
Ausgabe an den ubergeordneten Workflow zuruck.

```yaml
- enrich_data:
    run:
      workflow:
        name: data-enrichment-pipeline
        input:
          raw_data: "${ .fetched_data }"
```

Sub-Workflows konnen bis zu **5 Ebenen tief** verschachtelt werden. Das
Uberschreiten dieses Limits erzeugt einen Fehler und stoppt die Ausfuhrung.

## Klassifizierung und Sicherheit

Workflows nehmen am selben Klassifizierungssystem teil wie alle anderen
Triggerfish-Daten.

**Speicherklassifizierung.** Wenn Sie einen Workflow mit `workflow_save`
speichern, wird er auf dem Taint-Level der aktuellen Sitzung gespeichert. Ein
Workflow, der wahrend einer `CONFIDENTIAL`-Sitzung gespeichert wurde, kann nur
von Sitzungen auf `CONFIDENTIAL` oder hoher geladen werden.

**Klassifizierungsobergrenze.** Workflows konnen eine `classification_ceiling`
in ihrem YAML deklarieren. Vor der Ausfuhrung jeder Aufgabe pruft die Engine,
ob der aktuelle Taint der Sitzung die Obergrenze nicht uberschreitet. Wenn der
Sitzungs-Taint wahrend der Ausfuhrung uber die Obergrenze eskaliert (z. B. durch
Zugriff auf klassifizierte Daten uber einen Werkzeugaufruf), halt der Workflow
mit einem Obergrenzenverletzungsfehler an.

```yaml
classification_ceiling: INTERNAL
```

Gultige Werte: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

**Ausfuhrungsverlauf.** Ausfuhrungsergebnisse werden mit der Klassifizierung der
Sitzung zum Zeitpunkt der Fertigstellung gespeichert. `workflow_history` filtert
Ergebnisse nach `canFlowTo`, sodass Sie nur Ausfuhrungen sehen, die auf oder
unter Ihrem aktuellen Sitzungs-Taint liegen.

::: danger SICHERHEIT
Das Loschen von Workflows erfordert, dass der Workflow auf dem
Klassifizierungslevel Ihrer aktuellen Sitzung zuganglich ist. Sie konnen keinen
Workflow loschen, der auf `CONFIDENTIAL` gespeichert ist, aus einer
`PUBLIC`-Sitzung. Das Werkzeug `workflow_delete` ladt den Workflow zuerst und
gibt "nicht gefunden" zuruck, wenn die Klassifizierungsprufung fehlschlagt.
:::

## Self-Healing

Workflows konnen optional einen autonomen Healing-Agenten haben, der die
Ausfuhrung in Echtzeit uberwacht, Fehler diagnostiziert und Korrekturen
vorschlagt. Wenn Self-Healing aktiviert ist, wird ein Lead-Agent parallel zur
Workflow-Ausfuhrung gestartet. Dieser beobachtet jedes Schrittereignis, stuft
Fehler ein und koordiniert Spezialistenteams zur Problemlosung.

### Self-Healing aktivieren

Fugen Sie einen `self_healing`-Block im Abschnitt `metadata.triggerfish` des
Workflows hinzu:

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

Wenn `enabled: true` ist, **muss** jeder Schritt drei Metadatenfelder enthalten:

| Field         | Beschreibung                                   |
| ------------- | ---------------------------------------------- |
| `description` | Was der Schritt tut und warum er existiert     |
| `expects`     | Eingabeform oder Vorbedingungen des Schritts   |
| `produces`    | Ausgabeform, die der Schritt erzeugt           |

Der Parser lehnt Workflows ab, in denen bei einem Schritt diese Felder fehlen.

### Konfigurationsoptionen

| Option                    | Type    | Standard             | Beschreibung |
| ------------------------- | ------- | -------------------- | ------------ |
| `enabled`                 | boolean | —                    | Erforderlich. Aktiviert den Healing-Agenten. |
| `retry_budget`            | number  | `3`                  | Maximale Interventionsversuche, bevor als unlosbar eskaliert wird. |
| `approval_required`       | boolean | `true`               | Ob vorgeschlagene Workflow-Korrekturen eine menschliche Genehmigung erfordern. |
| `pause_on_intervention`   | string  | `"blocking_only"`    | Wann nachgelagerte Aufgaben pausiert werden: `always`, `never` oder `blocking_only`. |
| `pause_timeout_seconds`   | number  | `300`                | Sekunden, die bei einer Pause gewartet wird, bevor die Timeout-Richtlinie greift. |
| `pause_timeout_policy`    | string  | `"escalate_and_halt"`| Was bei Timeout geschieht: `escalate_and_halt`, `escalate_and_skip` oder `escalate_and_fail`. |
| `notify_on`               | array   | `[]`                 | Ereignisse, die Benachrichtigungen auslosen: `intervention`, `escalation`, `approval_required`. |

### Funktionsweise

1. **Beobachtung.** Der Healing-Lead-Agent empfangt einen Echtzeit-Strom von
   Schrittereignissen (gestartet, abgeschlossen, fehlgeschlagen, ubersprungen)
   wahrend der Workflow-Ausfuhrung.

2. **Triage.** Wenn ein Schritt fehlschlagt, stuft der Lead den Fehler in eine
   von funf Kategorien ein:

   | Kategorie             | Bedeutung                                        |
   | --------------------- | ------------------------------------------------ |
   | `transient_retry`     | Vorubergehendes Problem (Netzwerkfehler, Rate-Limit, 503) |
   | `runtime_workaround`  | Erstmaliger unbekannter Fehler, mogliche Umgehung |
   | `structural_fix`      | Wiederkehrender Fehler, der eine Workflow-Definitionsanderung erfordert |
   | `plugin_gap`          | Authentifizierungs-/Anmeldedatenproblem, das eine neue Integration erfordert |
   | `unresolvable`        | Retry-Budget erschopft oder grundlegend defekt   |

3. **Spezialistenteams.** Basierend auf der Triage-Kategorie startet der Lead
   ein Team von Spezialagenten (Diagnostiker, Retry-Koordinator,
   Definitionsfixer, Plugin-Autor usw.) zur Untersuchung und Behebung des
   Problems.

4. **Versionsvorschlage.** Wenn eine strukturelle Korrektur notig ist, schlagt
   das Team eine neue Workflow-Version vor. Wenn `approval_required` auf true
   steht, wartet der Vorschlag auf eine menschliche Prufung uber
   `workflow_version_approve` oder `workflow_version_reject`.

5. **Begrenzte Pause.** Wenn `pause_on_intervention` aktiviert ist, werden nur
   nachgelagerte Aufgaben pausiert -- unabhangige Zweige laufen weiter.

### Healing-Werkzeuge

Vier zusatzliche Werkzeuge stehen zur Verwaltung des Healing-Status zur
Verfugung:

| Werkzeug                   | Beschreibung                               |
| -------------------------- | ------------------------------------------ |
| `workflow_version_list`    | Vorgeschlagene/genehmigte/abgelehnte Versionen auflisten |
| `workflow_version_approve` | Eine vorgeschlagene Version genehmigen     |
| `workflow_version_reject`  | Eine vorgeschlagene Version mit Begrundung ablehnen |
| `workflow_healing_status`  | Aktueller Healing-Status einer Workflow-Ausfuhrung |

### Sicherheit

- Der Healing-Agent **kann seine eigene `self_healing`-Konfiguration nicht
  andern**. Versionsvorschlage, die den Config-Block verandern, werden
  abgelehnt.
- Der Lead-Agent und alle Teammitglieder erben das Taint-Level des Workflows
  und eskalieren synchron.
- Alle Agentenaktionen durchlaufen die Standard-Policy-Hook-Kette -- keine
  Umgehungen.
- Vorgeschlagene Versionen werden auf dem Klassifizierungslevel des Workflows
  gespeichert.
