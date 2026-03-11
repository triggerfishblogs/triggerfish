# Dateisystem- und Shell-Tools

Triggerfish bietet dem Agenten allgemeine Dateisystem- und Shell-Tools zum Lesen, Schreiben, Suchen und Ausfuehren von Befehlen. Dies sind die grundlegenden Tools, auf denen andere Faehigkeiten (Exec-Umgebung, Explore, Skills) aufbauen.

## Tools

### `read_file`

Liest den Inhalt einer Datei unter einem absoluten Pfad.

| Parameter | Typ    | Erforderlich | Beschreibung                    |
| --------- | ------ | ------------ | ------------------------------- |
| `path`    | string | ja           | Absoluter Dateipfad zum Lesen   |

Gibt den vollstaendigen Textinhalt der Datei zurueck.

### `write_file`

Schreibt Inhalt in eine Datei unter einem workspace-relativen Pfad.

| Parameter | Typ    | Erforderlich | Beschreibung                      |
| --------- | ------ | ------------ | --------------------------------- |
| `path`    | string | ja           | Relativer Pfad im Workspace       |
| `content` | string | ja           | Zu schreibender Dateiinhalt        |

Schreibvorgaenge sind auf das Workspace-Verzeichnis des Agenten beschraenkt. Der Agent kann nicht an beliebige Stellen im Dateisystem schreiben.

### `edit_file`

Ersetzt einen eindeutigen String in einer Datei. Der `old_text` muss genau einmal in der Datei vorkommen.

| Parameter  | Typ    | Erforderlich | Beschreibung                                        |
| ---------- | ------ | ------------ | --------------------------------------------------- |
| `path`     | string | ja           | Absoluter Dateipfad zum Bearbeiten                  |
| `old_text` | string | ja           | Exakter zu findender Text (muss eindeutig in Datei sein) |
| `new_text` | string | ja           | Ersetzungstext                                      |

Dies ist ein chirurgisches Bearbeitungstool -- es findet eine exakte Uebereinstimmung und ersetzt sie. Wenn der Text mehr als einmal oder gar nicht vorkommt, schlaegt die Operation mit einem Fehler fehl.

### `list_directory`

Listet Dateien und Verzeichnisse unter einem gegebenen absoluten Pfad auf.

| Parameter | Typ    | Erforderlich | Beschreibung                               |
| --------- | ------ | ------------ | ------------------------------------------ |
| `path`    | string | ja           | Absoluter Verzeichnispfad zum Auflisten    |

Gibt Eintraege mit `/`-Suffix fuer Verzeichnisse zurueck.

### `search_files`

Sucht nach Dateien, die einem Glob-Pattern entsprechen, oder durchsucht Dateiinhalte mit Grep.

| Parameter        | Typ     | Erforderlich | Beschreibung                                                              |
| ---------------- | ------- | ------------ | ------------------------------------------------------------------------- |
| `path`           | string  | ja           | Verzeichnis, in dem gesucht werden soll                                   |
| `pattern`        | string  | ja           | Glob-Pattern fuer Dateinamen oder Text/Regex zum Durchsuchen von Dateien  |
| `content_search` | boolean | nein         | Wenn `true`, Dateiinhalte statt Dateinamen durchsuchen                    |

### `run_command`

Fuehrt einen Shell-Befehl im Workspace-Verzeichnis des Agenten aus.

| Parameter | Typ    | Erforderlich | Beschreibung                    |
| --------- | ------ | ------------ | ------------------------------- |
| `command` | string | ja           | Auszufuehrender Shell-Befehl    |

Gibt stdout, stderr und Exit-Code zurueck. Befehle werden im Workspace-Verzeichnis des Agenten ausgefuehrt. Der `PRE_TOOL_CALL`-Hook prueft Befehle vor der Ausfuehrung gegen eine Denylist.

## Beziehung zu anderen Tools

Diese Dateisystem-Tools ueberschneiden sich mit den [Exec-Umgebung](../integrations/exec-environment)-Tools (`exec.write`, `exec.read`, `exec.run`, `exec.ls`). Der Unterschied:

- **Dateisystem-Tools** operieren auf absoluten Pfaden und dem Standard-Workspace des Agenten. Sie sind immer verfuegbar.
- **Exec-Tools** operieren innerhalb eines strukturierten Workspace mit expliziter Isolation, Test-Runnern und Paketinstallation. Sie sind Teil der Exec-Umgebung-Integration.

Der Agent verwendet Dateisystem-Tools fuer allgemeine Dateioperationen und Exec-Tools, wenn er in einem Entwicklungs-Workflow arbeitet (Schreiben/Ausfuehren/Reparieren-Schleife).

## Sicherheit

- `write_file` ist auf das Workspace-Verzeichnis des Agenten beschraenkt
- `run_command` durchlaeuft den `PRE_TOOL_CALL`-Hook mit dem Befehl als Kontext
- Eine Befehls-Denylist blockiert gefaehrliche Operationen (`rm -rf /`, `sudo` usw.)
- Alle Tool-Antworten durchlaufen `POST_TOOL_RESPONSE` fuer Klassifizierung und Taint-Tracking
- Im Plan-Modus wird `write_file` blockiert, bis der Plan genehmigt ist
