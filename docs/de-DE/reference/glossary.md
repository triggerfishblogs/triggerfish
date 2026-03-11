# Glossar

| Begriff                      | Definition                                                                                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent Team**               | Eine persistente Gruppe zusammenarbeitender Agenten-Sessions mit unterschiedlichen Rollen. Ein Mitglied ist der Lead, der die Arbeit koordiniert. Erstellt ueber `team_create`, ueberwacht mit Lebenszyklus-Checks. |
| **A2UI**                     | Agent-to-UI-Protokoll zum Uebertragen visueller Inhalte vom Agenten in den Tide-Pool-Workspace in Echtzeit.                                                      |
| **Background-Session**       | Eine fuer autonome Aufgaben (Cron, Trigger) erzeugte Session, die mit frischem PUBLIC-Taint startet und in einem isolierten Workspace laeuft.                     |
| **Buoy**                     | Eine begleitende native App (iOS, Android), die dem Agenten Geraetfaehigkeiten wie Kamera, Standort, Bildschirmaufnahme und Push-Benachrichtigungen bereitstellt. (Demnachst verfuegbar.) |
| **Klassifizierung**          | Ein Sensitivitaetslabel, das Daten, Kanaelen und Empfaengern zugewiesen wird. Vier Stufen: RESTRICTED, CONFIDENTIAL, INTERNAL, PUBLIC.                            |
| **Cron**                     | Eine geplante wiederkehrende Aufgabe, die vom Agenten zu einem festgelegten Zeitpunkt unter Verwendung der Standard-Cron-Ausdruck-Syntax ausgefuehrt wird.        |
| **Dive**                     | Der Ersteinrichtungs-Assistent (`triggerfish dive`), der `triggerfish.yaml`, SPINE.md und die Erstkonfiguration erstellt.                                         |
| **Effektive Klassifizierung** | Die fuer Ausgabeentscheidungen verwendete Klassifizierungsstufe, berechnet als `min(kanal_klassifizierung, empfaenger_klassifizierung)`.                          |
| **Exec-Umgebung**            | Der Code-Workspace des Agenten zum Schreiben, Ausfuehren und Debuggen von Code in einer engen Write-Run-Fix-Feedback-Schleife, getrennt von der Plugin-Sandbox.   |
| **Failover**                 | Automatischer Wechsel zu einem alternativen LLM-Provider, wenn der aktuelle Provider aufgrund von Rate-Limiting, Serverfehlern oder Timeouts nicht verfuegbar ist. |
| **Gateway**                  | Die dauerhaft laufende lokale Steuerungsebene, die Sessions, Kanaele, Tools, Ereignisse und Agentenprozesse ueber einen WebSocket-JSON-RPC-Endpunkt verwaltet.    |
| **Hook**                     | Ein deterministischer Durchsetzungspunkt im Datenfluss, an dem die Policy-Engine Regeln auswertet und entscheidet, ob eine Aktion erlaubt, blockiert oder redigiert wird. |
| **Lineage**                  | Herkunfts-Metadaten, die den Ursprung, die Transformationen und den aktuellen Standort jedes von Triggerfish verarbeiteten Datenelements verfolgen.                |
| **LlmProvider**              | Die Schnittstelle fuer LLM-Completions, implementiert von jedem unterstuetzten Provider (Anthropic, OpenAI, Google, Local, OpenRouter).                           |
| **MCP**                      | Model Context Protocol, ein Standard fuer Agent-Tool-Kommunikation. Triggerfishs MCP Gateway fuegt jedem MCP-Server Klassifizierungskontrollen hinzu.             |
| **No Write-Down**            | Die feste, nicht konfigurierbare Regel, dass Daten nur an Kanaele oder Empfaenger auf gleicher oder hoeherer Klassifizierungsstufe fliessen koennen.               |
| **NotificationService**      | Die einheitliche Abstraktion fuer die Zustellung von Eigentuemer-Benachrichtigungen ueber alle verbundenen Kanaele mit Prioritaet, Warteschlange und Deduplizierung. |
| **Patrol**                   | Der diagnostische Gesundheitscheck-Befehl (`triggerfish patrol`), der Gateway, LLM-Provider, Kanaele und Policy-Konfiguration ueberprueft.                        |
| **Reef (The)**               | Der Community-Skill-Marktplatz zum Entdecken, Installieren, Veroeffentlichen und Verwalten von Triggerfish-Skills.                                                |
| **Ripple**                   | Echtzeit-Tippindikatoren und Online-Status-Signale, die ueber Kanaele weitergeleitet werden, wo unterstuetzt.                                                     |
| **Session**                  | Die grundlegende Einheit des Konversationszustands mit unabhaengigem Taint-Tracking. Jede Session hat eine eindeutige ID, Benutzer, Kanal, Taint-Stufe und Historie. |
| **Skill**                    | Ein Ordner mit einer `SKILL.md`-Datei und optionalen unterstuetzenden Dateien, die dem Agenten neue Faehigkeiten verleihen, ohne Plugins zu schreiben.             |
| **SPINE.md**                 | Die Agenten-Identitaets- und Missions-Datei, die als System-Prompt-Grundlage geladen wird. Definiert Persoenlichkeit, Regeln und Grenzen. Triggerfishs Aequivalent zu CLAUDE.md. |
| **StorageProvider**          | Die einheitliche Persistenz-Abstraktion (Key-Value-Schnittstelle), durch die alle zustandsbehafteten Daten fliessen. Implementierungen umfassen Memory, SQLite und Enterprise-Backends. |
| **Taint**                    | Die an eine Session gebundene Klassifizierungsstufe basierend auf den Daten, auf die zugegriffen wurde. Taint kann innerhalb einer Session nur eskalieren, nie abnehmen. |
| **Tide Pool**                | Ein agentengesteuerter visueller Workspace, in dem Triggerfish interaktive Inhalte (Dashboards, Diagramme, Formulare) ueber das A2UI-Protokoll rendert.            |
| **TRIGGER.md**               | Die Definition des proaktiven Verhaltens des Agenten, die festlegt, was bei periodischen Trigger-Wakeups zu pruefen, zu ueberwachen und worauf zu reagieren ist.   |
| **Webhook**                  | Ein eingehender HTTP-Endpunkt, der Ereignisse von externen Diensten (GitHub, Sentry usw.) akzeptiert und Agenten-Aktionen ausloest.                               |
| **Team Lead**                | Der designierte Koordinator in einem Agent Team. Empfaengt das Teamziel, zerlegt Arbeit, weist Mitgliedern Aufgaben zu und entscheidet, wann das Team fertig ist.  |
| **Workspace**                | Ein pro-Agent-Dateisystemverzeichnis, in dem der Agent seinen eigenen Code schreibt und ausfuehrt, isoliert von anderen Agenten.                                   |
| **Write-Down**               | Der verbotene Datenfluss von einer hoeheren Klassifizierungsstufe zu einer niedrigeren (z.B. CONFIDENTIAL-Daten an einen PUBLIC-Kanal gesendet).                   |
