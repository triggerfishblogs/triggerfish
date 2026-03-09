# Benachrichtigungen

Der NotificationService ist Triggerfishs erstklassige Abstraktion fuer die Zustellung von Benachrichtigungen an den Agenten-Eigentuemer ueber alle verbundenen Kanaele.

## Warum ein Benachrichtigungsdienst?

Ohne einen dedizierten Dienst verstreut sich Benachrichtigungslogik ueblicherweise ueber die Codebasis -- jedes Feature implementiert sein eigenes "Eigentuemer-benachrichtigen"-Muster. Dies fuehrt zu inkonsistentem Verhalten, verpassten Benachrichtigungen und Duplikaten.

Triggerfish zentralisiert alle Benachrichtigungszustellung ueber einen einzigen Dienst, der Prioritaet, Warteschlangen und Deduplizierung verwaltet.

## So funktioniert es

<img src="/diagrams/notification-routing.svg" alt="Benachrichtigungs-Routing: Quellen fliessen durch NotificationService mit Prioritaets-Routing, Warteschlangen und Deduplizierung zu Kanaelen" style="max-width: 100%;" />

Wenn eine Komponente den Eigentuemer benachrichtigen muss -- ein Cron-Job abgeschlossen, ein Trigger etwas Wichtiges erkannt, ein Webhook ausgeloest -- ruft sie den NotificationService auf. Der Dienst bestimmt, wie und wohin die Benachrichtigung zugestellt wird.

## Interface

```typescript
interface NotificationService {
  /** Deliver or queue a notification for a user. */
  deliver(options: DeliverOptions): Promise<void>;

  /** Get pending (undelivered) notifications for a user. */
  getPending(userId: UserId): Promise<Notification[]>;

  /** Acknowledge a notification as delivered. */
  acknowledge(notificationId: string): Promise<void>;
}
```

## Prioritaetsstufen

Jede Benachrichtigung traegt eine Prioritaet, die das Zustellverhalten beeinflusst:

| Prioritaet | Verhalten                                                                    |
| ---------- | ---------------------------------------------------------------------------- |
| `critical` | Sofortige Zustellung an alle verbundenen Kanaele. Umgeht Ruhezeiten.         |
| `normal`   | Zustellung an den bevorzugten Kanal. Warteschlange, wenn Benutzer offline.   |
| `low`      | Warteschlange und Zustellung in Chargen. Kann zusammengefasst werden.        |

## Zustelloptionen

```typescript
interface DeliverOptions {
  readonly userId: UserId;
  readonly message: string;
  readonly priority: NotificationPriority; // "critical" | "normal" | "low"
}
```

## Warteschlangen und Offline-Zustellung

Wenn der Zielbenutzer offline ist oder keine Kanaele verbunden sind, werden Benachrichtigungen in die Warteschlange gestellt. Sie werden zugestellt, wenn:

- Der Benutzer eine neue Session startet.
- Ein Kanal sich erneut verbindet.
- Der Benutzer ausstehende Benachrichtigungen explizit anfordert.

Ausstehende Benachrichtigungen koennen mit `getPending()` abgerufen und mit `acknowledge()` bestaetigt werden.

## Deduplizierung

Der NotificationService verhindert doppelte Benachrichtigungen an den Benutzer. Wenn derselbe Benachrichtigungsinhalt mehrfach innerhalb eines Fensters zugestellt wird, geht nur die erste Zustellung durch.

## Konfiguration

Konfigurieren Sie das Benachrichtigungsverhalten in `triggerfish.yaml`:

```yaml
notifications:
  preferred_channel: telegram # Standard-Zustellkanal
  quiet_hours: "22:00-07:00" # Normal/Low waehrend dieser Zeiten unterdruecken
  batch_interval: 15m # Niedrig-priorisierte Benachrichtigungen buendeln
```

## Verwendungsbeispiele

Benachrichtigungen werden im gesamten System verwendet:

- **Cron-Jobs** benachrichtigen den Eigentuemer, wenn eine geplante Aufgabe abgeschlossen ist oder fehlschlaegt.
- **Triggers** benachrichtigen den Eigentuemer, wenn die Ueberwachung etwas erkennt, das Aufmerksamkeit erfordert.
- **Webhooks** benachrichtigen den Eigentuemer, wenn ein externes Ereignis ausloest (GitHub-PR, Sentry-Alert).
- **Policy-Verletzungen** benachrichtigen den Eigentuemer, wenn eine blockierte Aktion versucht wird.
- **Kanal-Status** benachrichtigt den Eigentuemer, wenn ein Kanal sich trennt oder erneut verbindet.

::: info Die Benachrichtigungswarteschlange wird ueber `StorageProvider` (Namensraum: `notifications:`) mit einer Standard-Aufbewahrung von 7 Tagen nach Zustellung persistiert. Nicht zugestellte Benachrichtigungen werden bis zur Bestaetigung aufbewahrt. :::
