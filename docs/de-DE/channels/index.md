# Mehrkanal-Uebersicht

Triggerfish verbindet sich mit Ihren bestehenden Messaging-Plattformen. Sie sprechen mit Ihrem Agenten dort, wo Sie bereits kommunizieren -- Terminal, Telegram, Slack, Discord, WhatsApp, ein Web-Widget oder E-Mail. Jeder Kanal hat seine eigene Klassifizierungsstufe, Eigentuemer-Identitaetspruefungen und Policy-Durchsetzung.

## Wie Kanaele funktionieren

Jeder Kanaladapter implementiert dieselbe Schnittstelle: `connect`, `disconnect`, `send`, `onMessage` und `status`. Der **Kanal-Router** sitzt ueber allen Adaptern und handhabt Nachrichtenweiterleitung, Klassifizierungspruefungen und Wiederholungslogik.

<img src="/diagrams/channel-router.svg" alt="Kanal-Router: Alle Kanaladapter fliessen durch ein zentrales Klassifizierungs-Gate zum Gateway Server" style="max-width: 100%;" />

Wenn eine Nachricht auf einem beliebigen Kanal eintrifft, fuehrt der Router folgendes aus:

1. Identifizierung des Absenders (Eigentuemer oder extern) mittels **Code-Level-Identitaetspruefungen** -- nicht LLM-Interpretation
2. Markierung der Nachricht mit der Klassifizierungsstufe des Kanals
3. Weiterleitung an die Policy Engine zur Durchsetzung
4. Zurueckleitung der Agenten-Antwort ueber denselben Kanal

## Kanal-Klassifizierung

Jeder Kanal hat eine Standard-Klassifizierungsstufe, die bestimmt, welche Daten durch ihn fliessen koennen. Die Policy Engine setzt die **No-Write-Down-Regel** durch: Daten einer bestimmten Klassifizierungsstufe koennen niemals zu einem Kanal mit niedrigerer Klassifizierung fliessen.

| Kanal                                      | Standard-Klassifizierung | Eigentuemer-Erkennung                     |
| ------------------------------------------ | :----------------------: | ----------------------------------------- |
| [CLI](/de-DE/channels/cli)                 |        `INTERNAL`        | Immer Eigentuemer (Terminal-Benutzer)      |
| [Telegram](/de-DE/channels/telegram)       |        `INTERNAL`        | Telegram-Benutzer-ID-Abgleich             |
| [Signal](/de-DE/channels/signal)           |         `PUBLIC`         | Nie Eigentuemer (Adapter IST Ihr Telefon) |
| [Slack](/de-DE/channels/slack)             |         `PUBLIC`         | Slack-Benutzer-ID ueber OAuth             |
| [Discord](/de-DE/channels/discord)         |         `PUBLIC`         | Discord-Benutzer-ID-Abgleich              |
| [WhatsApp](/de-DE/channels/whatsapp)       |         `PUBLIC`         | Telefonnummer-Abgleich                    |
| [WebChat](/de-DE/channels/webchat)         |         `PUBLIC`         | Nie Eigentuemer (Besucher)                |
| [E-Mail](/de-DE/channels/email)            |      `CONFIDENTIAL`      | E-Mail-Adressen-Abgleich                  |

::: tip Vollstaendig konfigurierbar Alle Klassifizierungen sind in Ihrer `triggerfish.yaml` konfigurierbar. Sie koennen jeden Kanal basierend auf Ihren Sicherheitsanforderungen auf jede beliebige Klassifizierungsstufe setzen.

```yaml
channels:
  telegram:
    classification: CONFIDENTIAL
  slack:
    classification: INTERNAL
```

:::

## Effektive Klassifizierung

Die effektive Klassifizierung fuer jede Nachricht ist das **Minimum** aus der Kanal-Klassifizierung und der Empfaenger-Klassifizierung:

| Kanal-Stufe   | Empfaenger-Stufe | Effektive Stufe |
| ------------- | ---------------- | --------------- |
| INTERNAL      | INTERNAL         | INTERNAL        |
| INTERNAL      | EXTERNAL         | PUBLIC          |
| CONFIDENTIAL  | INTERNAL         | INTERNAL        |
| CONFIDENTIAL  | EXTERNAL         | PUBLIC          |

Das bedeutet, dass selbst wenn ein Kanal als `CONFIDENTIAL` klassifiziert ist, Nachrichten an externe Empfaenger auf diesem Kanal als `PUBLIC` behandelt werden.

## Kanalzustaende

Kanaele durchlaufen definierte Zustaende:

- **UNTRUSTED** -- Neue oder unbekannte Kanaele starten hier. Keine Daten fliessen rein oder raus. Der Kanal ist vollstaendig isoliert, bis Sie ihn klassifizieren.
- **CLASSIFIED** -- Der Kanal hat eine zugewiesene Klassifizierungsstufe und ist aktiv. Nachrichten fliessen gemaess den Policy-Regeln.
- **BLOCKED** -- Der Kanal wurde explizit deaktiviert. Keine Nachrichten werden verarbeitet.

::: warning UNTRUSTED-Kanaele Ein `UNTRUSTED`-Kanal kann keine Daten vom Agenten empfangen und keine Daten in den Kontext des Agenten senden. Dies ist eine harte Sicherheitsgrenze, kein Vorschlag. :::

## Kanal-Router

Der Kanal-Router verwaltet alle registrierten Adapter und bietet:

- **Adapter-Registrierung** -- Kanaladapter nach Kanal-ID registrieren und abmelden
- **Nachrichtenweiterleitung** -- Ausgehende Nachrichten an den richtigen Adapter routen
- **Wiederholung mit exponentiellem Backoff** -- Fehlgeschlagene Sendungen werden bis zu 3 Mal mit steigenden Verzoegerungen wiederholt (1s, 2s, 4s)
- **Massenoperationen** -- `connectAll()` und `disconnectAll()` fuer Lebenszyklus-Management

```yaml
# Router-Wiederholungsverhalten ist konfigurierbar
router:
  maxRetries: 3
  baseDelay: 1000 # Millisekunden
```

## Ripple: Tipp-Indikatoren und Praesenz

Triggerfish leitet Tipp-Indikatoren und Praesenzstatus ueber Kanaele weiter, die sie unterstuetzen. Dies wird **Ripple** genannt.

| Kanal    | Tipp-Indikatoren       | Lesebestaetigungen |
| -------- | :--------------------: | :----------------: |
| Telegram | Senden und Empfangen   |        Ja          |
| Signal   | Senden und Empfangen   |        --          |
| Slack    | Nur Senden             |        --          |
| Discord  | Nur Senden             |        --          |
| WhatsApp | Senden und Empfangen   |        Ja          |
| WebChat  | Senden und Empfangen   |        Ja          |

Agenten-Praesenzstatus: `idle`, `online`, `away`, `busy`, `processing`, `speaking`, `error`.

## Nachrichtenaufteilung

Plattformen haben Nachrichtenlaengenlimits. Triggerfish teilt lange Antworten automatisch auf, um in die Beschraenkungen jeder Plattform zu passen, wobei an Zeilenumbruechen oder Leerzeichen geteilt wird, um die Lesbarkeit zu erhalten:

| Kanal    | Max. Nachrichtenlaenge |
| -------- | :--------------------: |
| Telegram |    4.096 Zeichen       |
| Signal   |    4.000 Zeichen       |
| Discord  |    2.000 Zeichen       |
| Slack    |   40.000 Zeichen       |
| WhatsApp |    4.096 Zeichen       |
| WebChat  |     Unbegrenzt         |

## Naechste Schritte

Richten Sie die Kanaele ein, die Sie verwenden:

- [CLI](/de-DE/channels/cli) -- Immer verfuegbar, keine Einrichtung erforderlich
- [Telegram](/de-DE/channels/telegram) -- Bot ueber @BotFather erstellen
- [Signal](/de-DE/channels/signal) -- Ueber signal-cli-Daemon verknuepfen
- [Slack](/de-DE/channels/slack) -- Slack-App mit Socket Mode erstellen
- [Discord](/de-DE/channels/discord) -- Discord-Bot-Anwendung erstellen
- [WhatsApp](/de-DE/channels/whatsapp) -- Ueber WhatsApp Business Cloud API verbinden
- [WebChat](/de-DE/channels/webchat) -- Chat-Widget auf Ihrer Webseite einbetten
- [E-Mail](/de-DE/channels/email) -- Ueber IMAP und SMTP-Relay verbinden
