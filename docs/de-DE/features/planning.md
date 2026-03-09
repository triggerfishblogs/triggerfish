# Plan-Modus und Aufgabenverfolgung

Triggerfish bietet zwei sich ergaenzende Tools fuer strukturiertes Arbeiten: **Plan-Modus** fuer komplexe Implementierungsplanung und **Todo-Tracking** fuer Aufgabenverwaltung ueber Sessions hinweg.

## Plan-Modus

Der Plan-Modus beschraenkt den Agenten auf Nur-Lese-Exploration und strukturierte Planung, bevor Aenderungen vorgenommen werden. Dies verhindert, dass der Agent in die Implementierung springt, bevor er das Problem verstanden hat.

### Tools

#### `plan_enter`

Plan-Modus betreten. Blockiert Schreiboperationen (`write_file`, `cron_create`, `cron_delete`), bis der Plan genehmigt ist.

| Parameter | Typ    | Erforderlich | Beschreibung                                                         |
| --------- | ------ | ------------ | -------------------------------------------------------------------- |
| `goal`    | string | ja           | Was der Agent zu bauen/aendern plant                                  |
| `scope`   | string | nein         | Exploration auf bestimmte Verzeichnisse oder Module beschraenken      |

#### `plan_exit`

Plan-Modus verlassen und den Implementierungsplan zur Benutzergenehmigung vorlegen. Beginnt **nicht** automatisch mit der Ausfuehrung.

| Parameter | Typ    | Erforderlich | Beschreibung                                                                      |
| --------- | ------ | ------------ | --------------------------------------------------------------------------------- |
| `plan`    | object | ja           | Der Implementierungsplan (Zusammenfassung, Ansatz, Schritte, Risiken, Dateien, Tests) |

Das Plan-Objekt enthaelt:

- `summary` -- Was der Plan erreicht
- `approach` -- Wie es umgesetzt wird
- `alternatives_considered` -- Welche anderen Ansaetze bewertet wurden
- `steps` -- Geordnete Liste von Implementierungsschritten, jeweils mit Dateien, Abhaengigkeiten und Verifikation
- `risks` -- Bekannte Risiken und Abhilfemassnahmen
- `files_to_create`, `files_to_modify`, `tests_to_write`
- `estimated_complexity`

#### `plan_status`

Gibt den aktuellen Plan-Modus-Status zurueck: aktiver Modus, Ziel und Plan-Fortschritt.

#### `plan_approve`

Den ausstehenden Plan genehmigen und mit der Ausfuehrung beginnen. Wird aufgerufen, wenn der Benutzer genehmigt.

#### `plan_reject`

Den ausstehenden Plan ablehnen und zum normalen Modus zurueckkehren.

#### `plan_step_complete`

Einen Plan-Schritt waehrend der Ausfuehrung als abgeschlossen markieren.

| Parameter             | Typ    | Erforderlich | Beschreibung                                  |
| --------------------- | ------ | ------------ | --------------------------------------------- |
| `step_id`             | number | ja           | Die als abgeschlossen zu markierende Schritt-ID |
| `verification_result` | string | ja           | Ausgabe des Verifikationsbefehls               |

#### `plan_complete`

Den gesamten Plan als abgeschlossen markieren.

| Parameter    | Typ    | Erforderlich | Beschreibung                              |
| ------------ | ------ | ------------ | ----------------------------------------- |
| `summary`    | string | ja           | Was erreicht wurde                        |
| `deviations` | array  | nein         | Eventuelle Aenderungen zum urspruenglichen Plan |

#### `plan_modify`

Eine Aenderung an einem genehmigten Plan-Schritt anfordern. Erfordert Benutzergenehmigung.

| Parameter          | Typ    | Erforderlich | Beschreibung                         |
| ------------------ | ------ | ------------ | ------------------------------------ |
| `step_id`          | number | ja           | Welcher Schritt geaendert werden muss |
| `reason`           | string | ja           | Warum die Aenderung noetig ist        |
| `new_description`  | string | ja           | Aktualisierte Schritt-Beschreibung   |
| `new_files`        | array  | nein         | Aktualisierte Dateiliste             |
| `new_verification` | string | nein         | Aktualisierter Verifikationsbefehl   |

### Workflow

```
1. Benutzer fragt nach etwas Komplexem
2. Agent ruft plan_enter({ goal: "..." }) auf
3. Agent erkundet Codebase (nur Nur-Lese-Tools)
4. Agent ruft plan_exit({ plan: { ... } }) auf
5. Benutzer prueft den Plan
6. Benutzer genehmigt --> Agent ruft plan_approve auf
   (oder lehnt ab --> Agent ruft plan_reject auf)
7. Agent fuehrt Schritt fuer Schritt aus, ruft plan_step_complete nach jedem auf
8. Agent ruft plan_complete auf, wenn fertig
```

### Wann Plan-Modus verwendet wird

Der Agent tritt bei komplexen Aufgaben in den Plan-Modus ein: Features bauen, Systeme refaktorisieren, Multi-Datei-Aenderungen implementieren. Fuer einfache Aufgaben (Tippfehler korrigieren, Variable umbenennen) ueberspringt er den Plan-Modus und handelt direkt.

## Todo-Tracking

Der Agent hat eine persistente Todo-Liste zur Verfolgung mehrstufiger Arbeit ueber Sessions hinweg.

### Tools

#### `todo_read`

Liest die aktuelle Todo-Liste. Gibt alle Eintraege mit ihrer ID, Inhalt, Status, Prioritaet und Zeitstempeln zurueck.

#### `todo_write`

Ersetzt die gesamte Todo-Liste. Dies ist ein vollstaendiger Ersatz, kein teilweises Update.

| Parameter | Typ   | Erforderlich | Beschreibung                       |
| --------- | ----- | ------------ | ---------------------------------- |
| `todos`   | array | ja           | Vollstaendige Liste der Todo-Eintraege |

Jeder Todo-Eintrag hat:

| Feld         | Typ    | Werte                                 |
| ------------ | ------ | ------------------------------------- |
| `id`         | string | Eindeutige Kennung                    |
| `content`    | string | Aufgabenbeschreibung                  |
| `status`     | string | `pending`, `in_progress`, `completed` |
| `priority`   | string | `high`, `medium`, `low`               |
| `created_at` | string | ISO-Zeitstempel                       |
| `updated_at` | string | ISO-Zeitstempel                       |

### Verhalten

- Todos sind pro Agent skaliert (nicht pro Session) -- sie bleiben ueber Sessions, Trigger-Wakeups und Neustarts hinweg erhalten
- Der Agent verwendet Todos nur fuer wirklich komplexe Aufgaben (3+ einzelne Schritte)
- Ein Task ist gleichzeitig `in_progress`; abgeschlossene Eintraege werden sofort markiert
- Wenn der Agent eine neue Liste schreibt, die zuvor gespeicherte Eintraege auslässt, werden diese automatisch als `completed` beibehalten
- Wenn alle Eintraege `completed` sind, werden alte Eintraege nicht beibehalten (sauberer Zustand)

### Anzeige

Todos werden sowohl im CLI als auch in Tidepool gerendert:

- **CLI** -- Gestylte ANSI-Box mit Status-Symbolen: `✓` (abgeschlossen, durchgestrichen), `▶` (in Bearbeitung, fett), `○` (ausstehend)
- **Tidepool** -- HTML-Liste mit CSS-Klassen fuer jeden Status
