# Gateway

Das Gateway ist die zentrale Steuerungsebene von Triggerfish -- ein dauerhaft laufender lokaler Dienst, der Sessions, Kanaele, Tools, Ereignisse und Agentenprozesse ueber einen einzelnen WebSocket-Endpunkt koordiniert. Alles, was in Triggerfish geschieht, fliesst durch das Gateway.

## Architektur

<img src="/diagrams/gateway-architecture.svg" alt="Gateway-Architektur: Kanaele auf der linken Seite verbinden sich ueber das zentrale Gateway mit Diensten auf der rechten Seite" style="max-width: 100%;" />

Das Gateway lauscht auf einem konfigurierbaren Port (Standard `18789`) und akzeptiert Verbindungen von Kanaladaptern, CLI-Befehlen, Begleit-Apps und internen Diensten. Die gesamte Kommunikation verwendet JSON-RPC ueber WebSocket.

## Gateway-Dienste

Das Gateway bietet diese Dienste ueber seine WebSocket- und HTTP-Endpunkte:

| Dienst              | Beschreibung                                                                             | Sicherheitsintegration                    |
| ------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------- |
| **Sessions**        | Erstellen, auflisten, Verlauf abrufen, zwischen Sessions senden, Hintergrundaufgaben starten | Session-Taint pro Session verfolgt        |
| **Kanaele**         | Nachrichten routen, Verbindungen verwalten, fehlgeschlagene Zustellungen wiederholen, grosse Nachrichten aufteilen | Klassifizierungspruefungen bei jeder Ausgabe |
| **Cron**            | Wiederkehrende Aufgaben planen und Trigger-Aufwachvorgaenge aus `TRIGGER.md`             | Cron-Aktionen durchlaufen Policy Hooks    |
| **Webhooks**        | Eingehende Ereignisse von externen Diensten ueber `POST /webhooks/:sourceId` empfangen   | Eingehende Daten werden bei Aufnahme klassifiziert |
| **Ripple**          | Online-Status und Tipp-Indikatoren kanaluebergreifend verfolgen                          | Keine sensiblen Daten exponiert           |
| **Config**          | Einstellungen ohne Neustart aktualisieren                                                | Nur Admin bei Enterprise                  |
| **Control UI**      | Web-Dashboard fuer Gateway-Gesundheit und -Verwaltung                                    | Token-authentifiziert                     |
| **Tide Pool**       | Agenten-gesteuerter A2UI-visueller Arbeitsbereich                                        | Inhalte unterliegen Ausgabe-Hooks         |
| **Benachrichtigungen** | Kanaluebergreifende Benachrichtigungszustellung mit Prioritaetsrouting                | Klassifizierungsregeln gelten             |

## WebSocket JSON-RPC-Protokoll

Clients verbinden sich ueber WebSocket mit dem Gateway und tauschen JSON-RPC 2.0-Nachrichten aus. Jede Nachricht ist ein Methodenaufruf mit typisierten Parametern und einer typisierten Antwort.

```typescript
// Client sendet:
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "sessions.list",
  "params": { "filter": "active" }
}

// Gateway antwortet:
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    { "id": "sess_abc", "taint": "CONFIDENTIAL", "channel": "telegram" },
    { "id": "sess_def", "taint": "PUBLIC", "channel": "cli" }
  ]
}
```

Das Gateway stellt auch HTTP-Endpunkte fuer die Webhook-Verarbeitung bereit. Wenn ein `SchedulerService` angebunden ist, sind `POST /webhooks/:sourceId`-Routen fuer eingehende Webhook-Ereignisse verfuegbar.

## Server-Schnittstelle

```typescript
interface GatewayServerOptions {
  /** Port zum Lauschen. 0 fuer einen zufaellig verfuegbaren Port verwenden. */
  readonly port?: number;
  /** Authentifizierungs-Token fuer Verbindungen. */
  readonly authToken?: string;
  /** Optionaler Scheduler-Dienst fuer Webhook-Endpunkte. */
  readonly schedulerService?: SchedulerService;
}

interface GatewayAddr {
  readonly port: number;
  readonly hostname: string;
}

interface GatewayServer {
  /** Server starten. Gibt die gebundene Adresse zurueck. */
  start(): Promise<GatewayAddr>;
  /** Server ordnungsgemaess stoppen. */
  stop(): Promise<void>;
}
```

## Authentifizierung

Gateway-Verbindungen werden mit einem Token authentifiziert. Das Token wird waehrend der Einrichtung (`triggerfish dive`) generiert und lokal gespeichert.

::: warning SICHERHEIT Das Gateway bindet sich standardmaessig an `127.0.0.1` und ist nicht dem Netzwerk ausgesetzt. Fernzugriff erfordert explizite Tunnel-Konfiguration. Setzen Sie den Gateway-WebSocket niemals ohne Authentifizierung dem oeffentlichen Internet aus. :::

## Session-Verwaltung

Das Gateway verwaltet den vollstaendigen Lebenszyklus von Sessions. Sessions sind die fundamentale Einheit des Gespraechszustands, jede mit unabhaengigem Taint-Tracking.

### Session-Typen

| Typ          | Schluessel-Muster            | Beschreibung                                                                       |
| ------------ | ---------------------------- | ---------------------------------------------------------------------------------- |
| Haupt        | `main`                       | Primaeres direktes Gespraech mit dem Eigentuemer. Bleibt ueber Neustarts bestehen. |
| Kanal        | `channel:<type>:<id>`        | Einer pro verbundenem Kanal. Isolierter Taint pro Kanal.                           |
| Hintergrund  | `bg:<task_id>`               | Erstellt fuer Cron-Jobs und Webhook-ausgeloeste Aufgaben. Startet mit `PUBLIC`-Taint. |
| Agent        | `agent:<agent_id>`           | Pro-Agent-Sessions fuer Multi-Agent-Routing.                                       |
| Gruppe       | `group:<channel>:<group_id>` | Gruppenchat-Sessions.                                                              |

### Session-Tools

Der Agent interagiert mit Sessions ueber diese Tools, alle geroutet durch das Gateway:

| Tool               | Beschreibung                                    | Taint-Auswirkungen                              |
| ------------------ | ----------------------------------------------- | ------------------------------------------------ |
| `sessions_list`    | Aktive Sessions mit optionalen Filtern auflisten | Keine Taint-Aenderung                            |
| `sessions_history` | Transkript fuer eine Session abrufen            | Taint erbt von referenzierter Session             |
| `sessions_send`    | Nachricht an eine andere Session senden         | Unterliegt Write-Down-Pruefung                    |
| `sessions_spawn`   | Hintergrund-Aufgaben-Session erstellen          | Neue Session startet mit `PUBLIC`-Taint           |
| `session_status`   | Aktuellen Session-Zustand, Modell, Kosten pruefen | Keine Taint-Aenderung                          |

::: info Inter-Session-Kommunikation ueber `sessions_send` unterliegt denselben Write-Down-Regeln wie jede andere Ausgabe. Eine `CONFIDENTIAL`-Session kann keine Daten an eine Session senden, die mit einem `PUBLIC`-Kanal verbunden ist. :::

## Kanal-Routing

Das Gateway routet Nachrichten zwischen Kanaelen und Sessions durch den Kanal-Router. Der Router handhabt:

- **Klassifizierungs-Gate**: Jede ausgehende Nachricht durchlaeuft `PRE_OUTPUT` vor der Zustellung
- **Wiederholung mit Backoff**: Fehlgeschlagene Zustellungen werden mit exponentiellem Backoff ueber `sendWithRetry()` wiederholt
- **Nachrichtenaufteilung**: Grosse Nachrichten werden in plattformgerechte Teile aufgeteilt (z.B. Telegrams 4096-Zeichen-Limit)
- **Streaming**: Antworten werden an Kanaele gestreamt, die dies unterstuetzen
- **Verbindungsverwaltung**: `connectAll()` und `disconnectAll()` fuer Lebenszyklus-Management

## Benachrichtigungsdienst

Das Gateway integriert einen erstklassigen Benachrichtigungsdienst, der Ad-hoc-"Eigentuemer benachrichtigen"-Muster in der gesamten Plattform ersetzt. Alle Benachrichtigungen fliessen durch einen einzigen `NotificationService`.

```typescript
interface NotificationService {
  notify(recipient: UserId, notification: Notification): Promise<void>;
  getPreferences(userId: UserId): Promise<NotificationPreference>;
  setPreferences(userId: UserId, prefs: NotificationPreference): Promise<void>;
  getPending(userId: UserId): Promise<Notification[]>;
}
```

### Prioritaetsrouting

| Prioritaet | Verhalten                                                                      |
| ---------- | ------------------------------------------------------------------------------ |
| `CRITICAL` | Umgeht Ruhezeiten, sofortige Zustellung an ALLE verbundenen Kanaele            |
| `HIGH`     | Sofortige Zustellung an bevorzugten Kanal, Warteschlange wenn offline          |
| `NORMAL`   | Zustellung an aktive Session oder Warteschlange bis zum naechsten Session-Start |
| `LOW`      | Warteschlange, Zustellung in Stapeln waehrend aktiver Sessions                 |

### Benachrichtigungsquellen

| Quelle                           | Kategorie    | Standardprioritaet |
| -------------------------------- | ------------ | ------------------ |
| Policy-Verletzungen              | `security`   | `CRITICAL`         |
| Bedrohungsintelligenz-Warnungen  | `security`   | `CRITICAL`         |
| Skill-Genehmigungsanfragen       | `approval`   | `HIGH`             |
| Cron-Job-Fehler                  | `system`     | `HIGH`             |
| System-Gesundheitswarnungen      | `system`     | `HIGH`             |
| Webhook-Ereignis-Trigger         | `info`       | `NORMAL`           |
| Verfuegbare The-Reef-Updates     | `info`       | `LOW`              |

Benachrichtigungen werden ueber `StorageProvider` (Namensraum: `notifications:`) persistiert und ueberleben Neustarts. Nicht zugestellte Benachrichtigungen werden beim naechsten Gateway-Start oder Session-Verbindung erneut versucht.

### Zustellungspraeferenzen

Benutzer konfigurieren Benachrichtigungspraeferenzen pro Kanal:

```yaml
notifications:
  preferred_channel: telegram
  quiet_hours:
    start: "22:00"
    end: "07:00"
    timezone: "America/Chicago"
  overrides:
    security: all_channels
    approval: preferred_channel
    info: active_session
```

## Scheduler-Integration

Das Gateway beherbergt den Scheduler-Dienst, der Folgendes verwaltet:

- **Cron-Tick-Schleife**: Periodische Auswertung geplanter Aufgaben
- **Trigger-Aufwachvorgaenge**: Agenten-Aufwachvorgaenge definiert in `TRIGGER.md`
- **Webhook-HTTP-Endpunkte**: `POST /webhooks/:sourceId` fuer eingehende Ereignisse
- **Orchestrator-Isolation**: Jede geplante Aufgabe laeuft in ihrem eigenen `OrchestratorFactory` mit isoliertem Session-Zustand

::: tip Von Cron und Webhooks ausgeloeste Aufgaben starten Hintergrund-Sessions mit frischem `PUBLIC`-Taint. Sie erben nicht den Taint einer bestehenden Session, wodurch sichergestellt wird, dass autonome Aufgaben mit einem sauberen Klassifizierungszustand starten. :::

## Gesundheit und Diagnose

Der Befehl `triggerfish patrol` verbindet sich mit dem Gateway und fuehrt diagnostische Gesundheitspruefungen durch, die Folgendes verifizieren:

- Gateway laeuft und reagiert
- Alle konfigurierten Kanaele sind verbunden
- Speicherung ist erreichbar
- Geplante Aufgaben werden rechtzeitig ausgefuehrt
- Keine unzugestellten kritischen Benachrichtigungen stecken in der Warteschlange
