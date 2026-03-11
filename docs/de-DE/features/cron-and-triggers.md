# Cron und Triggers

Triggerfish-Agenten sind nicht auf reaktives Frage-und-Antwort beschraenkt. Das Cron- und Trigger-System ermoeglicht proaktives Verhalten: geplante Aufgaben, periodische Check-ins, Morgen-Briefings, Hintergrund-Monitoring und autonome mehrstufige Workflows.

## Cron-Jobs

Cron-Jobs sind geplante Aufgaben mit festen Anweisungen, einem Zustellkanal und einer Klassifizierungsobergrenze. Sie verwenden Standard-Cron-Ausdruckssyntax.

### Konfiguration

Definieren Sie Cron-Jobs in `triggerfish.yaml` oder lassen Sie den Agenten sie zur Laufzeit ueber das Cron-Tool verwalten:

```yaml
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 7 Uhr taeglich
        task: "Prepare morning briefing with calendar,
          unread emails, and weather"
        channel: telegram # Wohin zugestellt wird
        classification: INTERNAL # Max-Taint fuer diesen Job

      - id: pipeline-check
        schedule: "0 */4 * * *" # Alle 4 Stunden
        task: "Check Salesforce pipeline for changes"
        channel: slack
        classification: CONFIDENTIAL
```

### So funktioniert es

1. Der **CronManager** parst Standard-Cron-Ausdruecke und pflegt eine persistente Job-Registry, die Neustarts ueberlebt.
2. Wenn ein Job ausloest, erstellt die **OrchestratorFactory** einen isolierten Orchestrator und eine Session speziell fuer diese Ausfuehrung.
3. Der Job laeuft in einem **Hintergrund-Session-Workspace** mit eigenem Taint-Tracking.
4. Die Ausgabe wird an den konfigurierten Kanal zugestellt, entsprechend den Klassifizierungsregeln dieses Kanals.
5. Die Ausfuehrungshistorie wird fuer das Audit aufgezeichnet.

### Agenten-verwaltetes Cron

Der Agent kann seine eigenen Cron-Jobs ueber das `cron`-Tool erstellen und verwalten:

| Aktion         | Beschreibung                | Sicherheit                                    |
| -------------- | --------------------------- | --------------------------------------------- |
| `cron.list`    | Alle geplanten Jobs auflisten | Nur Eigentuemer                              |
| `cron.create`  | Neuen Job planen            | Nur Eigentuemer, Klassifizierungsobergrenze durchgesetzt |
| `cron.delete`  | Geplanten Job entfernen     | Nur Eigentuemer                              |
| `cron.history` | Vergangene Ausfuehrungen anzeigen | Audit-Trail erhalten                    |

::: warning Die Erstellung von Cron-Jobs erfordert Eigentuemer-Authentifizierung. Der Agent kann keine Jobs im Namen externer Benutzer planen oder die konfigurierte Klassifizierungsobergrenze ueberschreiten. :::

### CLI-Cron-Verwaltung

Cron-Jobs koennen auch direkt ueber die Kommandozeile verwaltet werden:

```bash
triggerfish cron add "0 9 * * *" morning briefing
triggerfish cron add "0 */4 * * *" check pipeline --classification=CONFIDENTIAL
triggerfish cron list
triggerfish cron history <job-id>
triggerfish cron delete <job-id>
```

Das `--classification`-Flag setzt die Klassifizierungsobergrenze fuer den Job. Gueltige Stufen sind `PUBLIC`, `INTERNAL`, `CONFIDENTIAL` und `RESTRICTED`. Wenn weggelassen, wird standardmaessig `INTERNAL` verwendet.

## Trigger-System

Triggers sind periodische "Check-in"-Schleifen, bei denen der Agent aufwacht, um zu bewerten, ob proaktive Massnahmen erforderlich sind. Im Gegensatz zu Cron-Jobs mit festen Aufgaben geben Triggers dem Agenten Ermessensspielraum, um zu entscheiden, was Aufmerksamkeit erfordert.

### TRIGGER.md

`TRIGGER.md` definiert, was der Agent bei jedem Aufwachen pruefen soll. Sie befindet sich unter `~/.triggerfish/config/TRIGGER.md` und ist eine Freitext-Markdown-Datei, in der Sie Ueberwachungsprioritaeten, Eskalationsregeln und proaktive Verhaltensweisen festlegen.

Wenn `TRIGGER.md` fehlt, verwendet der Agent sein allgemeines Wissen, um zu entscheiden, was Aufmerksamkeit erfordert.

**Beispiel TRIGGER.md:**

```markdown
# TRIGGER.md -- What to check on each wakeup

## Priority Checks

- Unread messages across all channels older than 1 hour
- Calendar conflicts in the next 24 hours
- Overdue tasks in Linear or Jira

## Monitoring

- GitHub: PRs awaiting my review
- Email: anything from VIP contacts (flag for immediate notification)
- Slack: mentions in #incidents channel

## Proactive

- If morning (7-9am), prepare daily briefing
- If Friday afternoon, draft weekly summary
```

### Trigger-Konfiguration

Trigger-Timing und -Einschraenkungen werden in `triggerfish.yaml` gesetzt:

```yaml
scheduler:
  trigger:
    enabled: true # Auf false setzen, um Triggers zu deaktivieren (Standard: true)
    interval_minutes: 30 # Alle 30 Minuten pruefen (Standard: 30)
    # Auf 0 setzen, um Triggers zu deaktivieren, ohne die Konfiguration zu entfernen
    classification_ceiling: CONFIDENTIAL # Max-Taint-Obergrenze (Standard: CONFIDENTIAL)
    quiet_hours:
      start: 22 # Nicht aufwachen zwischen 22 Uhr ...
      end: 7 # ... und 7 Uhr
```

| Einstellung                             | Beschreibung                                                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                               | Ob periodische Trigger-Wakeups aktiv sind. Auf `false` setzen zum Deaktivieren.                                                                   |
| `interval_minutes`                      | Wie oft (in Minuten) der Agent aufwacht, um Triggers zu pruefen. Standard: `30`. Auf `0` setzen, um Triggers zu deaktivieren, ohne den Config-Block zu entfernen. |
| `classification_ceiling`                | Maximale Klassifizierungsstufe, die die Trigger-Session erreichen kann. Standard: `CONFIDENTIAL`.                                                  |
| `quiet_hours.start` / `quiet_hours.end` | Stundenbereich (24-Stunden-Uhr), waehrend dessen Triggers unterdrueckt werden.                                                                    |

::: tip Um Triggers voruebergehend zu deaktivieren, setzen Sie `interval_minutes: 0`. Dies ist aequivalent zu `enabled: false` und laesst Ihre anderen Trigger-Einstellungen bestehen, damit Sie sie leicht wieder aktivieren koennen. :::

### Trigger-Ausfuehrung

Jeder Trigger-Wakeup folgt dieser Sequenz:

1. Der Scheduler loest im konfigurierten Intervall aus.
2. Eine frische Hintergrund-Session wird mit `PUBLIC`-Taint erstellt.
3. Der Agent liest `TRIGGER.md` fuer seine Ueberwachungsanweisungen.
4. Der Agent wertet jede Pruefung aus, unter Verwendung verfuegbarer Tools und MCP-Server.
5. Wenn Massnahmen erforderlich sind, handelt der Agent -- sendet Benachrichtigungen, erstellt Aufgaben oder liefert Zusammenfassungen.
6. Der Taint der Session kann eskalieren, wenn auf klassifizierte Daten zugegriffen wird, kann aber die konfigurierte Obergrenze nicht ueberschreiten.
7. Die Session wird nach Abschluss archiviert.

::: tip Triggers und Cron-Jobs ergaenzen sich gegenseitig. Verwenden Sie Cron fuer Aufgaben, die zu genauen Zeiten unabhaengig von Bedingungen laufen sollen (Morgen-Briefing um 7 Uhr). Verwenden Sie Triggers fuer Ueberwachung, die Beurteilungsvermögen erfordert (alle 30 Minuten pruefen, ob etwas meine Aufmerksamkeit erfordert). :::

## Trigger-Kontext-Tool

Der Agent kann Trigger-Ergebnisse mit dem `trigger_add_to_context`-Tool in sein aktuelles Gespraech laden. Dies ist nuetzlich, wenn ein Benutzer nach etwas fragt, das beim letzten Trigger-Wakeup geprueft wurde.

### Verwendung

| Parameter | Standard    | Beschreibung                                                                                          |
| --------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| `source`  | `"trigger"` | Welche Trigger-Ausgabe geladen werden soll: `"trigger"` (periodisch), `"cron:<job-id>"` oder `"webhook:<source>"` |

Das Tool laedt das aktuellste Ausfuehrungsergebnis fuer die angegebene Quelle und fuegt es dem Gespraechskontext hinzu.

### Write-Down-Durchsetzung

Trigger-Kontextinjektion respektiert die No-Write-Down-Regel:

- Wenn die Klassifizierung des Triggers die Session-Taint-Stufe **uebersteigt**, **eskaliert** die Session-Taint-Stufe entsprechend
- Wenn die Session-Taint-Stufe die Klassifizierung des Triggers **uebersteigt**, wird die Injektion **erlaubt** -- Daten niedrigerer Klassifizierung koennen immer in eine Session hoeherer Klassifizierung fliessen (normales `canFlowTo`-Verhalten). Die Session-Taint-Stufe bleibt unveraendert.

::: info Eine CONFIDENTIAL-Session kann ein PUBLIC-Trigger-Ergebnis problemlos laden -- Daten fliessen nach oben. Umgekehrt (Injektion von CONFIDENTIAL-Trigger-Daten in eine Session mit PUBLIC-Obergrenze) wuerde die Session-Taint-Stufe auf CONFIDENTIAL eskalieren. :::

### Persistenz

Trigger-Ergebnisse werden ueber `StorageProvider` mit Schluesseln im Format `trigger:last:<source>` gespeichert. Nur das aktuellste Ergebnis pro Quelle wird aufbewahrt.

## Sicherheitsintegration

Alle geplanten Ausfuehrungen integrieren sich in das Kern-Sicherheitsmodell:

- **Isolierte Sessions** -- Jeder Cron-Job und Trigger-Wakeup laeuft in seiner eigenen erstellten Session mit unabhaengigem Taint-Tracking.
- **Klassifizierungsobergrenze** -- Hintergrundaufgaben koennen ihre konfigurierte Klassifizierungsstufe nicht ueberschreiten, selbst wenn die aufgerufenen Tools hoeher klassifizierte Daten zurueckgeben.
- **Policy-Hooks** -- Alle Aktionen innerhalb geplanter Aufgaben durchlaufen dieselben Durchsetzungs-Hooks wie interaktive Sessions (PRE_TOOL_CALL, POST_TOOL_RESPONSE, PRE_OUTPUT).
- **Kanal-Klassifizierung** -- Die Ausgabezustellung respektiert die Klassifizierungsstufe des Zielkanals. Ein `CONFIDENTIAL`-Ergebnis kann nicht an einen `PUBLIC`-Kanal gesendet werden.
- **Audit-Trail** -- Jede geplante Ausfuehrung wird mit vollstaendigem Kontext protokolliert: Job-ID, Session-ID, Taint-Verlauf, durchgefuehrte Aktionen und Zustellstatus.
- **Persistenz** -- Cron-Jobs werden ueber `StorageProvider` gespeichert (Namensraum: `cron:`) und ueberleben Gateway-Neustarts.
