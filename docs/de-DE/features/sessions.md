# Session-Verwaltung

Der Agent kann Sessions inspizieren, mit ihnen kommunizieren und neue erstellen. Diese Tools ermoeglichen session-uebergreifende Workflows, Hintergrundaufgaben-Delegation und kanaluebergreifende Nachrichtenversendung -- alles unter Write-Down-Durchsetzung.

## Tools

### `sessions_list`

Listet alle aktiven Sessions auf, die fuer die aktuelle Session sichtbar sind.

Nimmt keine Parameter entgegen. Ergebnisse werden nach Taint-Stufe gefiltert -- eine `PUBLIC`-Session kann keine `CONFIDENTIAL`-Session-Metadaten sehen.

### `sessions_history`

Ruft den Nachrichtenverlauf fuer eine Session nach ID ab.

| Parameter    | Typ    | Erforderlich | Beschreibung                                    |
| ------------ | ------ | ------------ | ----------------------------------------------- |
| `session_id` | string | ja           | Die Session-ID, fuer die der Verlauf abgerufen wird |

Der Zugriff wird verweigert, wenn der Taint der Zielsession hoeher als der des Aufrufers ist.

### `sessions_send`

Sendet Inhalt von der aktuellen Session an eine andere Session. Unterliegt der Write-Down-Durchsetzung.

| Parameter    | Typ    | Erforderlich | Beschreibung                      |
| ------------ | ------ | ------------ | --------------------------------- |
| `session_id` | string | ja           | Ziel-Session-ID                   |
| `content`    | string | ja           | Der zu sendende Nachrichteninhalt |

**Write-Down-Pruefung:** Der Taint des Aufrufers muss zur Klassifizierungsstufe der Zielsession fliessen koennen. Eine `CONFIDENTIAL`-Session kann keine Daten an eine `PUBLIC`-Session senden.

### `sessions_spawn`

Erstellt eine neue Hintergrund-Session fuer eine autonome Aufgabe.

| Parameter | Typ    | Erforderlich | Beschreibung                                                    |
| --------- | ------ | ------------ | --------------------------------------------------------------- |
| `task`    | string | ja           | Beschreibung dessen, was die Hintergrund-Session tun soll        |

Die erstellte Session startet mit unabhaengigem `PUBLIC`-Taint und eigenem isolierten Workspace. Sie laeuft autonom und gibt Ergebnisse zurueck, wenn sie abgeschlossen ist.

### `session_status`

Ruft Metadaten und Status fuer eine bestimmte Session ab.

| Parameter    | Typ    | Erforderlich | Beschreibung                    |
| ------------ | ------ | ------------ | ------------------------------- |
| `session_id` | string | ja           | Die zu pruefende Session-ID      |

Gibt Session-ID, Kanal, Benutzer, Taint-Stufe und Erstellungszeitpunkt zurueck. Der Zugriff ist taint-gesteuert.

### `message`

Sendet eine Nachricht an einen Kanal und Empfaenger. Unterliegt der Write-Down-Durchsetzung ueber Policy-Hooks.

| Parameter   | Typ    | Erforderlich | Beschreibung                                       |
| ----------- | ------ | ------------ | -------------------------------------------------- |
| `channel`   | string | ja           | Zielkanal (z.B. `telegram`, `slack`)               |
| `recipient` | string | ja           | Empfaengerkennung innerhalb des Kanals             |
| `text`      | string | ja           | Zu sendender Nachrichtentext                       |

### `summarize`

Generiert eine praegnante Zusammenfassung des aktuellen Gespraechs. Nuetzlich fuer die Erstellung von Uebergabe-Notizen, Kontextkomprimierung oder die Erstellung einer Zusammenfassung fuer die Zustellung an einen anderen Kanal.

| Parameter | Typ    | Erforderlich | Beschreibung                                              |
| --------- | ------ | ------------ | --------------------------------------------------------- |
| `scope`   | string | nein         | Was zusammengefasst werden soll: `session` (Standard), `topic` |

### `simulate_tool_call`

Simuliert einen Tool-Aufruf, um die Entscheidung der Policy-Engine vorab zu pruefen, ohne das Tool auszufuehren. Gibt das Hook-Auswertungsergebnis (ALLOW, BLOCK oder REDACT) und die ausgewerteten Regeln zurueck.

| Parameter   | Typ    | Erforderlich | Beschreibung                                      |
| ----------- | ------ | ------------ | ------------------------------------------------- |
| `tool_name` | string | ja           | Das zu simulierende Tool                          |
| `args`      | object | nein         | In die Simulation einzubeziehende Argumente       |

::: tip Verwenden Sie `simulate_tool_call`, um zu pruefen, ob ein Tool-Aufruf erlaubt wird, bevor Sie ihn ausfuehren. Dies ist nuetzlich, um Policy-Verhalten ohne Seiteneffekte zu verstehen. :::

## Anwendungsfaelle

### Hintergrundaufgaben-Delegation

Der Agent kann eine Hintergrund-Session erstellen, um eine lang laufende Aufgabe zu bearbeiten, ohne das aktuelle Gespraech zu blockieren:

```
Benutzer: "Recherchiere Wettbewerber-Preise und stelle eine Zusammenfassung zusammen"
Agent: [ruft sessions_spawn mit der Aufgabe auf]
Agent: "Ich habe eine Hintergrund-Session gestartet, um das zu recherchieren. Ich werde in Kuerze Ergebnisse haben."
```

### Session-uebergreifende Kommunikation

Sessions koennen sich gegenseitig Daten senden, was Workflows ermoeglicht, bei denen eine Session Daten produziert, die eine andere konsumiert:

```
Hintergrund-Session schliesst Recherche ab --> sessions_send an Eltern-Session --> Eltern benachrichtigt Benutzer
```

### Kanaluebergreifende Nachrichtenversendung

Das `message`-Tool ermoeglicht es dem Agenten, proaktiv auf jedem verbundenen Kanal zu kommunizieren:

```
Agent erkennt dringendes Ereignis --> message({ channel: "telegram", recipient: "owner", text: "Alarm: ..." })
```

## Sicherheit

- Alle Session-Operationen sind taint-gesteuert: Sie koennen Sessions oberhalb Ihrer Taint-Stufe nicht sehen, lesen oder an sie senden
- `sessions_send` setzt Write-Down-Praevention durch: Daten koennen nicht an eine niedrigere Klassifizierung fliessen
- Erstellte Sessions starten mit `PUBLIC`-Taint und unabhaengigem Taint-Tracking
- Das `message`-Tool durchlaeuft `PRE_OUTPUT`-Policy-Hooks vor der Zustellung
- Session-IDs werden aus dem Laufzeitkontext injiziert, nicht aus LLM-Argumenten -- der Agent kann keine andere Session imitieren

::: warning SICHERHEIT Write-Down-Praevention wird bei aller session-uebergreifenden Kommunikation durchgesetzt. Eine mit `CONFIDENTIAL` getaintete Session kann keine Daten an eine `PUBLIC`-Session oder einen `PUBLIC`-Kanal senden. Dies ist eine feste Grenze, die durch die Policy-Schicht durchgesetzt wird. :::
