# E-Mail

Verbinden Sie Ihren Triggerfish-Agenten mit E-Mail, damit er Nachrichten ueber IMAP empfangen und Antworten ueber einen SMTP-Relay-Dienst senden kann. Der Adapter unterstuetzt Dienste wie SendGrid, Mailgun und Amazon SES fuer ausgehende E-Mails und fragt jeden IMAP-Server nach eingehenden Nachrichten ab.

## Standard-Klassifizierung

E-Mail hat standardmaessig die Klassifizierung `CONFIDENTIAL`. E-Mails enthalten oft sensible Inhalte (Vertraege, Kontobenachrichtigungen, persoenliche Korrespondenz), daher ist `CONFIDENTIAL` der sichere Standard.

## Einrichtung

### Schritt 1: SMTP-Relay waehlen

Triggerfish sendet ausgehende E-Mails ueber eine HTTP-basierte SMTP-Relay-API. Unterstuetzte Dienste sind:

| Dienst     | API-Endpunkt                                                     |
| ---------- | ---------------------------------------------------------------- |
| SendGrid   | `https://api.sendgrid.com/v3/mail/send`                          |
| Mailgun    | `https://api.mailgun.net/v3/IHRE_DOMAIN/messages`                |
| Amazon SES | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails` |

Registrieren Sie sich bei einem dieser Dienste und beschaffen Sie einen API-Schluessel.

### Schritt 2: IMAP fuer den Empfang konfigurieren

Sie benoetigen IMAP-Anmeldedaten fuer den E-Mail-Empfang. Die meisten E-Mail-Anbieter unterstuetzen IMAP:

| Anbieter | IMAP-Host               | Port |
| -------- | ----------------------- | ---- |
| Gmail    | `imap.gmail.com`        | 993  |
| Outlook  | `outlook.office365.com` | 993  |
| Fastmail | `imap.fastmail.com`     | 993  |
| Eigener  | Ihr Mailserver          | 993  |

::: info Gmail-App-Passwoerter Wenn Sie Gmail mit 2-Faktor-Authentifizierung verwenden, muessen Sie ein [App-Passwort](https://myaccount.google.com/apppasswords) fuer den IMAP-Zugriff generieren. Ihr regulaeres Gmail-Passwort wird nicht funktionieren. :::

### Schritt 3: Triggerfish konfigurieren

Fuegen Sie den E-Mail-Kanal zu Ihrer `triggerfish.yaml` hinzu:

```yaml
channels:
  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "sie@gmail.com"
    fromAddress: "triggerfish@ihredomain.de"
    ownerEmail: "sie@gmail.com"
```

Secrets (SMTP-API-Schluessel, IMAP-Passwort) werden waehrend `triggerfish config add-channel email` eingegeben und im Betriebssystem-Schluesselbund gespeichert.

| Option           | Typ    | Erforderlich | Beschreibung                                                        |
| ---------------- | ------ | ------------ | ------------------------------------------------------------------- |
| `smtpApiUrl`     | string | Ja           | SMTP-Relay-API-Endpunkt-URL                                        |
| `imapHost`       | string | Ja           | IMAP-Server-Hostname                                                |
| `imapPort`       | number | Nein         | IMAP-Server-Port (Standard: `993`)                                  |
| `imapUser`       | string | Ja           | IMAP-Benutzername (normalerweise Ihre E-Mail-Adresse)               |
| `fromAddress`    | string | Ja           | Absenderadresse fuer ausgehende E-Mails                             |
| `pollInterval`   | number | Nein         | Wie oft nach neuen E-Mails gesucht wird, in ms (Standard: `30000`) |
| `classification` | string | Nein         | Klassifizierungsstufe (Standard: `CONFIDENTIAL`)                    |
| `ownerEmail`     | string | Empfohlen    | Ihre E-Mail-Adresse zur Eigentuemer-Verifizierung                   |

::: warning Anmeldedaten Der SMTP-API-Schluessel und das IMAP-Passwort werden im Betriebssystem-Schluesselbund gespeichert (Linux: GNOME Keyring, macOS: Keychain Access). Sie erscheinen niemals in `triggerfish.yaml`. :::

### Schritt 4: Triggerfish starten

```bash
triggerfish stop && triggerfish start
```

Senden Sie eine E-Mail an die konfigurierte Adresse, um die Verbindung zu bestaetigen.

## Eigentuemer-Identitaet

Triggerfish bestimmt den Eigentuemerstatus durch Vergleich der E-Mail-Adresse des Absenders mit der konfigurierten `ownerEmail`:

- **Uebereinstimmung** -- Die Nachricht ist ein Eigentuemer-Befehl
- **Keine Uebereinstimmung** -- Die Nachricht ist externe Eingabe mit `PUBLIC`-Taint

Wenn keine `ownerEmail` konfiguriert ist, werden alle Nachrichten als vom Eigentuemer stammend behandelt.

## Domain-basierte Klassifizierung

Fuer granularere Kontrolle unterstuetzt E-Mail domain-basierte Empfaengerklassifizierung. Dies ist besonders in Unternehmensumgebungen nuetzlich:

- E-Mails von `@ihrefirma.de` koennen als `INTERNAL` klassifiziert werden
- E-Mails von unbekannten Domains werden standardmaessig als `EXTERNAL` behandelt
- Administratoren koennen eine Liste interner Domains konfigurieren

```yaml
channels:
  email:
    # ... weitere Konfiguration
    internalDomains:
      - "ihrefirma.de"
      - "tochtergesellschaft.de"
```

Das bedeutet, die Policy Engine wendet unterschiedliche Regeln basierend auf dem Ursprung einer E-Mail an:

| Absender-Domain                  | Klassifizierung |
| -------------------------------- | :-------------: |
| Konfigurierte interne Domain     |   `INTERNAL`    |
| Unbekannte Domain                |   `EXTERNAL`    |

## Funktionsweise

### Eingehende Nachrichten

Der Adapter fragt den IMAP-Server im konfigurierten Intervall (Standard: alle 30 Sekunden) nach neuen, ungelesenen Nachrichten ab. Wenn eine neue E-Mail eintrifft:

1. Die Absenderadresse wird extrahiert
2. Der Eigentuemerstatus wird gegen `ownerEmail` geprueft
3. Der E-Mail-Body wird an den Nachrichtenhandler weitergeleitet
4. Jeder E-Mail-Thread wird einer Session-ID basierend auf der Absenderadresse zugeordnet (`email-absender@beispiel.de`)

### Ausgehende Nachrichten

Wenn der Agent antwortet, sendet der Adapter die Antwort ueber die konfigurierte SMTP-Relay-HTTP-API. Die Antwort enthaelt:

- **Von** -- Die konfigurierte `fromAddress`
- **An** -- Die E-Mail-Adresse des urspruenglichen Absenders
- **Betreff** -- "Triggerfish" (Standard)
- **Text** -- Die Antwort des Agenten als Klartext

## Abfrageintervall

Das Standard-Abfrageintervall betraegt 30 Sekunden. Sie koennen dies basierend auf Ihren Beduerfnissen anpassen:

```yaml
channels:
  email:
    # ... weitere Konfiguration
    pollInterval: 10000 # Alle 10 Sekunden pruefen
```

::: tip Reaktionsfaehigkeit und Ressourcen ausbalancieren Ein kuerzeres Abfrageintervall bedeutet schnellere Reaktion auf eingehende E-Mails, aber haeufigere IMAP-Verbindungen. Fuer die meisten persoenlichen Anwendungsfaelle ist 30 Sekunden eine gute Balance. :::

## Klassifizierung aendern

```yaml
channels:
  email:
    # ... weitere Konfiguration
    classification: CONFIDENTIAL
```

Gueltige Stufen: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
