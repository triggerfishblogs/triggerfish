# Agenten-Teams

Triggerfish-Agenten koennen persistente Teams zusammenarbeitender Agenten erstellen, die gemeinsam an komplexen Aufgaben arbeiten. Jedes Teammitglied erhaelt seine eigene Session, Rolle, Gespraechskontext und Tools. Ein Mitglied wird als **Leiter** bestimmt und koordiniert die Arbeit.

Teams eignen sich am besten fuer offene Aufgaben, die von spezialisierten Rollen profitieren, die parallel arbeiten: Recherche + Analyse + Schreiben, Architektur + Implementierung + Review, oder jede Aufgabe, bei der verschiedene Perspektiven auf der Arbeit des jeweils anderen aufbauen muessen.

::: info Verfuegbarkeit
Agenten-Teams erfordern den **Power**-Plan (149 $/Monat) bei Nutzung des Triggerfish Gateway. Open-Source-Benutzer, die ihre eigenen API-Schluessel verwenden, haben vollen Zugriff auf Agenten-Teams -- jedes Teammitglied verbraucht Inferenz von Ihrem konfigurierten Anbieter.
:::

## Tools

### `team_create`

Erstellen Sie ein persistentes Team von Agenten, die an einer Aufgabe zusammenarbeiten. Definieren Sie Mitgliederrollen, Tools und Modelle. Genau ein Mitglied muss der Leiter sein.

| Parameter                | Typ    | Erforderlich | Beschreibung                                                       |
| ------------------------ | ------ | ------------ | ------------------------------------------------------------------ |
| `name`                   | string | ja           | Menschenlesbarer Team-Name                                        |
| `task`                   | string | ja           | Das Ziel des Teams (wird dem Leiter als erste Anweisungen gesendet) |
| `members`                | array  | ja           | Team-Mitglieder-Definitionen (siehe unten)                         |
| `idle_timeout_seconds`   | number | nein         | Leerlauf-Timeout pro Mitglied. Standard: 300 (5 Minuten)           |
| `max_lifetime_seconds`   | number | nein         | Maximale Team-Lebensdauer. Standard: 3600 (1 Stunde)               |
| `classification_ceiling` | string | nein         | Teamweite Klassifizierungsobergrenze (z.B. `CONFIDENTIAL`)         |

**Mitglieder-Definition:**

| Feld                     | Typ     | Erforderlich | Beschreibung                                                |
| ------------------------ | ------- | ------------ | ----------------------------------------------------------- |
| `role`                   | string  | ja           | Eindeutige Rollenkennung (z.B. `researcher`, `reviewer`)    |
| `description`            | string  | ja           | Was dieses Mitglied tut (wird in System-Prompt injiziert)   |
| `is_lead`                | boolean | ja           | Ob dieses Mitglied der Team-Leiter ist                      |
| `model`                  | string  | nein         | Modell-Override fuer dieses Mitglied                        |
| `classification_ceiling` | string  | nein         | Klassifizierungsobergrenze pro Mitglied                     |
| `initial_task`           | string  | nein         | Anfangsanweisungen (Leiter nutzt standardmaessig Team-Task) |

**Validierungsregeln:**

- Das Team muss genau ein Mitglied mit `is_lead: true` haben
- Alle Rollen muessen eindeutig und nicht-leer sein
- Mitglieder-Klassifizierungsobergrenzen koennen die Team-Obergrenze nicht ueberschreiten
- `name` und `task` muessen nicht-leer sein

### `team_status`

Pruefen Sie den aktuellen Zustand eines aktiven Teams.

| Parameter | Typ    | Erforderlich | Beschreibung |
| --------- | ------ | ------------ | ------------ |
| `team_id` | string | ja           | Team-ID      |

Gibt den Status des Teams, die aggregierte Taint-Stufe und Details pro Mitglied zurueck, einschliesslich des aktuellen Taints, Status und letzten Aktivitaets-Zeitstempels jedes Mitglieds.

### `team_message`

Senden Sie eine Nachricht an ein bestimmtes Teammitglied. Nuetzlich fuer zusaetzlichen Kontext, Arbeitsumleitung oder Fortschrittsaktualisierungen.

| Parameter | Typ    | Erforderlich | Beschreibung                                     |
| --------- | ------ | ------------ | ------------------------------------------------ |
| `team_id` | string | ja           | Team-ID                                          |
| `role`    | string | nein         | Ziel-Mitgliedsrolle (Standard: Leiter)           |
| `message` | string | ja           | Nachrichteninhalt                                |

Das Team muss im Status `running` sein und das Zielmitglied muss `active` oder `idle` sein.

### `team_disband`

Loesen Sie ein Team auf und beenden Sie alle Mitglieder-Sessions.

| Parameter | Typ    | Erforderlich | Beschreibung                          |
| --------- | ------ | ------------ | ------------------------------------- |
| `team_id` | string | ja           | Team-ID                               |
| `reason`  | string | nein         | Warum das Team aufgeloest wird        |

Nur die Session, die das Team erstellt hat, oder das Leiter-Mitglied kann das Team aufloesen.

## Wie Teams funktionieren

### Erstellung

Wenn der Agent `team_create` aufruft, fuehrt Triggerfish folgende Schritte aus:

1. Validiert die Team-Definition (Rollen, Leiter-Anzahl, Klassifizierungsobergrenzen)
2. Erstellt eine isolierte Agenten-Session fuer jedes Mitglied ueber die Orchestrator-Factory
3. Injiziert einen **Team-Roster-Prompt** in den System-Prompt jedes Mitglieds, der seine Rolle, Teamkollegen und Zusammenarbeitsinstruktionen beschreibt
4. Sendet die anfaengliche Aufgabe an den Leiter (oder benutzerdefinierte `initial_task` pro Mitglied)
5. Startet einen Lebenszyklus-Monitor, der den Team-Zustand alle 30 Sekunden prueft

Jede Mitglieder-Session ist vollstaendig isoliert mit eigenem Gespraechskontext, Taint-Tracking und Tool-Zugang.

### Zusammenarbeit

Teammitglieder kommunizieren miteinander ueber `sessions_send`. Der erstellende Agent muss keine Nachrichten zwischen Mitgliedern weiterleiten. Der typische Ablauf:

1. Der Leiter erhaelt das Team-Ziel
2. Der Leiter zerlegt die Aufgabe und sendet Auftraege an Mitglieder ueber `sessions_send`
3. Mitglieder arbeiten autonom, rufen Tools auf und iterieren
4. Mitglieder senden Ergebnisse zurueck an den Leiter (oder direkt an ein anderes Mitglied)
5. Der Leiter fasst Ergebnisse zusammen und entscheidet, wann die Arbeit abgeschlossen ist
6. Der Leiter ruft `team_disband` auf, um das Team aufzuloesen

Nachrichten zwischen Teammitgliedern werden direkt ueber den Orchestrator zugestellt -- jede Nachricht loest einen vollstaendigen Agenten-Turn in der Session des Empfaengers aus.

### Status

Verwenden Sie `team_status`, um den Fortschritt jederzeit zu pruefen. Die Antwort enthaelt:

- **Team-Status:** `running`, `paused`, `completed`, `disbanded` oder `timed_out`
- **Aggregierter Taint:** Die hoechste Klassifizierungsstufe ueber alle Mitglieder
- **Details pro Mitglied:** Rolle, Status (`active`, `idle`, `completed`, `failed`), aktuelle Taint-Stufe und letzter Aktivitaets-Zeitstempel

### Aufloesung

Teams koennen aufgeloest werden durch:

- Die erstellende Session, die `team_disband` aufruft
- Das Leiter-Mitglied, das `team_disband` aufruft
- Den Lebenszyklus-Monitor, der nach Ablauf des Lebensdauer-Limits automatisch aufloest
- Den Lebenszyklus-Monitor, der erkennt, dass alle Mitglieder inaktiv sind

Wenn ein Team aufgeloest wird, werden alle aktiven Mitglieder-Sessions beendet und Ressourcen bereinigt.

## Team-Rollen

### Leiter

Das Leiter-Mitglied koordiniert das Team. Bei der Erstellung:

- Erhaelt die `task` des Teams als anfaengliche Anweisungen (sofern nicht durch `initial_task` ueberschrieben)
- Bekommt System-Prompt-Anweisungen zum Zerlegen der Arbeit, Zuweisen von Aufgaben und Entscheiden, wann das Ziel erreicht ist
- Ist berechtigt, das Team aufzuloesen

Es gibt genau einen Leiter pro Team.

### Mitglieder

Nicht-Leiter-Mitglieder sind Spezialisten. Bei der Erstellung:

- Erhalten ihre `initial_task`, falls angegeben, andernfalls warten sie im Leerlauf, bis der Leiter ihnen Arbeit sendet
- Bekommen System-Prompt-Anweisungen, abgeschlossene Arbeit an den Leiter oder den naechsten geeigneten Teamkollegen zu senden
- Koennen das Team nicht aufloesen

## Lebenszyklus-Monitoring

Teams haben automatisches Lebenszyklus-Monitoring, das alle 30 Sekunden laeuft.

### Leerlauf-Timeout

Jedes Mitglied hat ein Leerlauf-Timeout (Standard: 5 Minuten). Wenn ein Mitglied im Leerlauf ist:

1. **Erste Schwelle (idle_timeout_seconds):** Das Mitglied erhaelt eine Erinnerungsnachricht mit der Aufforderung, Ergebnisse zu senden, wenn seine Arbeit abgeschlossen ist
2. **Doppelte Schwelle (2x idle_timeout_seconds):** Das Mitglied wird beendet und der Leiter wird benachrichtigt

### Lebensdauer-Timeout

Teams haben eine maximale Lebensdauer (Standard: 1 Stunde). Wenn das Limit erreicht wird:

1. Der Leiter erhaelt eine Warnmeldung mit 60 Sekunden Zeit, eine abschliessende Ausgabe zu erstellen
2. Nach der Karenzzeit wird das Team automatisch aufgeloest

### Health-Checks

Der Monitor prueft den Session-Zustand alle 30 Sekunden:

- **Leiter-Ausfall:** Wenn die Leiter-Session nicht mehr erreichbar ist, wird das Team pausiert und die erstellende Session wird benachrichtigt
- **Mitglieder-Ausfall:** Wenn eine Mitglieder-Session nicht mehr vorhanden ist, wird sie als `failed` markiert und der Leiter wird benachrichtigt, mit den verbleibenden Mitgliedern fortzufahren
- **Alle inaktiv:** Wenn alle Mitglieder `completed` oder `failed` sind, wird die erstellende Session benachrichtigt, um entweder neue Anweisungen zu injizieren oder aufzuloesen

## Klassifizierung und Taint

Teammitglieder-Sessions folgen denselben Klassifizierungsregeln wie alle anderen Sessions:

- Jedes Mitglied startet mit `PUBLIC`-Taint und eskaliert, wenn es auf klassifizierte Daten zugreift
- **Klassifizierungsobergrenzen** koennen pro Team oder pro Mitglied gesetzt werden, um einzuschraenken, auf welche Daten Mitglieder zugreifen koennen
- **Write-Down-Durchsetzung** gilt fuer alle Inter-Mitglieder-Kommunikation. Ein mit `CONFIDENTIAL` getaintetes Mitglied kann keine Daten an ein Mitglied mit `PUBLIC` senden
- Der **aggregierte Taint** (hoechster Taint ueber alle Mitglieder) wird in `team_status` gemeldet, damit die erstellende Session die Gesamt-Klassifizierungsexposition des Teams verfolgen kann

::: danger SICHERHEIT Mitglieder-Klassifizierungsobergrenzen koennen die Team-Obergrenze nicht ueberschreiten. Wenn die Team-Obergrenze `INTERNAL` ist, kann kein Mitglied mit einer `CONFIDENTIAL`-Obergrenze konfiguriert werden. Dies wird bei der Erstellung validiert. :::

## Teams vs Sub-Agenten

| Aspekt          | Sub-Agent (`subagent`)                       | Team (`team_create`)                                         |
| --------------- | -------------------------------------------- | ------------------------------------------------------------ |
| **Lebensdauer** | Einzelaufgabe, gibt Ergebnis zurueck und endet | Persistent bis zur Aufloesung oder Timeout                   |
| **Mitglieder**  | Ein Agent                                    | Mehrere Agenten mit unterschiedlichen Rollen                 |
| **Interaktion** | Fire-and-Forget vom Elternteil               | Mitglieder kommunizieren frei ueber `sessions_send`          |
| **Koordination**| Elternteil wartet auf Ergebnis               | Leiter koordiniert, Elternteil kann ueber `team_status` pruefen |
| **Anwendungsfall** | Fokussierte Einzelschritt-Delegation      | Komplexe Multi-Rollen-Zusammenarbeit                         |

**Verwenden Sie Sub-Agenten**, wenn Sie einen einzelnen Agenten fuer eine fokussierte Aufgabe benoetigen, der ein Ergebnis zurueckgibt. **Verwenden Sie Teams**, wenn die Aufgabe von mehreren spezialisierten Perspektiven profitiert, die auf der Arbeit des jeweils anderen aufbauen.

::: tip Teams sind nach der Erstellung autonom. Der erstellende Agent kann den Status pruefen und Nachrichten senden, muss aber kein Mikromanagement betreiben. Der Leiter uebernimmt die Koordination. :::
