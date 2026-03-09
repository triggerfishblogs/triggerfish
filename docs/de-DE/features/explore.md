# Codebase-Exploration

Das `explore`-Tool gibt dem Agenten schnelles, strukturiertes Verstaendnis von Codebasen und Verzeichnissen. Anstatt manuell `read_file`, `list_directory` und `search_files` nacheinander aufzurufen, ruft der Agent einmal `explore` auf und erhaelt einen strukturierten Bericht, der von parallelen Sub-Agenten erstellt wurde.

## Tool

### `explore`

Erkunden Sie ein Verzeichnis oder eine Codebase, um Struktur, Muster und Konventionen zu verstehen. Nur-Lese-Zugriff.

| Parameter | Typ    | Erforderlich | Beschreibung                                                        |
| --------- | ------ | ------------ | ------------------------------------------------------------------- |
| `path`    | string | ja           | Zu erkundendes Verzeichnis oder Datei                               |
| `focus`   | string | nein         | Wonach gesucht werden soll (z.B. "auth patterns", "test structure") |
| `depth`   | string | nein         | Wie gruendlich: `shallow`, `standard` (Standard) oder `deep`        |

## Tiefenstufen

| Tiefe      | Erstellte Agenten | Was analysiert wird                                           |
| ---------- | ----------------- | ------------------------------------------------------------- |
| `shallow`  | 2                 | Verzeichnisbaum + Abhaengigkeitsmanifeste                     |
| `standard` | 3-4               | Baum + Manifeste + Code-Patterns + Focus (falls angegeben)    |
| `deep`     | 5-6               | Alles oben + Import-Graph-Verfolgung + Git-History            |

## So funktioniert es

Das explore-Tool erstellt parallele Sub-Agenten, die jeweils auf einen anderen Aspekt fokussiert sind:

1. **Tree-Agent** -- Kartiert Verzeichnisstruktur (3 Ebenen tief), identifiziert Schluesseldateien nach Konvention (`mod.ts`, `main.ts`, `deno.json`, `README.md` usw.)
2. **Manifest-Agent** -- Liest Abhaengigkeitsdateien (`deno.json`, `package.json`, `tsconfig.json`), listet Abhaengigkeiten, Skripte und Einstiegspunkte auf
3. **Pattern-Agent** -- Sampelt Quelldateien, um Coding-Patterns zu erkennen: Modulstruktur, Fehlerbehandlung, Typ-Konventionen, Import-Stil, Benennung, Tests
4. **Focus-Agent** -- Sucht nach Dateien und Mustern bezueglich der Focus-Abfrage
5. **Import-Agent** (nur deep) -- Verfolgt Import-Graphen von Einstiegspunkten, erkennt zirkulaere Abhaengigkeiten
6. **Git-Agent** (nur deep) -- Analysiert aktuelle Commits, aktuellen Branch, uncommitted Changes

Alle Agenten laufen gleichzeitig. Ergebnisse werden in ein strukturiertes `ExploreResult` zusammengefuegt:

```json
{
  "path": "src/core",
  "depth": "standard",
  "tree": "src/core/\n├── types/\n│   ├── classification.ts\n│   ...",
  "key_files": [
    { "path": "src/core/types/classification.ts", "role": "Classification levels" }
  ],
  "patterns": [
    { "name": "Result pattern", "description": "Uses Result<T,E> for error handling", "examples": [...] }
  ],
  "dependencies": "...",
  "focus_findings": "...",
  "summary": "Core module with classification types, policy engine, and session management."
}
```

## Wann der Agent es verwendet

Der Agent ist angewiesen, `explore` in folgenden Situationen zu verwenden:

- Vor dem Aendern von unbekanntem Code
- Wenn gefragt wird "was macht das" oder "wie ist das strukturiert"
- Zu Beginn jeder nicht-trivialen Aufgabe mit bestehendem Code
- Wenn er die richtige Datei oder das richtige Muster finden muss

Nach der Exploration referenziert der Agent die gefundenen Muster und Konventionen beim Schreiben neuen Codes, um Konsistenz mit der bestehenden Codebase sicherzustellen.

## Beispiele

```
# Schneller Ueberblick ueber ein Verzeichnis
explore({ path: "src/auth" })

# Fokussierte Suche nach bestimmten Mustern
explore({ path: "src/auth", focus: "how tokens are validated" })

# Tiefenanalyse einschliesslich Git-History und Import-Graphen
explore({ path: "src/core", depth: "deep" })

# Test-Konventionen verstehen, bevor Tests geschrieben werden
explore({ path: "tests/", focus: "test patterns and assertions" })
```
