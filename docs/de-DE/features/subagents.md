# Sub-Agenten und LLM-Aufgaben

Triggerfish-Agenten koennen Arbeit an Sub-Agenten delegieren und isolierte LLM-Prompts ausfuehren. Dies ermoeglicht paralleles Arbeiten, fokussierte Argumentation und Multi-Agent-Aufgabenzerlegung.

## Tools

### `subagent`

Erstellen Sie einen Sub-Agenten fuer eine autonome mehrstufige Aufgabe. Der Sub-Agent erhaelt seinen eigenen Gespraechskontext und kann Tools unabhaengig verwenden. Gibt das Endergebnis zurueck, wenn abgeschlossen.

| Parameter | Typ    | Erforderlich | Beschreibung                                                       |
| --------- | ------ | ------------ | ------------------------------------------------------------------ |
| `task`    | string | ja           | Was der Sub-Agent erreichen soll                                   |
| `tools`   | string | nein         | Kommagetrennte Tool-Whitelist (Standard: Nur-Lese-Tools)            |

**Standard-Tools:** Sub-Agenten starten mit Nur-Lese-Tools (`read_file`, `list_directory`, `search_files`, `run_command`). Geben Sie zusaetzliche Tools explizit an, wenn der Sub-Agent Schreibzugriff benoetigt.

**Beispielverwendungen:**

- Ein Thema recherchieren, waehrend der Hauptagent andere Arbeit fortsetzt
- Eine Codebase parallel aus mehreren Blickwinkeln erkunden (dies ist, was das `explore`-Tool intern tut)
- Eine eigenstaendige Implementierungsaufgabe delegieren

### `llm_task`

Fuehren Sie einen einmaligen LLM-Prompt fuer isolierte Argumentation aus. Der Prompt laeuft in einem separaten Kontext und verunreinigt den Hauptgespraechsverlauf nicht.

| Parameter | Typ    | Erforderlich | Beschreibung                                |
| --------- | ------ | ------------ | ------------------------------------------- |
| `prompt`  | string | ja           | Der zu sendende Prompt                       |
| `system`  | string | nein         | Optionaler System-Prompt                     |
| `model`   | string | nein         | Optionaler Modell-/Anbietername-Override      |

**Beispielverwendungen:**

- Ein langes Dokument zusammenfassen, ohne den Hauptkontext zu fuellen
- Daten aus strukturiertem Text klassifizieren oder extrahieren
- Eine zweite Meinung zu einem Ansatz einholen
- Einen Prompt gegen ein anderes Modell als das primaere ausfuehren

### `agents_list`

Listet konfigurierte LLM-Anbieter und Agenten auf. Nimmt keine Parameter entgegen.

Gibt Informationen ueber verfuegbare Anbieter, ihre Modelle und den Konfigurationsstatus zurueck.

## Wie Sub-Agenten funktionieren

Wenn der Agent `subagent` aufruft, fuehrt Triggerfish folgende Schritte aus:

1. Erstellt eine neue Orchestrator-Instanz mit eigenem Gespraechskontext
2. Stellt dem Sub-Agenten die angegebenen Tools bereit (Standard: Nur-Lese)
3. Sendet die Aufgabe als anfaengliche Benutzernachricht
4. Der Sub-Agent laeuft autonom -- ruft Tools auf, verarbeitet Ergebnisse, iteriert
5. Wenn der Sub-Agent eine Endantwort produziert, wird sie an den Eltern-Agenten zurueckgegeben

Sub-Agenten erben die Taint-Stufe und Klassifizierungsbeschraenkungen der Eltern-Session. Sie koennen nicht ueber die Obergrenze des Elternteils hinaus eskalieren.

## Wann was verwendet wird

| Tool       | Verwendung, wenn                                                     |
| ---------- | -------------------------------------------------------------------- |
| `subagent` | Mehrstufige Aufgabe, die Tool-Nutzung und Iteration erfordert        |
| `llm_task` | Einmalige Argumentation, Zusammenfassung oder Klassifizierung        |
| `explore`  | Codebase-Verstaendnis (verwendet intern Sub-Agenten)                 |

::: tip Das `explore`-Tool basiert auf `subagent` -- es erstellt 2-6 parallele Sub-Agenten je nach Tiefenstufe. Wenn Sie strukturierte Codebase-Exploration benoetigen, verwenden Sie `explore` direkt, anstatt manuell Sub-Agenten zu erstellen. :::

## Sub-Agenten vs Agenten-Teams

Sub-Agenten sind Fire-and-Forget: Der Elternteil wartet auf ein einzelnes Ergebnis. [Agenten-Teams](./agent-teams) sind persistente Gruppen zusammenarbeitender Agenten mit unterschiedlichen Rollen, einem Leiter-Koordinator und Inter-Mitglieder-Kommunikation. Verwenden Sie Sub-Agenten fuer fokussierte Einzelschritt-Delegation. Verwenden Sie Teams, wenn die Aufgabe von mehreren spezialisierten Perspektiven profitiert, die auf der Arbeit des jeweils anderen aufbauen.
