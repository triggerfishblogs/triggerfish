---
title: Fehlerbehebung Workflows
description: Haufige Probleme und Losungen bei der Arbeit mit Triggerfish-Workflows.
---

# Fehlerbehebung: Workflows

## "Workflow not found or not accessible"

Der Workflow existiert, ist aber auf einem hoheren Klassifizierungslevel
gespeichert als der aktuelle Taint Ihrer Sitzung.

Workflows, die wahrend einer `CONFIDENTIAL`-Sitzung gespeichert wurden, sind fur
`PUBLIC`- oder `INTERNAL`-Sitzungen unsichtbar. Der Speicher verwendet
`canFlowTo`-Prufungen bei jedem Laden und gibt `null` zuruck (angezeigt als
"not found"), wenn die Klassifizierung des Workflows den Sitzungs-Taint
uberschreitet.

**Behebung:** Eskalieren Sie Ihren Sitzungs-Taint, indem Sie zuerst auf
klassifizierte Daten zugreifen, oder speichern Sie den Workflow erneut aus einer
Sitzung mit niedrigerem Klassifizierungslevel, wenn der Inhalt dies erlaubt.

**Uberprufung:** Fuhren Sie `workflow_list` aus, um zu sehen, welche Workflows
auf Ihrem aktuellen Klassifizierungslevel sichtbar sind. Wenn der erwartete
Workflow fehlt, wurde er auf einem hoheren Level gespeichert.

---

## "Workflow classification ceiling breached"

Das Taint-Level der Sitzung uberschreitet die `classification_ceiling` des
Workflows. Diese Prufung wird vor jeder Aufgabe ausgefuhrt, sodass sie mitten
in der Ausfuhrung ausgelost werden kann, wenn eine fruhere Aufgabe den
Sitzungs-Taint eskaliert hat.

Zum Beispiel wird ein Workflow mit `classification_ceiling: INTERNAL`
angehalten, wenn ein `triggerfish:memory`-Aufruf `CONFIDENTIAL`-Daten abruft,
die den Sitzungs-Taint eskalieren.

**Behebung:**

- Erhohen Sie die `classification_ceiling` des Workflows, um der erwarteten
  Datensensibilitat zu entsprechen.
- Oder strukturieren Sie den Workflow um, damit keine klassifizierten Daten
  zugegriffen werden. Verwenden Sie Eingabeparameter anstatt klassifizierten
  Speicher zu lesen.

---

## YAML-Analysefehler

### "YAML parse error: ..."

Haufige YAML-Syntaxfehler:

**Einruckung.** YAML ist empfindlich gegenuber Leerzeichen. Verwenden Sie
Leerzeichen, keine Tabs. Jede Verschachtelungsebene sollte genau 2 Leerzeichen
betragen.

```yaml
# Falsch — Tabs oder inkonsistente Einruckung
do:
- fetch:
      call: http

# Richtig
do:
  - fetch:
      call: http
```

**Fehlende Anfuhrungszeichen um Ausdrucke.** Ausdrucks-Strings mit `${ }` mussen
in Anfuhrungszeichen stehen, andernfalls interpretiert YAML `{` als Inline-
Mapping.

```yaml
# Falsch — YAML-Analysefehler
endpoint: ${ .config.url }

# Richtig
endpoint: "${ .config.url }"
```

**Fehlender `document`-Block.** Jeder Workflow muss ein `document`-Feld mit
`dsl`, `namespace` und `name` haben:

```yaml
document:
  dsl: "1.0"
  namespace: my-workflows
  name: my-workflow
```

### "Workflow YAML must be an object"

Das YAML wurde erfolgreich analysiert, aber das Ergebnis ist ein Skalar oder
Array, kein Objekt. Prufen Sie, ob Ihr YAML Schlussel auf oberster Ebene hat
(`document`, `do`).

### "Task has no recognized type"

Jeder Aufgabeneintrag muss genau einen Typschlussel enthalten: `call`, `run`,
`set`, `switch`, `for`, `raise`, `emit` oder `wait`. Wenn der Parser keinen
dieser Schlussel findet, meldet er einen nicht erkannten Typ.

Haufige Ursache: ein Tippfehler im Aufgabentypnamen (z. B. `calls` statt
`call`).

---

## Fehler bei der Ausdrucksauswertung

### Falsche oder leere Werte

Ausdrucke verwenden die Syntax `${ .path.to.value }`. Der fuhrende Punkt ist
erforderlich -- er verankert den Pfad an der Wurzel des Datenkontextes des
Workflows.

```yaml
# Falsch — fehlender fuhrender Punkt
value: "${ result.name }"

# Richtig
value: "${ .result.name }"
```

### "undefined" in der Ausgabe

Der Punkt-Pfad hat zu nichts aufgelost. Haufige Ursachen:

- **Falscher Aufgabenname.** Jede Aufgabe speichert ihr Ergebnis unter ihrem
  eigenen Namen. Wenn Ihre Aufgabe `fetch_data` heisst, referenzieren Sie ihr
  Ergebnis als `${ .fetch_data }`, nicht `${ .data }` oder `${ .result }`.
- **Falsche Verschachtelung.** Wenn der HTTP-Aufruf
  `{"data": {"items": [...]}}` zuruckgibt, befinden sich die Items bei
  `${ .fetch_data.data.items }`.
- **Array-Indexierung.** Verwenden Sie eckige Klammern: `${ .items[0].name }`.
  Reine Punkt-Pfade unterstutzen keine numerischen Indizes.

### Boolesche Bedingungen funktionieren nicht

Ausdrucksvergleiche sind strikt (`===`). Stellen Sie sicher, dass die Typen
ubereinstimmen:

```yaml
# Dies schlagt fehl, wenn .count ein String "0" ist
if: "${ .count == 0 }"

# Funktioniert, wenn .count eine Zahl ist
if: "${ .count == 0 }"
```

Prufen Sie, ob vorgelagerte Aufgaben Strings oder Zahlen zuruckgeben.
HTTP-Antworten geben haufig String-Werte zuruck, die keine Konvertierung fur
den Vergleich benotigen -- vergleichen Sie einfach mit der String-Form.

---

## HTTP-Aufruffehler

### Timeouts

HTTP-Aufrufe gehen uber das Werkzeug `web_fetch`. Wenn der Zielserver langsam
ist, kann die Anfrage ablaufen. Es gibt keine aufgabenspezifische
Timeout-Uberschreibung fur HTTP-Aufrufe im Workflow-DSL -- der Standard-Timeout
des `web_fetch`-Werkzeugs gilt.

### SSRF-Blockierungen

Alle ausgehenden HTTP-Anfragen in Triggerfish losen zuerst DNS auf und prufen
die aufgeloste IP gegen eine fest codierte Sperrliste. Private und reservierte
IP-Bereiche werden immer blockiert.

Wenn Ihr Workflow einen internen Dienst unter einer privaten IP aufruft (z. B.
`http://192.168.1.100/api`), wird er durch die SSRF-Pravention blockiert. Dies
ist beabsichtigt und nicht konfigurierbar.

**Behebung:** Verwenden Sie einen offentlichen Hostnamen, der zu einer
offentlichen IP auflost, oder verwenden Sie `triggerfish:mcp`, um uber einen
MCP-Server zu routen, der direkten Zugriff hat.

### Fehlende Header

Der `http`-Aufruftyp ordnet `with.headers` direkt den Anfrage-Headern zu. Wenn
Ihre API Authentifizierung erfordert, fugen Sie den Header hinzu:

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      headers:
        Authorization: "Bearer ${ .api_token }"
```

Stellen Sie sicher, dass der Token-Wert in der Workflow-Eingabe bereitgestellt
oder von einer vorherigen Aufgabe gesetzt wird.

---

## Sub-Workflow-Rekursionslimit

### "Workflow recursion depth exceeded maximum of 5"

Sub-Workflows konnen bis zu 5 Ebenen tief verschachtelt werden. Dieses Limit
verhindert endlose Rekursion, wenn Workflow A Workflow B aufruft, der wiederum
Workflow A aufruft.

**Behebung:**

- Vereinfachen Sie die Workflow-Kette. Kombinieren Sie Schritte in weniger
  Workflows.
- Prufen Sie auf zirkulare Referenzen, bei denen zwei Workflows sich
  gegenseitig aufrufen.

---

## Shell-Ausfuhrung deaktiviert

### "Shell execution failed" oder leeres Ergebnis von Run-Aufgaben

Das Flag `allowShellExecution` im Workflow-Werkzeugkontext steuert, ob
`run`-Aufgaben mit `shell`- oder `script`-Zielen erlaubt sind. Wenn deaktiviert,
schlagen diese Aufgaben fehl.

**Behebung:** Prufen Sie, ob die Shell-Ausfuhrung in Ihrer
Triggerfish-Konfiguration aktiviert ist. In Produktionsumgebungen kann die
Shell-Ausfuhrung aus Sicherheitsgrunden absichtlich deaktiviert sein.

---

## Workflow lauft, aber produziert falsche Ausgabe

### Fehlersuche mit `workflow_history`

Verwenden Sie `workflow_history`, um vergangene Ausfuhrungen zu inspizieren:

```
workflow_history with workflow_name: "my-workflow" and limit: "5"
```

Jeder Verlaufseintrag enthalt:

- **status** — `completed` oder `failed`
- **error** — Fehlermeldung bei Fehlschlag
- **taskCount** — Anzahl der Aufgaben im Workflow
- **startedAt / completedAt** — Zeitinformationen

### Kontextfluss prufen

Jede Aufgabe speichert ihr Ergebnis im Datenkontext unter dem Aufgabennamen.
Wenn Ihr Workflow Aufgaben namens `fetch`, `transform` und `save` hat, sieht der
Datenkontext nach allen drei Aufgaben so aus:

```json
{
  "fetch": { "...http response..." },
  "transform": { "...transformed data..." },
  "save": { "...save result..." }
}
```

Haufige Fehler:

- **Kontextuberschreibung.** Eine `set`-Aufgabe, die einem bereits vorhandenen
  Schlussel zuweist, ersetzt den vorherigen Wert.
- **Falsche Aufgabenreferenz.** Referenzierung von `${ .step1 }`, wenn die
  Aufgabe `step_1` heisst.
- **Eingabetransformation ersetzt Kontext.** Eine `input.from`-Direktive ersetzt
  den Eingabekontext der Aufgabe vollstandig. Wenn Sie
  `input.from: "${ .config }"` verwenden, sieht die Aufgabe nur das
  `config`-Objekt, nicht den vollstandigen Kontext.

### Fehlende Ausgabe

Wenn der Workflow abschliesst, aber eine leere Ausgabe zuruckgibt, prufen Sie,
ob das Ergebnis der letzten Aufgabe Ihren Erwartungen entspricht. Die
Workflow-Ausgabe ist der vollstandige Datenkontext bei Abschluss, wobei interne
Schlussel herausgefiltert werden.

---

## "Permission denied" bei workflow_delete

Das Werkzeug `workflow_delete` ladt den Workflow zuerst unter Verwendung des
aktuellen Taint-Levels der Sitzung. Wenn der Workflow auf einem
Klassifizierungslevel gespeichert wurde, das Ihren Sitzungs-Taint uberschreitet,
gibt das Laden null zuruck und `workflow_delete` meldet "not found" anstatt
"permission denied."

Dies ist beabsichtigt -- die Existenz klassifizierter Workflows wird Sitzungen
mit niedrigerem Klassifizierungslevel nicht offenbart.

**Behebung:** Eskalieren Sie Ihren Sitzungs-Taint, damit er dem
Klassifizierungslevel des Workflows entspricht oder es ubertrifft, bevor Sie ihn
loschen. Oder loschen Sie ihn aus demselben Sitzungstyp, in dem er ursprunglich
gespeichert wurde.
