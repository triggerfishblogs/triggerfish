# Telegram

Verbinden Sie Ihren Triggerfish-Agenten mit Telegram, damit Sie von jedem Geraet aus, auf dem Sie Telegram nutzen, mit ihm interagieren koennen. Der Adapter verwendet das [grammY](https://grammy.dev/)-Framework zur Kommunikation mit der Telegram Bot API.

## Einrichtung

### Schritt 1: Bot erstellen

1. Oeffnen Sie Telegram und suchen Sie nach [@BotFather](https://t.me/BotFather)
2. Senden Sie `/newbot`
3. Waehlen Sie einen Anzeigenamen fuer Ihren Bot (z.B. "Mein Triggerfish")
4. Waehlen Sie einen Benutzernamen fuer Ihren Bot (muss mit `bot` enden, z.B. `mein_triggerfish_bot`)
5. BotFather antwortet mit Ihrem **Bot-Token** -- kopieren Sie es

::: warning Token geheim halten Ihr Bot-Token gewaehrt volle Kontrolle ueber Ihren Bot. Committen Sie es niemals in die Versionskontrolle und teilen Sie es nicht oeffentlich. Triggerfish speichert es in Ihrem Betriebssystem-Schluesselbund. :::

### Schritt 2: Ihre Telegram-Benutzer-ID ermitteln

Triggerfish benoetigt Ihre numerische Benutzer-ID, um zu verifizieren, dass Nachrichten von Ihnen stammen. Telegram-Benutzernamen koennen geaendert werden und sind nicht zuverlaessig fuer die Identitaet -- die numerische ID ist permanent und wird von Telegrams Servern zugewiesen, sodass sie nicht gefaelscht werden kann.

1. Suchen Sie nach [@getmyid_bot](https://t.me/getmyid_bot) auf Telegram
2. Senden Sie ihm eine beliebige Nachricht
3. Er antwortet mit Ihrer Benutzer-ID (eine Zahl wie `8019881968`)

### Schritt 3: Kanal hinzufuegen

Fuehren Sie die interaktive Einrichtung aus:

```bash
triggerfish config add-channel telegram
```

Dies fragt nach Ihrem Bot-Token, Ihrer Benutzer-ID und der Klassifizierungsstufe, schreibt dann die Konfiguration in `triggerfish.yaml` und bietet an, den Daemon neu zu starten.

Sie koennen ihn auch manuell hinzufuegen:

```yaml
channels:
  telegram:
    # botToken im Betriebssystem-Schluesselbund gespeichert
    ownerId: 8019881968
    classification: INTERNAL
```

| Option           | Typ    | Erforderlich | Beschreibung                                     |
| ---------------- | ------ | ------------ | ------------------------------------------------ |
| `botToken`       | string | Ja           | Bot-API-Token von @BotFather                     |
| `ownerId`        | number | Ja           | Ihre numerische Telegram-Benutzer-ID             |
| `classification` | string | Nein         | Klassifizierungsobergrenze (Standard: `INTERNAL`) |

### Schritt 4: Chatten beginnen

Nach dem Neustart des Daemons oeffnen Sie Ihren Bot in Telegram und senden `/start`. Der Bot begruesst Sie, um zu bestaetigen, dass die Verbindung aktiv ist. Sie koennen dann direkt mit Ihrem Agenten chatten.

## Klassifizierungsverhalten

Die `classification`-Einstellung ist eine **Obergrenze** -- sie steuert die maximale Sensibilitaet von Daten, die durch diesen Kanal fuer **Eigentuemer**-Gespraeche fliessen koennen. Sie gilt nicht einheitlich fuer alle Benutzer.

**Wie es pro Nachricht funktioniert:**

- **Sie schreiben dem Bot** (Ihre Benutzer-ID stimmt mit `ownerId` ueberein): Die Session verwendet die Kanalobergrenze. Mit dem Standard `INTERNAL` kann Ihr Agent interne Daten mit Ihnen teilen.
- **Jemand anderes schreibt dem Bot**: Deren Session wird automatisch mit `PUBLIC` getaintet, unabhaengig von der Kanal-Klassifizierung. Die No-Write-Down-Regel verhindert, dass interne Daten deren Session erreichen.

Das bedeutet, dass ein einzelner Telegram-Bot sowohl Eigentuemer- als auch Nicht-Eigentuemer-Gespraeche sicher handhabt. Die Identitaetspruefung erfolgt im Code, bevor das LLM die Nachricht sieht -- das LLM kann sie nicht beeinflussen.

| Kanal-Klassifizierung  | Eigentuemer-Nachrichten | Nicht-Eigentuemer-Nachrichten |
| ---------------------- | :---------------------: | :---------------------------: |
| `PUBLIC`               |        PUBLIC           |            PUBLIC             |
| `INTERNAL` (Standard)  |    Bis zu INTERNAL      |            PUBLIC             |
| `CONFIDENTIAL`         | Bis zu CONFIDENTIAL     |            PUBLIC             |
| `RESTRICTED`           |  Bis zu RESTRICTED      |            PUBLIC             |

Siehe [Klassifizierungssystem](/de-DE/architecture/classification) fuer das vollstaendige Modell und [Sessions & Taint](/de-DE/architecture/taint-and-sessions) fuer die Funktionsweise der Taint-Eskalation.

## Eigentuemer-Identitaet

Triggerfish bestimmt den Eigentuemerstatus durch Vergleich der numerischen Telegram-Benutzer-ID des Absenders mit der konfigurierten `ownerId`. Diese Pruefung erfolgt im Code **bevor** das LLM die Nachricht sieht:

- **Uebereinstimmung** -- Die Nachricht wird als Eigentuemer markiert und kann auf Daten bis zur Klassifizierungsobergrenze des Kanals zugreifen
- **Keine Uebereinstimmung** -- Die Nachricht wird mit `PUBLIC`-Taint markiert, und die No-Write-Down-Regel verhindert, dass klassifizierte Daten zu dieser Session fliessen

::: danger Eigentuemer-ID immer setzen Ohne `ownerId` behandelt Triggerfish **alle** Absender als Eigentuemer. Jeder, der Ihren Bot findet, kann auf Ihre Daten bis zur Klassifizierungsstufe des Kanals zugreifen. Dieses Feld ist bei der Einrichtung aus diesem Grund erforderlich. :::

## Nachrichtenaufteilung

Telegram hat ein Nachrichtenlimit von 4.096 Zeichen. Wenn Ihr Agent eine laengere Antwort generiert, teilt Triggerfish sie automatisch in mehrere Nachrichten auf. Der Aufteiler teilt an Zeilenumbruechen oder Leerzeichen fuer bessere Lesbarkeit -- er vermeidet es, Woerter oder Saetze zu zerschneiden.

## Unterstuetzte Nachrichtentypen

Der Telegram-Adapter unterstuetzt derzeit:

- **Textnachrichten** -- Vollstaendige Sende- und Empfangsunterstuetzung
- **Lange Antworten** -- Automatisch aufgeteilt fuer Telegrams Limits

## Tipp-Indikatoren

Wenn Ihr Agent eine Anfrage verarbeitet, zeigt der Bot "tippt..." im Telegram-Chat. Der Indikator laeuft, waehrend das LLM eine Antwort generiert, und wird geloescht, wenn die Antwort gesendet wurde.

## Klassifizierung aendern

Um die Klassifizierungsobergrenze zu erhoehen oder zu senken:

```bash
triggerfish config add-channel telegram
# Bei Aufforderung zum Ueberschreiben der bestehenden Konfiguration waehlen
```

Oder bearbeiten Sie `triggerfish.yaml` direkt:

```yaml
channels:
  telegram:
    # botToken im Betriebssystem-Schluesselbund gespeichert
    ownerId: 8019881968
    classification: CONFIDENTIAL
```

Gueltige Stufen: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Starten Sie den Daemon nach der Aenderung neu: `triggerfish stop && triggerfish start`
