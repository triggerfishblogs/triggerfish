# Signal

Verbinden Sie Ihren Triggerfish-Agenten mit Signal, damit andere Ihnen Nachrichten ueber die Signal-App senden koennen. Der Adapter kommuniziert mit einem [signal-cli](https://github.com/AsamK/signal-cli)-Daemon ueber JSON-RPC unter Verwendung Ihrer verknuepften Signal-Telefonnummer.

## Wie Signal sich unterscheidet

Der Signal-Adapter **ist** Ihre Telefonnummer. Im Gegensatz zu Telegram oder Slack, wo ein separates Bot-Konto existiert, kommen Signal-Nachrichten von anderen Personen an Ihre Nummer. Das bedeutet:

- Alle eingehenden Nachrichten haben `isOwner: false` -- sie stammen immer von jemand anderem
- Der Adapter antwortet als Ihre Telefonnummer
- Es gibt keine Eigentuemer-Pruefung pro Nachricht wie bei anderen Kanaelen

Dies macht Signal ideal fuer den Empfang von Nachrichten von Kontakten, die Ihre Nummer anschreiben, wobei der Agent in Ihrem Namen antwortet.

## Standard-Klassifizierung

Signal hat standardmaessig die Klassifizierung `PUBLIC`. Da alle eingehenden Nachrichten von externen Kontakten stammen, ist `PUBLIC` der sichere Standard.

## Einrichtung

### Schritt 1: signal-cli installieren

signal-cli ist ein Drittanbieter-Befehlszeilenclient fuer Signal. Triggerfish kommuniziert mit ihm ueber einen TCP- oder Unix-Socket.

**Linux (nativer Build -- kein Java benoetigt):**

Laden Sie den neuesten nativen Build von der [signal-cli Releases](https://github.com/AsamK/signal-cli/releases)-Seite herunter, oder lassen Sie Triggerfish ihn waehrend der Einrichtung fuer Sie herunterladen.

**macOS / andere Plattformen (JVM-Build):**

Erfordert Java 21+. Triggerfish kann automatisch eine portable JRE herunterladen, wenn Java nicht installiert ist.

Sie koennen auch die gefuehrte Einrichtung ausfuehren:

```bash
triggerfish config add-channel signal
```

Dies prueft auf signal-cli, bietet an, es herunterzuladen, falls es fehlt, und fuehrt Sie durch die Verknuepfung.

### Schritt 2: Ihr Geraet verknuepfen

signal-cli muss mit Ihrem bestehenden Signal-Konto verknuepft werden (wie das Verknuepfen einer Desktop-App):

```bash
signal-cli link -n "Triggerfish"
```

Dies gibt eine `tsdevice:`-URI aus. Scannen Sie den QR-Code mit Ihrer Signal-Mobile-App (Einstellungen > Verknuepfte Geraete > Neues Geraet verknuepfen).

### Schritt 3: Daemon starten

signal-cli laeuft als Hintergrund-Daemon, mit dem sich Triggerfish verbindet:

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

Ersetzen Sie `+14155552671` durch Ihre Telefonnummer im E.164-Format.

### Schritt 4: Triggerfish konfigurieren

Fuegen Sie Signal zu Ihrer `triggerfish.yaml` hinzu:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| Option             | Typ     | Erforderlich | Beschreibung                                                                             |
| ------------------ | ------- | ------------ | ---------------------------------------------------------------------------------------- |
| `endpoint`         | string  | Ja           | signal-cli-Daemon-Adresse (`tcp://host:port` oder `unix:///pfad/zum/socket`)             |
| `account`          | string  | Ja           | Ihre Signal-Telefonnummer (E.164-Format)                                                 |
| `classification`   | string  | Nein         | Klassifizierungsobergrenze (Standard: `PUBLIC`)                                          |
| `defaultGroupMode` | string  | Nein         | Gruppennachrichten-Behandlung: `always`, `mentioned-only`, `owner-only` (Standard: `always`) |
| `groups`           | object  | Nein         | Pro-Gruppe-Konfigurationsueberschreibungen                                               |
| `ownerPhone`       | string  | Nein         | Fuer zukuenftige Verwendung reserviert                                                   |
| `pairing`          | boolean | Nein         | Pairing-Modus waehrend der Einrichtung aktivieren                                        |

### Schritt 5: Triggerfish starten

```bash
triggerfish stop && triggerfish start
```

Senden Sie eine Nachricht an Ihre Telefonnummer von einem anderen Signal-Benutzer, um die Verbindung zu bestaetigen.

## Gruppennachrichten

Signal unterstuetzt Gruppenchats. Sie koennen steuern, wie der Agent auf Gruppennachrichten antwortet:

| Modus            | Verhalten                                                    |
| ---------------- | ------------------------------------------------------------ |
| `always`         | Auf alle Gruppennachrichten antworten (Standard)             |
| `mentioned-only` | Nur antworten, wenn per Telefonnummer oder @-Erwaehnung erwaehnt |
| `owner-only`     | Nie in Gruppen antworten                                     |

Global oder pro Gruppe konfigurieren:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    defaultGroupMode: mentioned-only
    groups:
      "ihre-gruppen-id":
        mode: always
        classification: INTERNAL
```

Gruppen-IDs sind Base64-kodierte Bezeichner. Verwenden Sie `triggerfish signal list-groups` oder konsultieren Sie die signal-cli-Dokumentation, um sie zu finden.

## Nachrichtenaufteilung

Signal hat ein Nachrichtenlimit von 4.000 Zeichen. Antworten, die laenger sind, werden automatisch in mehrere Nachrichten aufgeteilt, wobei an Zeilenumbruechen oder Leerzeichen fuer bessere Lesbarkeit geteilt wird.

## Tipp-Indikatoren

Der Adapter sendet Tipp-Indikatoren, waehrend der Agent eine Anfrage verarbeitet. Der Tipp-Status wird geloescht, wenn die Antwort gesendet wurde.

## Erweiterte Tools

Der Signal-Adapter stellt zusaetzliche Tools bereit:

- `sendTyping` / `stopTyping` -- Manuelle Tipp-Indikator-Steuerung
- `listGroups` -- Alle Signal-Gruppen auflisten, in denen das Konto Mitglied ist
- `listContacts` -- Alle Signal-Kontakte auflisten

## Klassifizierung aendern

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

Gueltige Stufen: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Starten Sie den Daemon nach der Aenderung neu: `triggerfish stop && triggerfish start`

## Zuverlaessigkeits-Features

Der Signal-Adapter enthaelt mehrere Zuverlaessigkeitsmechanismen:

### Auto-Reconnection

Wenn die Verbindung zu signal-cli abbricht (Netzwerkunterbrechung, Daemon-Neustart), verbindet sich der Adapter automatisch mit exponentiellem Backoff wieder. Kein manuelles Eingreifen erforderlich.

### Gesundheitspruefung

Beim Start prueft Triggerfish, ob ein bestehender signal-cli-Daemon gesund ist, mittels einer JSON-RPC-Ping-Probe. Wenn der Daemon nicht reagiert, wird er automatisch beendet und neu gestartet.

### Versions-Tracking

Triggerfish verfolgt die bekannt gute signal-cli-Version (derzeit 0.13.0) und warnt beim Start, wenn Ihre installierte Version aelter ist. Die signal-cli-Version wird bei jeder erfolgreichen Verbindung protokolliert.

### Unix-Socket-Unterstuetzung

Zusaetzlich zu TCP-Endpunkten unterstuetzt der Adapter Unix-Domain-Sockets:

```yaml
channels:
  signal:
    endpoint: "unix:///run/signal-cli/socket"
    account: "+14155552671"
```

## Fehlerbehebung

**signal-cli-Daemon nicht erreichbar:**

- Ueberpruefen Sie, ob der Daemon laeuft: Pruefen Sie den Prozess oder versuchen Sie `nc -z 127.0.0.1 7583`
- signal-cli bindet nur IPv4 — verwenden Sie `127.0.0.1`, nicht `localhost`
- TCP-Standardport ist 7583
- Triggerfish startet den Daemon automatisch neu, wenn ein ungesunder Prozess erkannt wird

**Nachrichten kommen nicht an:**

- Bestaetigen Sie, dass das Geraet verknuepft ist: Pruefen Sie die Signal-Mobile-App unter Verknuepfte Geraete
- signal-cli muss nach der Verknuepfung mindestens eine Synchronisation empfangen haben
- Pruefen Sie die Logs auf Verbindungsfehler: `triggerfish logs --tail`

**Java-Fehler (nur JVM-Build):**

- signal-cli JVM-Build erfordert Java 21+
- Fuehren Sie `java -version` aus, um zu pruefen
- Triggerfish kann bei Bedarf waehrend der Einrichtung eine portable JRE herunterladen

**Reconnection-Schleifen:**

- Wenn Sie wiederholte Reconnection-Versuche in den Logs sehen, stuerzt moeglicherweise der signal-cli-Daemon ab
- Pruefen Sie die signal-cli-eigene stderr-Ausgabe auf Fehler
- Versuchen Sie einen Neustart mit einem frischen Daemon: Stoppen Sie Triggerfish, beenden Sie signal-cli, starten Sie beide neu
