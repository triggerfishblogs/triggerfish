# Tide Pool / A2UI

Der Tide Pool ist ein agentengesteuerter visueller Workspace, in dem Triggerfish interaktive Inhalte rendert: Dashboards, Diagramme, Formulare, Code-Vorschauen und Rich Media. Im Gegensatz zum Chat, der ein lineares Gespraech ist, ist der Tide Pool eine Leinwand, die der Agent steuert.

## Was ist A2UI?

A2UI (Agent-to-UI) ist das Protokoll, das den Tide Pool antreibt. Es definiert, wie der Agent visuelle Inhalte und Updates in Echtzeit an verbundene Clients sendet. Der Agent entscheidet, was angezeigt wird; der Client rendert es.

## Architektur

<img src="/diagrams/tidepool-architecture.svg" alt="Tide Pool A2UI-Architektur: Agent sendet Inhalte ueber Gateway an den Tide Pool Renderer auf verbundenen Clients" style="max-width: 100%;" />

Der Agent verwendet das `tide_pool`-Tool, um Inhalte an den Tide Pool Host zu senden, der im Gateway laeuft. Der Host leitet Updates ueber WebSocket an jeden verbundenen Tide Pool Renderer auf einer unterstuetzten Plattform weiter.

## Tide Pool Tools

Der Agent interagiert mit dem Tide Pool ueber diese Tools:

| Tool              | Beschreibung                                        | Anwendungsfall                                               |
| ----------------- | --------------------------------------------------- | ------------------------------------------------------------ |
| `tidepool_render` | Rendert einen Komponentenbaum im Workspace          | Dashboards, Formulare, Visualisierungen, Rich Content        |
| `tidepool_update` | Aktualisiert die Props einer einzelnen Komponente nach ID | Inkrementelle Updates ohne Ersetzen der gesamten Ansicht |
| `tidepool_clear`  | Leert den Workspace, entfernt alle Komponenten      | Session-Uebergaenge, Neustart                                |

### Legacy-Aktionen

Der zugrunde liegende Host unterstuetzt auch Low-Level-Aktionen fuer Abwaertskompatibilitaet:

| Aktion     | Beschreibung                           |
| ---------- | -------------------------------------- |
| `push`     | Rohen HTML/JS-Inhalt senden            |
| `eval`     | JavaScript in der Sandbox ausfuehren   |
| `reset`    | Alle Inhalte leeren                    |
| `snapshot` | Als Bild erfassen                      |

## Anwendungsfaelle

Der Tide Pool ist fuer Szenarien konzipiert, in denen Chat allein nicht ausreicht:

- **Dashboards** -- Der Agent erstellt ein Live-Dashboard, das Metriken aus Ihren verbundenen Integrationen zeigt.
- **Datenvisualisierung** -- Diagramme und Graphen, die aus Abfrageergebnissen gerendert werden.
- **Formulare und Eingaben** -- Interaktive Formulare fuer strukturierte Datenerfassung.
- **Code-Vorschauen** -- Syntaxhervorgehobener Code mit Live-Ausfuehrungsergebnissen.
- **Rich Media** -- Bilder, Karten und eingebettete Inhalte.
- **Kollaboratives Bearbeiten** -- Der Agent praesentiert ein Dokument zur Ueberpruefung und Annotation.

## So funktioniert es

1. Sie bitten den Agenten, etwas zu visualisieren (oder der Agent entscheidet, dass eine visuelle Antwort angemessen ist).
2. Der Agent verwendet die `push`-Aktion, um HTML und JavaScript an den Tide Pool zu senden.
3. Der Tide Pool Host des Gateways empfaengt den Inhalt und leitet ihn an verbundene Clients weiter.
4. Der Renderer zeigt den Inhalt in Echtzeit an.
5. Der Agent kann `eval` verwenden, um inkrementelle Updates vorzunehmen, ohne die gesamte Ansicht zu ersetzen.
6. Wenn sich der Kontext aendert, verwendet der Agent `reset`, um den Workspace zu leeren.

## Sicherheitsintegration

Tide-Pool-Inhalte unterliegen derselben Sicherheitsdurchsetzung wie jede andere Ausgabe:

- **PRE_OUTPUT-Hook** -- Alle an den Tide Pool gesendeten Inhalte durchlaufen den PRE_OUTPUT-Durchsetzungs-Hook vor dem Rendern. Klassifizierte Daten, die die Ausgabe-Policy verletzen, werden blockiert.
- **Session-Taint** -- Gerenderte Inhalte erben die Taint-Stufe der Session. Ein Tide Pool, der `CONFIDENTIAL`-Daten zeigt, ist selbst `CONFIDENTIAL`.
- **Snapshot-Klassifizierung** -- Tide-Pool-Snapshots werden auf der Taint-Stufe der Session zum Zeitpunkt der Erfassung klassifiziert.
- **JavaScript-Sandboxing** -- JavaScript, das ueber `eval` ausgefuehrt wird, ist in der Sandbox des Tide Pool isoliert. Es hat keinen Zugriff auf das Hostsystem, Netzwerk oder Dateisystem.
- **Kein Netzwerkzugriff** -- Die Tide-Pool-Laufzeitumgebung kann keine Netzwerkanfragen stellen. Alle Daten fliessen durch den Agenten und die Policy-Schicht.

## Status-Indikatoren

Das Tidepool-Web-Interface enthaelt Echtzeit-Status-Indikatoren:

### Kontextlaengen-Balken

Ein gestylter Fortschrittsbalken, der die Kontextfenster-Nutzung anzeigt -- wie viel des LLM-Kontextfensters verbraucht wurde. Der Balken aktualisiert sich nach jeder Nachricht und nach Kompaktierung.

### MCP-Server-Status

Zeigt den Verbindungsstatus konfigurierter MCP-Server (z.B. "MCP 3/3"). Farbcodiert: gruen fuer alle verbunden, gelb fuer teilweise, rot fuer keine.

### Sichere Secret-Eingabe

Wenn der Agent Sie auffordert, ein Secret einzugeben (ueber das `secret_save`-Tool), zeigt Tidepool ein sicheres Eingabe-Popup an. Der eingegebene Wert geht direkt an den Schluesselbund -- er wird niemals ueber den Chat gesendet oder im Gespraechsverlauf angezeigt.

::: tip Stellen Sie sich den Tide Pool als das Whiteboard des Agenten vor. Waehrend Chat die Art ist, wie Sie mit dem Agenten sprechen, ist der Tide Pool der Ort, an dem der Agent Ihnen Dinge zeigt. :::
