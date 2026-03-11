# Agent-Ausfuehrungsumgebung

Die Agent-Ausfuehrungsumgebung ist Triggerfishs Selbstentwicklungsfaehigkeit -- ein erstklassiger Code-Workspace, in dem der Agent Code schreiben, ausfuehren, Ausgaben und Fehler beobachten, Probleme beheben und iterieren kann, bis etwas funktioniert. Dies ermoeglicht es dem Agenten, Integrationen zu erstellen, Ideen zu testen und neue Tools eigenstaendig zu entwickeln.

## Nicht die Plugin-Sandbox

Die Ausfuehrungsumgebung unterscheidet sich grundlegend von der [Plugin-Sandbox](./plugins). Das Verstaendnis des Unterschieds ist wichtig:

- Die **Plugin-Sandbox** schuetzt das System **VOR** nicht vertrauenswuerdigem Drittanbieter-Code
- Die **Exec-Umgebung** befaehigt den Agenten, eigenen Code zu schreiben, auszufuehren und zu debuggen

Die Plugin-Sandbox ist defensiv. Die Exec-Umgebung ist produktiv. Sie dienen entgegengesetzten Zwecken und haben unterschiedliche Sicherheitsprofile.

| Aspekt              | Plugin-Sandbox                     | Agent-Exec-Umgebung                |
| ------------------- | ---------------------------------- | ---------------------------------- |
| **Zweck**           | System VOR nicht vertrauenswuerdigem Code schuetzen | Agent befaehigen, Dinge zu erstellen |
| **Dateisystem**     | Keins (vollstaendig sandboxed)     | Nur Workspace-Verzeichnis          |
| **Netzwerk**        | Nur deklarierte Endpunkte          | Policy-gesteuerte Allow/Deny-Listen |
| **Paketinstallation** | Nicht erlaubt                    | Erlaubt (npm, pip, deno add)       |
| **Ausfuehrungszeit** | Striktes Timeout                  | Grosszuegiges Timeout (konfigurierbar) |
| **Iteration**       | Einzelausfuehrung                  | Unbegrenzte Write/Run/Fix-Schleifen |
| **Persistenz**      | Kurzlebig                          | Workspace bleibt ueber Sessions erhalten |

## Die Feedback-Schleife

Das zentrale Qualitaetsmerkmal. Dies ist dasselbe Muster, das Werkzeuge wie Claude Code effektiv macht -- ein enger Write/Run/Fix-Zyklus, bei dem der Agent genau das sieht, was ein menschlicher Entwickler sehen wuerde.

### Schritt 1: Schreiben

Der Agent erstellt oder aendert Dateien in seinem Workspace mit `write_file`. Der Workspace ist ein echtes Dateisystem-Verzeichnis, das auf den aktuellen Agenten beschraenkt ist.

### Schritt 2: Ausfuehren

Der Agent fuehrt den Code ueber `run_command` aus und erhaelt die vollstaendige stdout-, stderr- und Exit-Code-Ausgabe. Keine Ausgabe wird verborgen oder zusammengefasst. Der Agent sieht genau das, was Sie in einem Terminal sehen wuerden.

### Schritt 3: Beobachten

Der Agent liest die vollstaendige Ausgabe. Wenn Fehler auftraten, sieht er den vollstaendigen Stack-Trace, Fehlermeldungen und Diagnoseausgaben. Wenn Tests fehlschlugen, sieht er, welche Tests fehlgeschlagen sind und warum.

### Schritt 4: Beheben

Der Agent bearbeitet den Code basierend auf seinen Beobachtungen, indem er `write_file` oder `edit_file` verwendet, um bestimmte Dateien zu aktualisieren.

### Schritt 5: Wiederholen

Der Agent fuehrt erneut aus. Diese Schleife wird fortgesetzt, bis der Code funktioniert -- Tests bestanden, korrekte Ausgabe erzeugt oder das angegebene Ziel erreicht.

### Schritt 6: Persistieren

Sobald der Code funktioniert, kann der Agent seine Arbeit als [Skill](./skills) (SKILL.md + unterstuetzende Dateien) speichern, als Integration registrieren, in einen Cron-Job verdrahten oder als Tool verfuegbar machen.

::: tip Der Persistierungsschritt macht die Exec-Umgebung zu mehr als einem Notizblock. Funktionierender Code verschwindet nicht einfach -- der Agent kann ihn in einen wiederverwendbaren Skill verpacken, der nach Zeitplan laeuft, auf Trigger reagiert oder bei Bedarf aufgerufen wird. :::

## Verfuegbare Tools

| Tool             | Beschreibung                                     | Ausgabe                                  |
| ---------------- | ------------------------------------------------ | ---------------------------------------- |
| `write_file`     | Datei im Workspace schreiben oder ueberschreiben | Dateipfad, geschriebene Bytes            |
| `read_file`      | Dateiinhalte aus dem Workspace lesen              | Dateiinhalte als String                  |
| `edit_file`      | Gezielte Aenderungen an einer Datei vornehmen     | Aktualisierte Dateiinhalte               |
| `run_command`    | Shell-Befehl im Workspace ausfuehren              | stdout, stderr, Exit-Code, Dauer         |
| `list_directory` | Dateien im Workspace auflisten (rekursiv optional) | Dateiliste mit Groessen                 |
| `search_files`   | Dateiinhalte durchsuchen (grep-aehnlich)          | Uebereinstimmende Zeilen mit Datei:Zeile-Referenzen |

## Workspace-Struktur

Jeder Agent erhaelt ein isoliertes Workspace-Verzeichnis, das ueber Sessions hinweg bestehen bleibt:

```
~/.triggerfish/workspace/
  <agent-id>/                     # Pro-Agent-Workspace
    scratch/                      # Temporaere Arbeitsdateien
    integrations/                 # Integration-Code in Entwicklung
      notion-sync/
        index.ts
        index_test.ts
        package.json
      salesforce-report/
        main.py
        test_main.py
    skills/                       # Skills in Erstellung
      morning-briefing/
        SKILL.md
        briefing.ts
    .exec_history                 # Ausfuehrungsprotokoll fuer Audit
  background/
    <session-id>/                 # Temporaerer Workspace fuer Hintergrundaufgaben
```

Workspaces sind zwischen Agenten isoliert. Ein Agent kann nicht auf den Workspace eines anderen Agenten zugreifen. Hintergrundaufgaben (Cron-Jobs, Trigger) erhalten ihren eigenen temporaeren Workspace, der auf die Session beschraenkt ist.

## Integrations-Entwicklungsablauf

Wenn Sie den Agenten bitten, eine neue Integration zu erstellen (zum Beispiel "Verbinde dich mit meinem Notion und synchronisiere Aufgaben"), folgt der Agent einem natuerlichen Entwicklungsworkflow:

1. **Erkunden** -- Verwendet `run_command`, um API-Endpunkte zu testen, Authentifizierung zu pruefen, Antwortstrukturen zu verstehen
2. **Geruest erstellen** -- Schreibt Integrations-Code mit `write_file`, erstellt eine Testdatei daneben
3. **Testen** -- Fuehrt Tests mit `run_command` aus, sieht Fehler, iteriert
4. **Abhaengigkeiten installieren** -- Verwendet `run_command`, um erforderliche Pakete hinzuzufuegen (npm, pip, deno add)
5. **Iterieren** -- Write/Run/Fix-Schleife bis Tests bestanden und die Integration End-to-End funktioniert
6. **Persistieren** -- Speichert als Skill (schreibt SKILL.md mit Metadaten) oder verdrahtet in einen Cron-Job
7. **Genehmigung** -- Selbst erstellter Skill geht in den `PENDING_APPROVAL`-Status; Sie pruefen und genehmigen

## Sprach- und Laufzeitunterstuetzung

Die Ausfuehrungsumgebung laeuft auf dem Host-System (nicht in WASM), mit Zugriff auf mehrere Laufzeiten:

| Laufzeit | Verfuegbar ueber                  | Anwendungsfall                      |
| -------- | --------------------------------- | ----------------------------------- |
| Deno     | Direkte Ausfuehrung               | TypeScript/JavaScript (erstklassig) |
| Node.js  | `run_command node`                | npm-Oekosystem-Zugriff              |
| Python   | `run_command python`              | Data Science, ML, Scripting         |
| Shell    | `run_command sh` / `run_command bash` | System-Automatisierung, Glue-Skripte |

Der Agent kann verfuegbare Laufzeiten erkennen und die beste fuer die Aufgabe waehlen. Paketinstallation funktioniert ueber die Standard-Toolchain jeder Laufzeit.

## Sicherheitsgrenzen

Die Exec-Umgebung ist permissiver als die Plugin-Sandbox, aber bei jedem Schritt Policy-kontrolliert.

### Policy-Integration

- Jeder `run_command`-Aufruf loest den `PRE_TOOL_CALL`-Hook mit dem Befehl als Kontext aus
- Die Befehls-Allowlist/-Denylist wird vor der Ausfuehrung geprueft
- Die Ausgabe wird erfasst und durch den `POST_TOOL_RESPONSE`-Hook geleitet
- Netzwerk-Endpunkte, auf die waehrend der Ausfuehrung zugegriffen wird, werden ueber Lineage verfolgt
- Wenn Code auf klassifizierte Daten zugreift (zum Beispiel von einer CRM-API liest), eskaliert der Session-Taint
- Die Ausfuehrungshistorie wird in `.exec_history` fuer Auditzwecke protokolliert

### Harte Grenzen

Diese Grenzen werden nie ueberschritten, unabhaengig von der Konfiguration:

- Kann nicht ausserhalb des Workspace-Verzeichnisses schreiben
- Kann keine Befehle auf der Denylist ausfuehren (`rm -rf /`, `sudo`, usw.)
- Kann nicht auf Workspaces anderer Agenten zugreifen
- Alle Netzwerkaufrufe unterliegen Policy-Hooks
- Alle Ausgaben werden klassifiziert und tragen zum Session-Taint bei
- Ressourcenlimits werden durchgesetzt: Speicherplatz, CPU-Zeit pro Ausfuehrung, Arbeitsspeicher

::: warning SICHERHEIT Jeder Befehl, den der Agent ausfuehrt, durchlaeuft den `PRE_TOOL_CALL`-Hook. Die Policy-Engine prueft ihn gegen die Befehls-Allowlist/-Denylist, bevor die Ausfuehrung beginnt. Gefaehrliche Befehle werden deterministisch blockiert -- das LLM kann diese Entscheidung nicht beeinflussen. :::

### Enterprise-Kontrollen

Enterprise-Administratoren haben zusaetzliche Kontrollen ueber die Exec-Umgebung:

- **Exec vollstaendig deaktivieren** fuer bestimmte Agenten oder Rollen
- **Verfuegbare Laufzeiten einschraenken** (zum Beispiel nur Deno erlauben, Python und Shell blockieren)
- **Ressourcenlimits setzen** pro Agent (Speicherplatz-Kontingent, CPU-Zeit, Arbeitsspeicher-Obergrenze)
- **Genehmigung erfordern** fuer alle Exec-Operationen ueber einem Klassifizierungsschwellenwert
- **Benutzerdefinierte Befehls-Denylist** ueber die Standard-Liste gefaehrlicher Befehle hinaus
