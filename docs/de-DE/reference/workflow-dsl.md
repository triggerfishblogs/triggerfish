---
title: Workflow-DSL-Referenz
description: Vollstandige Referenz fur die CNCF Serverless Workflow DSL 1.0, wie sie in Triggerfish implementiert ist.
---

# Workflow-DSL-Referenz

Vollstandige Referenz fur die CNCF Serverless Workflow DSL 1.0, wie sie in der
Workflow-Engine von Triggerfish implementiert ist. Fur Nutzungsanleitung und
Beispiele siehe [Workflows](/de-DE/features/workflows).

## Dokumentstruktur

Jedes Workflow-YAML muss ein `document`-Feld auf oberster Ebene und einen
`do`-Block haben.

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

### Dokumentmetadaten

| Field         | Type   | Required | Beschreibung                                 |
| ------------- | ------ | -------- | -------------------------------------------- |
| `dsl`         | string | yes      | DSL-Version. Muss `"1.0"` sein               |
| `namespace`   | string | yes      | Logische Gruppierung (z. B. `ops`, `reports`) |
| `name`        | string | yes      | Eindeutiger Workflow-Name innerhalb des Namespace |
| `version`     | string | no       | Semantische Versionszeichenkette             |
| `description` | string | no       | Menschenlesbare Beschreibung                 |

### Felder auf oberster Ebene

| Field                     | Type         | Required | Beschreibung                                |
| ------------------------- | ------------ | -------- | ------------------------------------------- |
| `document`                | object       | yes      | Dokumentmetadaten (siehe oben)              |
| `do`                      | array        | yes      | Geordnete Liste von Aufgabeneintragen       |
| `classification_ceiling`  | string       | no       | Maximal erlaubter Sitzungs-Taint wahrend der Ausfuhrung |
| `input`                   | transform    | no       | Transformation fur die Workflow-Eingabe      |
| `output`                  | transform    | no       | Transformation fur die Workflow-Ausgabe      |
| `timeout`                 | object       | no       | Workflow-Timeout (`after: <ISO 8601>`)       |
| `metadata`                | object       | no       | Beliebige Schlussel-Wert-Metadaten          |

---

## Aufgabeneintragsformat

Jeder Eintrag im `do`-Block ist ein Objekt mit einem einzelnen Schlussel. Der
Schlussel ist der Aufgabenname, der Wert ist die Aufgabendefinition.

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

Aufgabennamen mussen innerhalb desselben `do`-Blocks eindeutig sein. Das
Aufgabenergebnis wird im Datenkontext unter dem Aufgabennamen gespeichert.

---

## Gemeinsame Aufgabenfelder

Alle Aufgabentypen teilen diese optionalen Felder:

| Field      | Type      | Beschreibung                                        |
| ---------- | --------- | --------------------------------------------------- |
| `if`       | string    | Ausdrucksbedingung. Aufgabe wird ubersprungen, wenn falsch. |
| `input`    | transform | Transformation vor der Aufgabenausfuhrung           |
| `output`   | transform | Transformation nach der Aufgabenausfuhrung          |
| `timeout`  | object    | Aufgaben-Timeout: `after: <ISO 8601-Dauer>`         |
| `then`     | string    | Flussdirektive: `continue`, `end` oder Aufgabenname |
| `metadata` | object    | Beliebige Schlussel-Wert-Metadaten (nicht von der Engine verwendet) |

---

## Aufgabentypen

### `call`

Versand an einen HTTP-Endpunkt oder Triggerfish-Dienst.

| Field  | Type   | Required | Beschreibung                                      |
| ------ | ------ | -------- | ------------------------------------------------- |
| `call` | string | yes      | Aufruftyp (siehe Versandtabelle unten)            |
| `with` | object | no       | Argumente fur das Zielwerkzeug                    |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

Fuhrt einen Shell-Befehl, ein Inline-Script oder einen Sub-Workflow aus. Das
Feld `run` muss genau eines von `shell`, `script` oder `workflow` enthalten.

**Shell:**

| Field                  | Type   | Required | Beschreibung             |
| ---------------------- | ------ | -------- | ------------------------ |
| `run.shell.command`    | string | yes      | Auszufuhrender Shell-Befehl |
| `run.shell.arguments`  | object | no       | Benannte Argumente       |
| `run.shell.environment`| object | no       | Umgebungsvariablen       |

**Script:**

| Field                  | Type   | Required | Beschreibung             |
| ---------------------- | ------ | -------- | ------------------------ |
| `run.script.language`  | string | yes      | Scriptsprache            |
| `run.script.code`      | string | yes      | Inline-Scriptcode        |
| `run.script.arguments` | object | no       | Benannte Argumente       |

**Sub-Workflow:**

| Field                | Type   | Required | Beschreibung                 |
| -------------------- | ------ | -------- | ---------------------------- |
| `run.workflow.name`  | string | yes      | Name des gespeicherten Workflows |
| `run.workflow.version` | string | no     | Versionsbeschrankung         |
| `run.workflow.input` | object | no       | Eingabedaten fur den Sub-Workflow |

### `set`

Weist dem Datenkontext Werte zu.

| Field | Type   | Required | Beschreibung                                     |
| ----- | ------ | -------- | ------------------------------------------------ |
| `set` | object | yes      | Schlussel-Wert-Paare zur Zuweisung. Werte konnen Ausdrucke sein. |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

Bedingte Verzweigung. Das Feld `switch` ist ein Array von Falleintragen. Jeder
Fall ist ein Objekt mit einem einzelnen Schlussel, wobei der Schlussel der
Fallname ist.

| Fallfeld   | Type   | Required | Beschreibung                                    |
| ---------- | ------ | -------- | ----------------------------------------------- |
| `when`     | string | no       | Ausdrucksbedingung. Fur den Standardfall weglassen. |
| `then`     | string | yes      | Flussdirektive: `continue`, `end` oder Aufgabenname |

Falle werden der Reihe nach ausgewertet. Der erste Fall mit wahrem `when` (oder
ohne `when`) wird genommen.

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

Iteriert uber eine Sammlung.

| Field      | Type   | Required | Beschreibung                                 |
| ---------- | ------ | -------- | -------------------------------------------- |
| `for.each` | string | yes      | Variablenname fur das aktuelle Element       |
| `for.in`   | string | yes      | Ausdruck, der die Sammlung referenziert      |
| `for.at`   | string | no       | Variablenname fur den aktuellen Index        |
| `do`       | array  | yes      | Verschachtelte Aufgabenliste fur jede Iteration |

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

Halt den Workflow mit einem strukturierten Fehler an.

| Field                | Type   | Required | Beschreibung             |
| -------------------- | ------ | -------- | ------------------------ |
| `raise.error.status` | number | yes      | HTTP-artiger Statuscode  |
| `raise.error.type`   | string | yes      | Fehlertyp-URI/Zeichenkette |
| `raise.error.title`  | string | yes      | Menschenlesbarer Titel   |
| `raise.error.detail` | string | no       | Detaillierte Fehlermeldung |

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

Zeichnet ein Workflow-Ereignis auf. Ereignisse werden im Ausfuhrungsergebnis
gespeichert.

| Field                | Type   | Required | Beschreibung             |
| -------------------- | ------ | -------- | ------------------------ |
| `emit.event.type`    | string | yes      | Ereignistypbezeichner    |
| `emit.event.source`  | string | no       | Ereignisquell-URI        |
| `emit.event.data`    | object | no       | Ereignis-Payload         |

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

Pausiert die Ausfuhrung fur eine Dauer.

| Field  | Type   | Required | Beschreibung                       |
| ------ | ------ | -------- | ---------------------------------- |
| `wait` | string | yes      | ISO 8601-Dauer (z. B. `PT5S`)     |

Haufige Dauern: `PT1S` (1 Sekunde), `PT30S` (30 Sekunden), `PT1M` (1 Minute),
`PT5M` (5 Minuten).

---

## Aufruf-Versandtabelle

Ordnet den Wert des Feldes `call` dem tatsachlich aufgerufenen
Triggerfish-Werkzeug zu.

| `call`-Wert            | Aufgerufenes Werkzeug | Erforderliche `with:`-Felder                   |
| ---------------------- | --------------------- | ---------------------------------------------- |
| `http`                 | `web_fetch`           | `endpoint` oder `url`; optional `method`, `headers`, `body` |
| `triggerfish:llm`      | `llm_task`            | `prompt` oder `task`; optional `tools`, `max_iterations`    |
| `triggerfish:agent`    | `subagent`            | `prompt` oder `task`; optional `tools`, `agent`             |
| `triggerfish:memory`   | `memory_*`            | `operation` (`save`/`search`/`get`/`list`/`delete`) + Operationsfelder |
| `triggerfish:web_search` | `web_search`        | `query`; optional `max_results`                |
| `triggerfish:web_fetch`  | `web_fetch`         | `url`; optional `method`, `headers`, `body`    |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`; optional `arguments`      |
| `triggerfish:message`  | `send_message`        | `channel`, `text`; optional `recipient`        |

Nicht unterstutzte CNCF-Aufruftypen (`grpc`, `openapi`, `asyncapi`) geben einen
Fehler zuruck.

---

## Ausdruckssyntax

Ausdrucke werden durch `${ }` begrenzt und losen gegen den Datenkontext des
Workflows auf.

### Punkt-Pfad-Auflosung

| Syntax                  | Beschreibung                        | Beispielergebnis     |
| ----------------------- | ----------------------------------- | -------------------- |
| `${ . }`                | Gesamter Datenkontext               | `{...}`              |
| `${ .key }`             | Schlussel auf oberster Ebene        | `"value"`            |
| `${ .a.b.c }`           | Verschachtelter Schlussel           | `"deep value"`       |
| `${ .items[0] }`        | Array-Index                         | `{...erstes Element...}` |
| `${ .items[0].name }`   | Array-Index dann Schlussel          | `"first"`            |

Der fuhrende Punkt (oder `$.`) verankert den Pfad an der Kontextwurzel. Pfade,
die zu `undefined` auflosen, erzeugen eine leere Zeichenkette bei Interpolation
oder `undefined` bei Verwendung als eigenstandiger Wert.

### Operatoren

| Typ        | Operatoren                   | Beispiel                       |
| ---------- | ---------------------------- | ------------------------------ |
| Vergleich  | `==`, `!=`, `>`, `<`, `>=`, `<=` | `${ .count > 0 }`         |
| Arithmetik | `+`, `-`, `*`, `/`, `%`      | `${ .price * .quantity }`      |

Vergleichsausdrucke geben `true` oder `false` zuruck. Arithmetische Ausdrucke
geben eine Zahl zuruck (`undefined`, wenn ein Operand nicht numerisch ist oder
Division durch Null).

### Literale

| Typ     | Beispiele                |
| ------- | ------------------------ |
| String  | `"hello"`, `'hello'`     |
| Zahl    | `42`, `3.14`, `-1`       |
| Boolean | `true`, `false`          |
| Null    | `null`                   |

### Interpolationsmodi

**Einzelner Ausdruck (Rohwert):** Wenn die gesamte Zeichenkette ein
`${ }`-Ausdruck ist, wird der typisierte Rohwert zuruckgegeben (Zahl, Boolean,
Objekt, Array).

```yaml
count: "${ .items.length }"  # gibt eine Zahl zuruck, keinen String
```

**Gemischt / mehrere Ausdrucke (String):** Wenn `${ }`-Ausdrucke mit Text
gemischt sind oder es mehrere Ausdrucke gibt, ist das Ergebnis immer ein String.

```yaml
message: "Found ${ .count } items in ${ .category }"  # gibt einen String zuruck
```

### Wahrheitswerte

Fur `if:`-Bedingungen und `switch`-`when:`-Ausdrucke werden Werte mit
JavaScript-artiger Wahrheitsbewertung ausgewertet:

| Wert                          | Wahr?   |
| ----------------------------- | ------- |
| `true`                        | ja      |
| Zahl ungleich Null            | ja      |
| Nicht-leere Zeichenkette      | ja      |
| Nicht-leeres Array            | ja      |
| Objekt                        | ja      |
| `false`, `0`, `""`, `null`, `undefined`, leeres Array | nein |

---

## Eingabe-/Ausgabetransformationen

Transformationen formen Daten um, die in Aufgaben hinein- und herausfliessen.

### `input`

Wird vor der Aufgabenausfuhrung angewandt. Ersetzt die Sicht der Aufgabe auf
den Datenkontext.

```yaml
- step:
    call: http
    input:
      from: "${ .config }"       # Aufgabe sieht nur das Config-Objekt
    with:
      endpoint: "${ .api_url }"  # aufgelost gegen das Config-Objekt
```

**`from` als String:** Ausdruck, der den gesamten Eingabekontext ersetzt.

**`from` als Objekt:** Ordnet neue Schlussel Ausdrucken zu:

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

Wird nach der Aufgabenausfuhrung angewandt. Formt das Ergebnis um, bevor es im
Kontext unter dem Aufgabennamen gespeichert wird.

```yaml
- fetch:
    call: http
    output:
      from:
        items: "${ .fetch.data.results }"
        count: "${ .fetch.data.total }"
```

---

## Flussdirektiven

Das Feld `then` bei jeder Aufgabe steuert den Ausfuhrungsfluss nach Abschluss
der Aufgabe.

| Wert         | Verhalten                                           |
| ------------ | --------------------------------------------------- |
| `continue`   | Fahrt mit der nachsten Aufgabe in der Sequenz fort (Standard) |
| `end`        | Stoppt den Workflow. Status: `completed`.           |
| `<Aufgabenname>` | Springt zur benannten Aufgabe. Die Aufgabe muss im selben `do`-Block existieren. |

Switch-Falle verwenden ebenfalls Flussdirektiven in ihrem `then`-Feld.

---

## Klassifizierungsobergrenze

Optionales Feld, das den maximalen Sitzungs-Taint wahrend der Ausfuhrung
einschrankt.

```yaml
classification_ceiling: INTERNAL
```

| Wert           | Bedeutung                                            |
| -------------- | ---------------------------------------------------- |
| `PUBLIC`       | Workflow halt an, wenn klassifizierte Daten zugegriffen werden |
| `INTERNAL`     | Erlaubt `PUBLIC`- und `INTERNAL`-Daten               |
| `CONFIDENTIAL` | Erlaubt bis zu `CONFIDENTIAL`-Daten                 |
| `RESTRICTED`   | Erlaubt alle Klassifizierungsstufen                  |
| *(weggelassen)*| Keine Obergrenze durchgesetzt                        |

Die Obergrenze wird vor jeder Aufgabe gepruft. Wenn der Sitzungs-Taint die
Obergrenze uberschritten hat (z. B. weil eine vorherige Aufgabe auf
klassifizierte Daten zugegriffen hat), halt der Workflow mit Status `failed`
und Fehler `Workflow classification ceiling breached` an.

---

## Speicherung

### Workflow-Definitionen

Gespeichert mit Schlusselprafix `workflows:{name}`. Jeder gespeicherte Datensatz
enthalt:

| Field            | Type   | Beschreibung                             |
| ---------------- | ------ | ---------------------------------------- |
| `name`           | string | Workflow-Name                            |
| `yaml`           | string | Rohe YAML-Definition                     |
| `classification` | string | Klassifizierungslevel zum Zeitpunkt des Speicherns |
| `savedAt`        | string | ISO 8601-Zeitstempel                     |
| `description`    | string | Optionale Beschreibung                   |

### Ausfuhrungsverlauf

Gespeichert mit Schlusselprafix `workflow-runs:{runId}`. Jeder
Ausfuhrungsdatensatz enthalt:

| Field            | Type   | Beschreibung                             |
| ---------------- | ------ | ---------------------------------------- |
| `runId`          | string | UUID dieser Ausfuhrung                   |
| `workflowName`   | string | Name des ausgefuhrten Workflows          |
| `status`         | string | `completed`, `failed` oder `cancelled`   |
| `output`         | object | Endgultiger Datenkontext (interne Schlussel gefiltert) |
| `events`         | array  | Wahrend der Ausfuhrung ausgegebene Ereignisse |
| `error`          | string | Fehlermeldung (wenn Status `failed`)     |
| `startedAt`      | string | ISO 8601-Zeitstempel                     |
| `completedAt`    | string | ISO 8601-Zeitstempel                     |
| `taskCount`      | number | Anzahl der Aufgaben im Workflow          |
| `classification` | string | Sitzungs-Taint bei Abschluss             |

---

## Grenzen

| Grenze                   | Wert  | Beschreibung                             |
| ------------------------ | ----- | ---------------------------------------- |
| Maximale Sub-Workflow-Tiefe | 5  | Maximale Verschachtelung von `run.workflow`-Aufrufen |
| Standardlimit Verlauf   | 10    | Standard-`limit` fur `workflow_history`  |

---

## Ausfuhrungsstatus

| Status      | Beschreibung                                         |
| ----------- | ---------------------------------------------------- |
| `pending`   | Der Workflow wurde erstellt, aber nicht gestartet    |
| `running`   | Der Workflow wird derzeit ausgefuhrt                 |
| `completed` | Alle Aufgaben erfolgreich abgeschlossen (oder `then: end`) |
| `failed`    | Eine Aufgabe ist fehlgeschlagen, ein `raise` wurde ausgelost oder Obergrenze verletzt |
| `cancelled` | Die Ausfuhrung wurde extern abgebrochen              |
